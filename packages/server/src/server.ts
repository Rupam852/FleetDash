import express from 'express';
import http from 'http';
import cors from 'cors';
import { CONFIG } from './config/env.js';
import { connectMongo } from './database/mongo.js';
import { globalWorkerPool } from './workers/workerPool.js';
import { messageBroker } from './broker/pubsub.js';
import { socketManager } from './websocket/socketManager.js';
import { apiRouter } from './routes/api.routes.js';
import { VehicleTelemetry } from '@fleetdash/shared';
import { geofenceManager } from './geospatial/geofenceManager.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'FleetDash High-Throughput Telemetry Ingestion Engine',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1', apiRouter);

// Built-in High-Throughput Simulator (Can be controlled via API or client)
let isSimulating = true;
let simulatedVehicleCount = 500; // Default 500 live vehicles (can be dynamically scaled to 5,000)

interface SimVehicle {
  numericId: number;
  vehicleId: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  fuel: number;
  dLat: number;
  dLng: number;
}

const simVehicles: SimVehicle[] = [];

function initSimulatedVehicles(count: number) {
  simVehicles.length = 0;
  // Center: Bengaluru / Electronic City Region
  const centerLat = 12.920;
  const centerLng = 77.640;

  for (let i = 1; i <= count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    const radius = 0.05 + (Math.random() * 0.12);
    simVehicles.push({
      numericId: i,
      vehicleId: `VH-${i.toString().padStart(4, '0')}`,
      lat: centerLat + Math.sin(angle) * radius,
      lng: centerLng + Math.cos(angle) * radius,
      speed: 30 + Math.random() * 60,
      heading: Math.floor(Math.random() * 360),
      fuel: 40 + Math.random() * 60,
      dLat: (Math.random() - 0.5) * 0.0008,
      dLng: (Math.random() - 0.5) * 0.0008
    });
  }
}

initSimulatedVehicles(simulatedVehicleCount);

// Simulation tick: Runs at 10Hz (every 100ms), broadcasting fresh coordinates
setInterval(() => {
  if (!isSimulating || simVehicles.length === 0) return;

  const now = Date.now();
  const batch: VehicleTelemetry[] = [];

  for (let i = 0; i < simVehicles.length; i++) {
    const v = simVehicles[i]!;
    v.lat += v.dLat;
    v.lng += v.dLng;

    // Bounce off geographic bounding box to stay around the city
    if (v.lat < 12.80 || v.lat > 13.25) v.dLat = -v.dLat;
    if (v.lng < 77.50 || v.lng > 77.75) v.dLng = -v.dLng;

    // Slight speed fluctuations
    v.speed = Math.max(15, Math.min(110, v.speed + (Math.random() - 0.5) * 4));
    v.heading = (v.heading + Math.floor((Math.random() - 0.5) * 6) + 360) % 360;

    const item: VehicleTelemetry = {
      numericId: v.numericId,
      vehicleId: v.vehicleId,
      timestamp: now,
      latitude: v.lat,
      longitude: v.lng,
      speed: Math.round(v.speed * 10) / 10,
      heading: v.heading,
      fuelLevel: Math.round(v.fuel),
      inGeofence: false
    };

    // Check geofence
    geofenceManager.evaluateTelemetry(item);
    batch.push(item);
  }

  // Publish to broker -> Socket.io binary ArrayBuffers
  messageBroker.publishTelemetry(batch);
}, 100);

// Endpoints to control simulation
app.post('/api/v1/simulator/control', (req, res) => {
  const { active, vehicleCount } = req.body;
  if (typeof active === 'boolean') {
    isSimulating = active;
  }
  if (typeof vehicleCount === 'number' && vehicleCount > 0 && vehicleCount <= 10000) {
    simulatedVehicleCount = vehicleCount;
    initSimulatedVehicles(simulatedVehicleCount);
  }
  res.json({
    isSimulating,
    simulatedVehicleCount
  });
});

async function bootstrap() {
  console.log('------------------------------------------------------------');
  console.log('🚀 Bootstrapping FleetDash Production Backend Server...');
  console.log('------------------------------------------------------------');

  // Initialize Worker Pool
  globalWorkerPool.init();

  // Connect MongoDB (Bucket Pattern)
  await connectMongo();

  // Initialize Redis Pub/Sub Broker
  await messageBroker.init();

  // Initialize WebSockets with ArrayBuffers
  socketManager.init(server);

  server.listen(CONFIG.PORT, () => {
    console.log(`[Server] FleetDash Core Engine running at http://localhost:${CONFIG.PORT}`);
    console.log(`[Server] Telemetry Ingest Endpoint: POST http://localhost:${CONFIG.PORT}/api/v1/telemetry/ingest`);
    console.log(`[Server] Telemetry Batch Endpoint:  POST http://localhost:${CONFIG.PORT}/api/v1/telemetry/batch`);
    console.log(`[Server] Sub-5ms Query Endpoint:    GET  http://localhost:${CONFIG.PORT}/api/v1/telemetry/history/:vehicleId`);
    console.log(`[Server] Real-time binary feed active on WebSockets with ArrayBuffers.`);
    console.log('------------------------------------------------------------');
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

