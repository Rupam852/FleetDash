import { Connection, Model } from "mongoose";
import { AcidTransactionManager } from "./transactionManager.js";
import { DistributedLockManager } from "../locks/distributedLock.js";
import { ILedgerInvoice, ILedgerUsageQuota } from "./idempotentLedgerService.js";

export class RollbackSimulator {
  /**
   * Simulates a mid-flight payment gateway network timeout or database failure.
   * Proves that MongoDB ACID transaction rolls back and zero duplicate charges occur!
   */
  public static async simulateMidFlightFailure(
    connection: Connection,
    models: { Invoice: Model<ILedgerInvoice>; UsageQuota: Model<ILedgerUsageQuota> },
    mockPayload: {
      tenantId: string;
      invoiceNumber: string;
      amountCents: number;
      idempotencyKey: string;
    }
  ): Promise<{
    rollbackSucceeded: boolean;
    errorEncountered: string;
    invoiceFoundInDbAfterRollback: boolean;
  }> {
    const lockId = `sim:${mockPayload.tenantId}:${mockPayload.idempotencyKey}`;
    let errorCaught = "";

    try {
      await DistributedLockManager.withLock(lockId, async () => {
        await AcidTransactionManager.executeInTransaction(connection, async (session) => {
          // 1. Stage invoice insertion
          await models.Invoice.create(
            [
              {
                invoiceNumber: mockPayload.invoiceNumber,
                tenantId: mockPayload.tenantId,
                organizationId: "org_test",
                customerId: "cust_crash_test",
                customerEmail: "crash@infotact.in",
                currency: "INR",
                items: [{ description: "Simulated Service Charge", quantity: 1, unitPriceCents: mockPayload.amountCents, totalCents: mockPayload.amountCents }],
                subtotalCents: mockPayload.amountCents,
                totalCents: mockPayload.amountCents,
                status: "PENDING",
                idempotencyKey: mockPayload.idempotencyKey,
                dueAt: new Date(),
              },
            ],
            { session }
          );

          // 2. INJECT MID-FLIGHT CATASTROPHIC NETWORK FAILURE!
          throw new Error("SIMULATED_NETWORK_TIMEOUT_MID_FLIGHT: Socket disconnected prior to bank receipt acknowledgment.");
        });
      });
    } catch (err: unknown) {
      errorCaught = err instanceof Error ? err.message : String(err);
    }

    // 3. Query DB to prove that invoice does NOT exist (Atomically rolled back!)
    const checkInvoice = await models.Invoice.findOne({ invoiceNumber: mockPayload.invoiceNumber });

    return {
      rollbackSucceeded: !checkInvoice,
      errorEncountered: errorCaught,
      invoiceFoundInDbAfterRollback: !!checkInvoice,
    };
  }
}
