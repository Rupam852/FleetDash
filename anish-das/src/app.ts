import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { tenantContextMiddleware } from "./middleware/tenantContext.js";
import { jwtTenantAuthMiddleware, jwtUserAuthMiddleware } from "./middleware/jwtTenantAuth.js";
import { cryptoVerifierMiddleware, CryptoVerifiedRequest } from "./middleware/cryptoVerifier.js";
import { authRouter } from "./routes/auth.routes.js";
import { tenantsRouter } from "./routes/tenants.routes.js";
import { billingRouter } from "./routes/billing.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "*",
    exposedHeaders: ["X-Request-ID", "X-Tenant-ID", "X-Crypto-Verified"],
  })
);
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as CryptoVerifiedRequest).rawBody = buf.toString("utf8");
    },
  })
);

// Set up tenant context propagation across all routes
app.use(tenantContextMiddleware);

const billingJwtGuard = (req: Request, res: Response, next: NextFunction) => {
  // Public buyer QR invoice verification endpoint remains unauthenticated
  if (req.path.startsWith("/public")) {
    return next();
  }
  return jwtTenantAuthMiddleware(req, res, next);
};

// Route mounts with JWT Tenant Auth & Zero-Knowledge RSA Signature guards
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/tenants", jwtUserAuthMiddleware, tenantsRouter);
app.use("/api/v1/billing", billingJwtGuard, cryptoVerifierMiddleware, billingRouter);
app.use("/api/v1/analytics", jwtUserAuthMiddleware, analyticsRouter);
app.use("/health", healthRouter);

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", path: req.path });
});
