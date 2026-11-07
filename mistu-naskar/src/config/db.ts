import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

// Ensure reliable DNS SRV resolution across all OS environments
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore fallback
}

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/fleetdash";

export async function connectDatabase(): Promise<typeof mongoose | null> {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      maxPoolSize: 50, // High-throughput connection pool target
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    console.log(`[Database] MongoDB connected successfully to ${conn.connection.name}`);
    return conn;
  } catch (err: any) {
    console.warn(`[Database] MongoDB connection warning: ${err.message}. Running in simulated mode.`);
    return null;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

