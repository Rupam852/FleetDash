import mongoose, { Connection, Model } from "mongoose";
import { InvoiceSchema, IInvoice } from "../models/Invoice.model.js";
import { UsageQuotaSchema, IUsageQuota } from "../models/UsageQuota.model.js";
import { AuditLogSchema, IAuditLog } from "../models/AuditLog.model.js";

interface TenantConnectionCache {
  connection: Connection;
  lastAccessed: number;
  models: {
    Invoice: Model<IInvoice>;
    UsageQuota: Model<IUsageQuota>;
    AuditLog: Model<IAuditLog>;
  };
}

export class TenantDatabaseManager {
  private static instance: TenantDatabaseManager;
  private connectionCache: Map<string, TenantConnectionCache> = new Map();
  private baseUri: string;
  private maxIdleTimeMs: number = 30 * 60 * 1000; // 30 minutes eviction

  private constructor() {
    this.baseUri = process.env.MONGODB_BASE_URI || "mongodb://127.0.0.1:27017";
    // Periodic idle cleanup
    setInterval(() => this.evictIdleConnections(), 5 * 60 * 1000);
  }

  public static getInstance(): TenantDatabaseManager {
    if (!TenantDatabaseManager.instance) {
      TenantDatabaseManager.instance = new TenantDatabaseManager();
    }
    return TenantDatabaseManager.instance;
  }

  /**
   * Dynamically retrieves or boots an isolated database connection for the given tenantId.
   * Guarantees zero cross-tenant data leakage by using dedicated database namespaces.
   */
  public async getTenantConnection(tenantId: string): Promise<TenantConnectionCache> {
    const normalizedTenant = tenantId.trim().toLowerCase();

    // 1. Check in-memory connection cache
    const existing = this.connectionCache.get(normalizedTenant);
    if (existing && existing.connection.readyState === 1) {
      existing.lastAccessed = Date.now();
      return existing;
    }

    // 2. Build isolated database URI
    const dbName = `ledgerguard_tenant_${normalizedTenant}`;
    const tenantUri = `${this.baseUri}/${dbName}?retryWrites=true&w=majority`;

    // 3. Establish dedicated Mongoose connection pool
    const connection = mongoose.createConnection(tenantUri, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await connection.asPromise();

    // 4. Register isolated schemas on this tenant connection
    const models = {
      Invoice: connection.model<IInvoice>("Invoice", InvoiceSchema),
      UsageQuota: connection.model<IUsageQuota>("UsageQuota", UsageQuotaSchema),
      AuditLog: connection.model<IAuditLog>("AuditLog", AuditLogSchema),
    };

    const cacheEntry: TenantConnectionCache = {
      connection,
      lastAccessed: Date.now(),
      models,
    };

    this.connectionCache.set(normalizedTenant, cacheEntry);
    return cacheEntry;
  }

  /**
   * Returns active connection count across all isolated tenant pools
   */
  public getActivePoolMetrics() {
    const pools: Array<{ tenantId: string; readyState: number; lastAccessed: Date }> = [];
    this.connectionCache.forEach((entry, tenantId) => {
      pools.push({
        tenantId,
        readyState: entry.connection.readyState,
        lastAccessed: new Date(entry.lastAccessed),
      });
    });
    return {
      totalActivePools: this.connectionCache.size,
      pools,
    };
  }

  /**
   * Safely disconnects and clears a tenant pool (e.g., during off-boarding or testing)
   */
  public async closeTenantConnection(tenantId: string): Promise<void> {
    const normalizedTenant = tenantId.trim().toLowerCase();
    const entry = this.connectionCache.get(normalizedTenant);
    if (entry) {
      await entry.connection.close();
      this.connectionCache.delete(normalizedTenant);
    }
  }

  /**
   * Cleanly closes all pooled tenant connections (for graceful shutdown)
   */
  public async closeAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.connectionCache.forEach((entry) => {
      promises.push(entry.connection.close());
    });
    await Promise.all(promises);
    this.connectionCache.clear();
  }

  private async evictIdleConnections(): Promise<void> {
    const now = Date.now();
    for (const [tenantId, entry] of this.connectionCache.entries()) {
      if (now - entry.lastAccessed > this.maxIdleTimeMs) {
        await entry.connection.close();
        this.connectionCache.delete(tenantId);
      }
    }
  }
}

export const tenantDbManager = TenantDatabaseManager.getInstance();
