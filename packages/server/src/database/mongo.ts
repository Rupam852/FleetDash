import mongoose from 'mongoose';
import { CONFIG } from '../config/env.js';

let isConnected = false;

export async function connectMongo(): Promise<boolean> {
  if (isConnected) return true;

  try {
    await mongoose.connect(CONFIG.MONGODB_URI, {
      maxPoolSize: 50,       // Connection pool for high concurrent ingestion
      minPoolSize: 10,
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('[Database] MongoDB connected successfully with Connection Pool (50).');
    return true;
  } catch (error) {
    console.warn('[Database] MongoDB not available at configured URI. Operating with in-memory caching fallback for local dev.');
    isConnected = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return isConnected;
}

