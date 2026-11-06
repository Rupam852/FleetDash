import mongoose, { Schema, Document } from "mongoose";

export interface ITelemetrySample {
  recordedAt: Date;
  latitude: number;
  longitude: number;
  speedKmph: number;
  headingDegrees: number;
  fuelLevelPct?: number;
}

export interface ITelemetryBucket extends Document {
  vehicleId: string;
  bucketStartTime: Date;
  bucketEndTime: Date;
  count: number;
  minSpeed: number;
  maxSpeed: number;
  samples: ITelemetrySample[];
}

const TelemetrySampleSchema = new Schema<ITelemetrySample>(
  {
    recordedAt: { type: Date, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speedKmph: { type: Number, required: true },
    headingDegrees: { type: Number, required: true, default: 0 },
    fuelLevelPct: { type: Number, required: false },
  },
  { _id: false }
);

const TelemetryBucketSchema = new Schema<ITelemetryBucket>(
  {
    vehicleId: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    bucketStartTime: {
      type: Date,
      required: true,
      index: true,
    },
    bucketEndTime: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    minSpeed: {
      type: Number,
      default: 0,
    },
    maxSpeed: {
      type: Number,
      default: 0,
    },
    samples: [TelemetrySampleSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// High-performance compound index for sub-5ms range queries
TelemetryBucketSchema.index({ vehicleId: 1, bucketStartTime: -1 });

export const TelemetryBucketModel = mongoose.model<ITelemetryBucket>(
  "TelemetryBucket",
  TelemetryBucketSchema
);

