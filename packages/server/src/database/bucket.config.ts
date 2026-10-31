/**
 * MongoDB Time-Series Bucket Pattern Configuration & SLA Constants
 * Maintained by: Mistu Naskar (Database & Storage Engineer)
 */
export const BUCKET_CONFIG = {
  // Pre-allocated samples capacity per hourly bucket document
  MAX_SAMPLES_PER_BUCKET: 3600,

  // Compound index specifications for sub-5ms query performance
  PRIMARY_INDEX: { vehicleId: 1, bucketStartTime: -1 },

  // MongoDB connection pool settings for high-concurrency ingestion
  POOL_SETTINGS: {
    maxPoolSize: 50,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 3000,
    socketTimeoutMS: 45000,
  },

  // Query performance threshold
  SLA_MAX_LATENCY_MS: 5.0
};
