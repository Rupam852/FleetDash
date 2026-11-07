import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getTenantContext } from "./tenantContext.js";

export interface JwtTenantClaims {
  sub: string;
  email: string;
  tenantId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "FINANCE_OPERATOR" | "AUDITOR";
  iat: number;
  exp: number;
}

export function jwtTenantAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Missing or malformed Authorization header. Bearer token required.",
    });
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET || "ledgerguard_super_secret_jwt_key_2026_infotact";

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtTenantClaims;

    // Validate that incoming token matches requested tenant boundary
    const currentContext = getTenantContext();
    if (decoded.tenantId && decoded.tenantId.toLowerCase() !== currentContext.tenantId) {
      return res.status(403).json({
        error: "FORBIDDEN_CROSS_TENANT_ATTEMPT",
        message: `Token issued for [${decoded.tenantId}] cannot access isolated tenant scope [${currentContext.tenantId}].`,
      });
    }

    // Attach decoded user claims to context
    currentContext.userId = decoded.sub;
    currentContext.role = decoded.role;
    currentContext.organizationId = decoded.organizationId;

    next();
  } catch (err: any) {
    return res.status(401).json({
      error: "INVALID_TOKEN",
      message: "JWT signature verification failed or token expired.",
      details: err.message,
    });
  }
}
