import { AsyncLocalStorage } from "async_hooks";
import { Request, Response, NextFunction } from "express";

export interface TenantContext {
  tenantId: string;
  organizationId: string;
  userId?: string;
  role?: string;
  requestId: string;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext {
  const ctx = tenantLocalStorage.getStore();
  if (!ctx) {
    throw new Error("TENANT_CONTEXT_MISSING: Operation attempted outside of isolated tenant execution context.");
  }
  return ctx;
}

export function tenantContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const tenantId = (req.headers["x-tenant-id"] as string) || "default";
  const organizationId = (req.headers["x-org-id"] as string) || `org_${tenantId}`;
  const requestId = (req.headers["x-request-id"] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const context: TenantContext = {
    tenantId: tenantId.toLowerCase().trim(),
    organizationId,
    requestId,
  };

  res.setHeader("X-Request-ID", requestId);
  res.setHeader("X-Tenant-ID", context.tenantId);

  tenantLocalStorage.run(context, () => {
    next();
  });
}
