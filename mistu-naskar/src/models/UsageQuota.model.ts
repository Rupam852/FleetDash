import { Schema, Document } from "mongoose";

export interface IUsageQuota extends Document {
  tenantId: string;
  billingPeriod: string; // YYYY-MM
  apiCallsCount: number;
  invoicesGenerated: number;
  storageBytesUsed: number;
  computeUnitsHours: number;
  totalCostIncurredCents: number;
  isQuotaExceeded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const UsageQuotaSchema = new Schema<IUsageQuota>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    billingPeriod: {
      type: String,
      required: true,
      index: true,
    },
    apiCallsCount: {
      type: Number,
      default: 0,
    },
    invoicesGenerated: {
      type: Number,
      default: 0,
    },
    storageBytesUsed: {
      type: Number,
      default: 0,
    },
    computeUnitsHours: {
      type: Number,
      default: 0,
    },
    totalCostIncurredCents: {
      type: Number,
      default: 0,
    },
    isQuotaExceeded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

UsageQuotaSchema.index({ tenantId: 1, billingPeriod: 1 }, { unique: true });
