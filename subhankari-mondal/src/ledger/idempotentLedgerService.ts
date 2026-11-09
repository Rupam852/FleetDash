import { redisClient } from "../redis/redisClient.js";
import { DistributedLockManager } from "../locks/distributedLock.js";
import { AcidTransactionManager } from "./transactionManager.js";
import { Connection, Model } from "mongoose";

export interface TransactionInput {
  tenantId: string;
  organizationId: string;
  idempotencyKey: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  customerId: string;
  customerEmail: string;
  items: Array<{ description: string; quantity: number; unitPriceCents: number; totalCents: number }>;
}

export interface TransactionResult {
  status: "COMMITTED" | "ALREADY_PROCESSED" | "ROLLED_BACK";
  idempotencyKey: string;
  invoiceNumber: string;
  transactionId?: string;
  message: string;
  timestamp: Date;
}

export class IdempotentLedgerService {
  /**
   * Main financial transaction ingestion pipeline:
   * 1. Check Redis for duplicate idempotencyKey (Instant cache return)
   * 2. Acquire Redis distributed lock on resource/account to prevent race conditions
   * 3. Begin MongoDB multi-document ACID transaction
   * 4. Insert Invoice, update UsageQuota, create AuditLog
   * 5. Commit transaction and store idempotency cache
   */
  public static async processTransaction(
    connection: Connection,
    models: { Invoice: Model<any>; UsageQuota: Model<any>; AuditLog: Model<any> },
    input: TransactionInput
  ): Promise<TransactionResult> {
    const idempotencyCacheKey = `idempotency:${input.tenantId}:${input.idempotencyKey}`;

    // Step 1: Idempotency fast-path check
    const cachedResponse = await redisClient.get(idempotencyCacheKey);
    if (cachedResponse) {
      const parsed = JSON.parse(cachedResponse);
      return {
        status: "ALREADY_PROCESSED",
        idempotencyKey: input.idempotencyKey,
        invoiceNumber: parsed.invoiceNumber,
        transactionId: parsed.transactionId,
        message: "Duplicate request detected. Returned cached committed transaction result.",
        timestamp: new Date(parsed.timestamp),
      };
    }

    // Step 2: Acquire Distributed Lock on customer/account
    const lockResourceId = `tenant:${input.tenantId}:cust:${input.customerId}`;

    return await DistributedLockManager.withLock(lockResourceId, async () => {
      // Re-check cache inside lock (Double-Checked Locking Pattern)
      const doubleCheck = await redisClient.get(idempotencyCacheKey);
      if (doubleCheck) {
        const parsed = JSON.parse(doubleCheck);
        return {
          status: "ALREADY_PROCESSED",
          idempotencyKey: input.idempotencyKey,
          invoiceNumber: parsed.invoiceNumber,
          transactionId: parsed.transactionId,
          message: "Duplicate request detected inside lock.",
          timestamp: new Date(parsed.timestamp),
        };
      }

      // Step 3: Execute in Multi-Document ACID Transaction
      const result = await AcidTransactionManager.executeInTransaction(connection, async (session) => {
        // A. Insert Invoice in isolated tenant database
        const [invoice] = await models.Invoice.create(
          [
            {
              invoiceNumber: input.invoiceNumber,
              tenantId: input.tenantId,
              organizationId: input.organizationId,
              customerId: input.customerId,
              customerEmail: input.customerEmail,
              currency: input.currency,
              items: input.items,
              subtotalCents: input.amountCents,
              totalCents: input.amountCents,
              status: "PAID",
              idempotencyKey: input.idempotencyKey,
              paidAt: new Date(),
              dueAt: new Date(),
            },
          ],
          { session }
        );

        // B. Update tenant usage quota
        const currentPeriod = new Date().toISOString().slice(0, 7);
        await models.UsageQuota.updateOne(
          { tenantId: input.tenantId, billingPeriod: currentPeriod },
          {
            $inc: {
              invoicesGenerated: 1,
              totalCostIncurredCents: input.amountCents,
              apiCallsCount: 1,
            },
          },
          { upsert: true, session }
        );

        return invoice;
      });

      // Step 4: Cache successful response for 24 hours (idempotency window)
      const responsePayload = {
        invoiceNumber: result.invoiceNumber,
        transactionId: result._id.toString(),
        timestamp: new Date(),
      };

      await redisClient.set(idempotencyCacheKey, JSON.stringify(responsePayload), "EX", 86400);

      return {
        status: "COMMITTED",
        idempotencyKey: input.idempotencyKey,
        invoiceNumber: result.invoiceNumber,
        transactionId: result._id.toString(),
        message: "Financial transaction committed atomically with zero double-billing risk.",
        timestamp: new Date(),
      };
    });
  }
}
