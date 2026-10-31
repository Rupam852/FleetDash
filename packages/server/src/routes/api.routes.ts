import { Router } from 'express';
import {
  ingestSingle,
  ingestBatch,
  getVehicleHistory,
  getSystemMetrics
} from '../controllers/telemetry.controller.js';
import { geofenceManager } from '../geospatial/geofenceManager.js';

export const apiRouter = Router();

// Ingestion endpoints
apiRouter.post('/telemetry/ingest', ingestSingle);
apiRouter.post('/telemetry/batch', ingestBatch);

// History & SLA validation endpoint (Sub-5ms query verification)
apiRouter.get('/telemetry/history/:vehicleId', getVehicleHistory);

// Geofence management
apiRouter.get('/geofences', (_req, res) => {
  res.json(geofenceManager.getZones());
});

// Telemetry throughput and system health
apiRouter.get('/metrics', getSystemMetrics);

