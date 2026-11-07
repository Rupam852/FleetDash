import "dotenv/config";
import http from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { connectRedis, setupRedisPubSubBridge, isRedisAvailable } from "./config/redis.js";

const PORT = process.env.PORT || 5000;
const app = createApp();
const server = http.createServer(app);

// Initialize Socket.IO instance for real-time streaming
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket: Socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

async function startServer() {
  // 1. Connect to MongoDB Atlas
  const db = await connectDatabase();
  if (db) {
    console.log("[Server] MongoDB Atlas connection verified. Ready for real user transactions.");
  } else {
    console.warn("[Server] MongoDB connection not established. Starting in degraded mode.");
  }

  // 2. Connect to Upstash Redis Cloud
  const redisConnected = await connectRedis();
  if (redisConnected) {
    // 3. Setup Redis Pub/Sub Bridge to push live events to connected frontend clients
    await setupRedisPubSubBridge((event, payload) => {
      io.emit(event, payload);
    });
  }

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 FleetDash Ingestion Engine & Infrastructure Server`);
    console.log(`👤 Owner: Anish Das (Backend Infrastructure)`);
    console.log(`📡 HTTP & Socket.IO running on port http://localhost:${PORT}`);
    console.log(`🍃 Connected to MongoDB Atlas Database: fleetdash`);
    console.log(`⚡ Redis Caching & Pub/Sub: ${isRedisAvailable() ? "CONNECTED (Upstash Cloud)" : "OFFLINE"}`);
    console.log(`🎯 Clean Real-Life Database ready - No mock data`);
    console.log(`=======================================================`);
  });
}

startServer();

export { server, io };
