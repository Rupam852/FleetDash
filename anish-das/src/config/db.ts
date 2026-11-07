import dns from "node:dns";
import mongoose from "mongoose";

// Resolve MongoDB Atlas SRV records reliably on Windows/Node environments
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore if custom servers cannot be set
}

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://rupambairagya_db_user:EUPXCvqzTHmuFfyj@cluster0.nxazr2c.mongodb.net/fleetdash?retryWrites=true&w=majority";

export async function connectDatabase(): Promise<typeof mongoose | null> {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 15000,
      autoIndex: true,
    });
    console.log(`[Database] MongoDB Atlas connected successfully to database: "${conn.connection.name}"`);
    return conn;
  } catch (err: any) {
    console.error(`[Database] MongoDB Atlas connection error: ${err.message}`);
    return null;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

