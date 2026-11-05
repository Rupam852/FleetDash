import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.routes.js";
import telemetryRouter from "./routes/telemetry.routes.js";
import metricsRouter from "./routes/metrics.routes.js";
import shipmentsRouter from "./routes/shipments.routes.js";
import vehiclesRouter from "./routes/vehicles.routes.js";
import driversRouter from "./routes/drivers.routes.js";
import suppliersRouter from "./routes/suppliers.routes.js";
import geofencesRouter from "./routes/geofences.routes.js";
import alertsRouter from "./routes/alerts.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use("/api/v1", healthRouter);
  app.use("/api/v1", telemetryRouter);
  app.use("/api/v1", metricsRouter);
  app.use("/api/v1", shipmentsRouter);
  app.use("/api/v1", vehiclesRouter);
  app.use("/api/v1", driversRouter);
  app.use("/api/v1", suppliersRouter);
  app.use("/api/v1", geofencesRouter);
  app.use("/api/v1", alertsRouter);

  // Fallback 404
  app.use((req, res) => {
    res.status(404).json({ error: "Route not found", path: req.path });
  });

  return app;
}
