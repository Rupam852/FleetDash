import { Request, Response } from 'express';
import { globalWorkerPool } from '../workers/workerPool.js';
import { messageBroker } from '../broker/pubsub.js';
import { geofenceManager } from '../geospatial/geofenceManager.js';
import { isMongoConnected } from '../database/mongo.js';
import {
  appendTelemetryBatchToBucket,
  TelemetryBucketModel,
  getInMemoryBuckets
} from '../database/models/TelemetryBucket.model.js';
import { socketManager } from '../websocket/socketManager.js';
import { RawTelemetryInput } from '../workers/telemetryParser.worker.js';

let totalIngestedPackets = 0;
let totalAlertsCount = 0;
let lastMeasuredIngestionRate = 0;
let lastCountSnapshot = 0;
let lastSnapshotTime = Date.now();

// Background rate calculator
setInterval(() => {
  const now = Date.now();
  const elapsedSec = (now - lastSnapshotTime) / 1000;
  if (elapsedSec > 0) {
    const delta = totalIngestedPackets - lastCountSnapshot;
    lastMeasuredIngestionRate = Math.round(delta / elapsedSec);
    lastCountSnapshot = totalIngestedPackets;
    lastSnapshotTime = now;
  }
}, 1000);

export async function ingestSingle(req: Request, res: Response): Promise<void> {
  const body = req.body as RawTelemetryInput;
  if (!body || body.lat === undefined || body.lng === undefined) {
    res.status(400).json({ error: 'Invalid telemetry payload: lat and lng required' });
    return;
  }

  const parsed = await globalWorkerPool.parseCoordinates([body]);
  const item = parsed[0];
  if (item) {
    const { alertTriggered } = geofenceManager.evaluateTelemetry(item);
    if (alertTriggered) totalAlertsCount++;

    messageBroker.publishTelemetry([item]);
    totalIngestedPackets += 1;

    // Async bucket write
    setImmediate(() => {
      appendTelemetryBatchToBucket([item]);
    });
  }

  res.status(202).json({ success: true, processed: 1 });
}

export async function ingestBatch(req: Request, res: Response): Promise<void> {
  const items = req.body as RawTelemetryInput[];
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Array of telemetry objects expected' });
    return;
  }

  // Offload to worker threads
  const parsed = await globalWorkerPool.parseCoordinates(items);

  // Evaluate geofences & breaches
  for (let i = 0; i < parsed.length; i++) {
    const { alertTriggered } = geofenceManager.evaluateTelemetry(parsed[i]!);
    if (alertTriggered) totalAlertsCount++;
  }

  // Decoupled publish to Redis Pub/Sub / in-memory broker
  messageBroker.publishTelemetry(parsed);
  totalIngestedPackets += parsed.length;

  // Asynchronous background persistence into MongoDB Bucket Pattern
  setImmediate(() => {
    appendTelemetryBatchToBucket(parsed);
  });

  res.status(202).json({
    success: true,
    count: parsed.length,
    timestamp: Date.now()
  });
}

/**
 * Validates sub-5ms query performance requirement using compound index
 */
export async function getVehicleHistory(req: Request, res: Response): Promise<void> {
  const { vehicleId } = req.params;
  const startTime = process.hrtime.bigint();

  try {
    if (isMongoConnected()) {
      const buckets = await TelemetryBucketModel.find({
        vehicleId
      })
        .sort({ bucketStartTime: -1 })
        .limit(3)
        .lean();

      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1_000_000;

      res.json({
        vehicleId,
        bucketsFound: buckets.length,
        queryExecutionTimeMs: parseFloat(latencyMs.toFixed(3)),
        passedSlaSub5ms: latencyMs < 5.0,
        buckets
      });
      return;
    }

    // In-memory bucket lookup for sub-millisecond response during offline dev
    const buckets = getInMemoryBuckets(vehicleId as string);
    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1_000_000;

    res.json({
      vehicleId,
      bucketsFound: buckets.length,
      queryExecutionTimeMs: parseFloat(latencyMs.toFixed(3)),
      passedSlaSub5ms: latencyMs < 5.0,
      buckets,
      note: 'Bucket Pattern memory cache active'
    });
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1_000_000;
    res.json({
      vehicleId,
      bucketsFound: 0,
      queryExecutionTimeMs: parseFloat(latencyMs.toFixed(3)),
      passedSlaSub5ms: latencyMs < 5.0,
      buckets: [],
      error: 'Query failed'
    });
  }
}

export function getSystemMetrics(_req: Request, res: Response): void {
  const mem = process.memoryUsage();
  res.json({
    ingestionRatePerSec: lastMeasuredIngestionRate,
    totalIngestedPackets,
    totalAlertsTriggered: totalAlertsCount,
    connectedClients: socketManager.getConnectedClientsCount(),
    memoryUsageMb: Math.round(mem.rss / 1024 / 1024),
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: Date.now()
  });
}

