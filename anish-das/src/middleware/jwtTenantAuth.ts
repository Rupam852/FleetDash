import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getTenantContext } from "./tenantContext.js";
import { getRequiredEnv } from "../config/env.js";
import { getErrorMessage } from "../utils/errors.js";

export interface JwtTenantClaims {
  sub: string;
  email: string;
  tenantId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "FINANCE_OPERATOR" | "AUDITOR";
  scope?: string;
  iat: number;
  exp: number;
}

function verifyAndDecodeJwt(req: Request, res: Response): JwtTenantClaims | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Missing or malformed Authorization header. Bearer token required.",
    });
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const jwtSecret = getRequiredEnv("JWT_SECRET");
    return jwt.verify(token, jwtSecret) as JwtTenantClaims;
  } catch (err: unknown) {
    res.status(401).json({
      error: "INVALID_TOKEN",
      message: "JWT signature verification failed or token expired.",
      details: getErrorMessage(err),
    });
    return null;
  }
}

/**
 * Verifies valid authenticated user JWT for directory / workspace-switching routes
 * without blocking cross-tenant catalog management or workspace switching.
 */
export function jwtUserAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const decoded = verifyAndDecodeJwt(req, res);
  if (!decoded) return;

  const currentContext = getTenantContext();
  currentContext.userId = decoded.sub;
  currentContext.userEmail = decoded.email;
  currentContext.role = decoded.role;
  if (decoded.organizationId) {
    currentContext.organizationId = decoded.organizationId;
  }

  next();
}

/**
 * Enforces strict tenant isolation: the JWT's tenantId claim MUST match X-Tenant-ID.
 */
export function jwtTenantAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const decoded = verifyAndDecodeJwt(req, res);
  if (!decoded) return;

  const currentContext = getTenantContext();
  const tokenTenant = (decoded.tenantId || "").toLowerCase().trim();

  // Onboarding tokens or mismatched tenant claims cannot cross tenant boundaries
  if (!tokenTenant || tokenTenant === "*" || decoded.scope === "WORKSPACE_ONBOARDING" || tokenTenant !== currentContext.tenantId) {
    return res.status(403).json({
      error: "FORBIDDEN_CROSS_TENANT_ATTEMPT",
      message: `Token issued for [${decoded.tenantId}] cannot access isolated tenant scope [${currentContext.tenantId}].`,
    });
  }

  // Attach decoded user claims to context
  currentContext.userId = decoded.sub;
  currentContext.userEmail = decoded.email;
  currentContext.role = decoded.role;
  currentContext.organizationId = decoded.organizationId;

  next();
}
