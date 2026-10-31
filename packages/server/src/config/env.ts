import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root if available
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config(); // fallback to local package .env

export const CONFIG = {
  PORT: parseInt(process.env['PORT'] || '4000', 10),
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  MONGODB_URI: process.env['MONGODB_URI'] || 'mongodb://localhost:27017/fleetdash',
  REDIS_HOST: process.env['REDIS_HOST'] || 'localhost',
  REDIS_PORT: parseInt(process.env['REDIS_PORT'] || '6379', 10),
  REDIS_PASSWORD: process.env['REDIS_PASSWORD'] || undefined,
  WORKER_POOL_SIZE: parseInt(process.env['WORKER_POOL_SIZE'] || '4', 10),
  BUCKET_SIZE_LIMIT: parseInt(process.env['BUCKET_SIZE_LIMIT'] || '3600', 10),
};

