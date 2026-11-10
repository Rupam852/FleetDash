import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose, { Connection, Model, Schema } from "mongoose";
import { Redis } from "@upstash/redis";
import { getRequiredEnv } from "./env.js";
import { getErrorMessage } from "../utils/errors.js";
import { ITenantAuditLog, ITenantInvoice, ITenantMaster } from "../types/models.js";

// Initialize Upstash Redis
export const redis = new Redis({
  url: getRequiredEnv("UPSTASH_REDIS_REST_URL"),
  token: getRequiredEnv("UPSTASH_REDIS_REST_TOKEN"),
});

// Master DB Connection
const MONGODB_BASE_URI = getRequiredEnv("MONGODB_BASE_URI");

export let masterConnection: Connection | null = null;

// Tenant Schema for Master DB
export const TenantMasterSchema = new Schema<ITenantMaster>(
  {
    tenantId: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    databaseName: { type: String, required: true, unique: true, trim: true },
    tier: { type: String, enum: ["FREE", "GROWTH", "ENTERPRISE"], default: "ENTERPRISE" },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED", "PROVISIONING"], default: "ACTIVE" },
    homeState: { type: String, default: "West Bengal (19)", trim: true },
    passwordHash: { type: String, default: null },
    isPasswordProtected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Invoice Schema for Isolated Tenant DBs
export const TenantInvoiceSchema = new Schema<ITenantInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    idempotencyKey: { type: String, required: true, index: true },
    customerId: { type: String, required: true },
    customerName: { type: String, default: null },
    customerEmail: { type: String, required: true },
    customerGstin: { type: String, default: null },
    billingAddress: { type: String, default: null },
    placeOfSupply: { type: String, default: "West Bengal (19)" },
    sellerState: { type: String, default: null },
    supplyType: { type: String, enum: ["INTRA_STATE", "INTER_STATE", null], default: null },
    sacCode: { type: String, default: "998313" },
    quantity: { type: Number, default: 1 },
    unitPriceCents: { type: Number, default: null },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    isGstApplicable: { type: Boolean, default: true },
    gstRate: { type: Number, default: 18 },
    status: { type: String, enum: ["COMMITTED", "PENDING", "ROLLED_BACK"], default: "COMMITTED" },
    rollbackReason: { type: String, default: null },
    transactionId: { type: String, required: true },
    description: { type: String, required: true },
    timestamp: { type: String, required: true },
    rsaSignature: { type: String, default: null },
    rsaFingerprint: { type: String, default: null },
    rsaPublicKeyPem: { type: String, default: null },
    signedPayload: { type: String, default: null },
  },
  { timestamps: true }
);

// Immutable Multi-Document ACID Audit Trail Schema for Isolated Tenant DBs
export const TenantAuditLogSchema = new Schema<ITenantAuditLog>(
  {
    eventType: {
      type: String,
      enum: ["INVOICE_COMMITTED", "TRANSACTION_STAGED", "TRANSACTION_ABORTED", "INVOICE_DELETED"],
      required: true,
      index: true,
    },
    transactionId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, default: null, index: true },
    idempotencyKey: { type: String, default: null, index: true },
    actorEmail: { type: String, default: null },
    status: { type: String, required: true },
    amountCents: { type: Number, default: 0 },
    rsaSignature: { type: String, default: null },
    rsaFingerprint: { type: String, default: null },
    details: { type: String, default: null },
    timestamp: { type: String, required: true },
  },
  { timestamps: true }
);

export let TenantMasterModel: Model<ITenantMaster>;

// Dynamic Tenant Connection Pool Cache
const tenantConnections: Map<string, Connection> = new Map();

export async function initMasterDb(): Promise<Connection> {
  if (masterConnection && masterConnection.readyState === 1) {
    return masterConnection;
  }

  const masterUri = `${MONGODB_BASE_URI}/ledgerguard_master?retryWrites=true&w=majority`;
  console.log(`Connecting to Master MongoDB Atlas: ledgerguard_master...`);

  masterConnection = mongoose.createConnection(masterUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });

  await masterConnection.asPromise();
  TenantMasterModel = masterConnection.model<ITenantMaster>("Tenant", TenantMasterSchema);
  console.log(`✅ Master MongoDB Atlas Connected: ledgerguard_master`);

  return masterConnection;
}

export function getTenantModels(conn: Connection): {
  InvoiceModel: Model<ITenantInvoice>;
  AuditLogModel: Model<ITenantAuditLog>;
} {
  const InvoiceModel =
    (conn.models.Invoice as Model<ITenantInvoice> | undefined) ||
    conn.model<ITenantInvoice>("Invoice", TenantInvoiceSchema);
  const AuditLogModel =
    (conn.models.AuditLog as Model<ITenantAuditLog> | undefined) ||
    conn.model<ITenantAuditLog>("AuditLog", TenantAuditLogSchema);
  return { InvoiceModel, AuditLogModel };
}

export async function getTenantDb(tenantId: string): Promise<Connection> {
  const normalized = (tenantId || "default").toLowerCase().trim();

  const cached = tenantConnections.get(normalized);
  if (cached && cached.readyState === 1) {
    return cached;
  }

  const dbName = `ledgerguard_tenant_${normalized}`;
  const tenantUri = `${MONGODB_BASE_URI}/${dbName}?retryWrites=true&w=majority`;

  console.log(`⚡ Dynamically booting isolated tenant database pool: ${dbName}`);
  const conn = mongoose.createConnection(tenantUri, {
    maxPoolSize: 15,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });

  await conn.asPromise();
  const { InvoiceModel, AuditLogModel } = getTenantModels(conn);

  // Pre-create collections so MongoDB multi-document ACID transactions never fail on missing namespaces
  await Promise.all([
    InvoiceModel.createCollection().catch(() => undefined),
    AuditLogModel.createCollection().catch(() => undefined),
  ]);

  tenantConnections.set(normalized, conn);

  return conn;
}

export async function closeAndRemoveTenantDb(tenantId: string): Promise<void> {
  const normalized = (tenantId || "default").toLowerCase().trim();
  const conn = tenantConnections.get(normalized);
  if (conn) {
    try {
      await conn.close();
    } catch (err: unknown) {
      console.warn(`Error closing connection for tenant ${normalized}:`, getErrorMessage(err));
    }
    tenantConnections.delete(normalized);
  }
}

