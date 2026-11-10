import { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  auditId: string;
  tenantId: string;
  organizationId: string;
  action: string;
  entityType: "INVOICE" | "TRANSACTION" | "TENANT_CONFIG" | "CRYPTO_KEY";
  entityId: string;
  performedBy: string;
  previousHash: string;
  currentHash: string; // SHA-256 tamper-evident hash chaining
  rsaSignature: string; // Zero-knowledge cryptographic proof
  payloadSnapshot: Record<string, unknown>;
  ipAddress: string;
  timestamp: Date;
}

export const AuditLogSchema = new Schema<IAuditLog>(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["INVOICE", "TRANSACTION", "TENANT_CONFIG", "CRYPTO_KEY"],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    performedBy: {
      type: String,
      required: true,
    },
    previousHash: {
      type: String,
      required: true,
    },
    currentHash: {
      type: String,
      required: true,
    },
    rsaSignature: {
      type: String,
      required: true,
    },
    payloadSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    ipAddress: {
      type: String,
      default: "127.0.0.1",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);
