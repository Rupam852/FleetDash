import { Schema, model, Document, Model } from "mongoose";

export interface ITenant extends Document {
  tenantId: string;
  name: string;
  subdomain: string;
  databaseName: string;
  tier: "FREE" | "GROWTH" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED" | "PROVISIONING";
  quotaLimits: {
    maxMonthlyInvoices: number;
    maxApiCallsPerDay: number;
    maxConcurrentTransactions: number;
  };
  isolationLevel: "DEDICATED_DATABASE" | "ISOLATED_SCHEMA";
  createdAt: Date;
  updatedAt: Date;
}

export const TenantSchema = new Schema<ITenant>(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    databaseName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    tier: {
      type: String,
      enum: ["FREE", "GROWTH", "ENTERPRISE"],
      default: "GROWTH",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "PROVISIONING"],
      default: "ACTIVE",
    },
    quotaLimits: {
      maxMonthlyInvoices: { type: Number, default: 10000 },
      maxApiCallsPerDay: { type: Number, default: 50000 },
      maxConcurrentTransactions: { type: Number, default: 50 },
    },
    isolationLevel: {
      type: String,
      enum: ["DEDICATED_DATABASE", "ISOLATED_SCHEMA"],
      default: "DEDICATED_DATABASE",
    },
  },
  {
    timestamps: true,
  }
);

export const TenantModel: Model<ITenant> = model<ITenant>("Tenant", TenantSchema);
