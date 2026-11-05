import express from "express";
import cors from "cors";
import helmet from "helmet";
import { tenantContextMiddleware } from "./middleware/tenantContext.js";
import { authRouter } from "./routes/auth.routes.js";
import { tenantsRouter } from "./routes/tenants.routes.js";
import { billingRouter } from "./routes/billing.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

// Set up tenant context propagation across all routes
app.use(tenantContextMiddleware);

// Route mounts
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/tenants", tenantsRouter);
app.use("/api/v1/billing", billingRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/health", healthRouter);

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", path: req.path });
});
