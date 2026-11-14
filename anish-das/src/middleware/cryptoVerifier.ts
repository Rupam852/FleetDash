import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getErrorMessage } from "../utils/errors.js";

export interface CryptoVerifiedRequest extends Request {
  rawBody?: string;
  verifiedPublicKeyPem?: string;
  signedPayload?: string;
}

function decodePublicKeyHeader(rawHeader: string): string {
  const trimmed = rawHeader.trim();
  if (trimmed.includes("BEGIN PUBLIC KEY")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  const decoded = Buffer.from(trimmed, "base64").toString("utf8");
  if (!decoded.includes("BEGIN PUBLIC KEY")) {
    throw new Error("Invalid X-Public-Key format: expected PEM or Base64-encoded SPKI PEM.");
  }
  return decoded;
}

export function cryptoVerifierMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow non-mutating reads, preflight requests, public verification, health checks, and auth endpoints
  if (
    req.method === "GET" ||
    req.method === "OPTIONS" ||
    req.path.includes("/health") ||
    req.path.includes("/auth") ||
    req.path.startsWith("/public") ||
    req.originalUrl.includes("/billing/public/")
  ) {
    return next();
  }

  const signatureHeader = req.headers["x-signature-sha256"] as string;
  const publicKeyHeader = req.headers["x-public-key"] as string;

  if (!signatureHeader || !publicKeyHeader) {
    return res.status(400).json({
      error: "MISSING_ZERO_KNOWLEDGE_SIGNATURE",
      message: "Enterprise financial transactions require X-Signature-SHA256 and X-Public-Key headers for asymmetric verification.",
    });
  }

  try {
    const reqWithMeta = req as CryptoVerifiedRequest;
    const publicKeyPem = decodePublicKeyHeader(publicKeyHeader);
    const rawPayload =
      typeof reqWithMeta.rawBody === "string"
        ? reqWithMeta.rawBody
        : req.body && Object.keys(req.body).length > 0
        ? JSON.stringify(req.body)
        : "";

    const verifier = crypto.createVerify("SHA256");
    verifier.update(rawPayload);
    verifier.end();

    const isVerified = verifier.verify(publicKeyPem, signatureHeader.trim(), "base64");

    if (!isVerified) {
      return res.status(401).json({
        error: "CRYPTOGRAPHIC_SIGNATURE_INVALID",
        message: "RSA-256 signature verification failed. Payload may have been tampered with in flight.",
      });
    }

    reqWithMeta.verifiedPublicKeyPem = publicKeyPem;
    reqWithMeta.signedPayload = rawPayload;
    res.setHeader("X-Crypto-Verified", "true");
    next();
  } catch (err: unknown) {
    return res.status(400).json({
      error: "CRYPTO_VERIFICATION_ERROR",
      message: "Malformed cryptographic key or signature format.",
      details: getErrorMessage(err),
    });
  }
}
