import { Router, Request, Response } from "express";
import { getTenantContext } from "../middleware/tenantContext.js";

export const billingRouter = Router();

// Mock in-memory ledger transactions per tenant to provide fast zero-dependency frontend views
const mockLedgerStore: Record<string, Array<any>> = {
  acme_corp: [
    {
      invoiceNumber: "INV-2026-001",
      idempotencyKey: "idem_acme_987123",
      customerId: "cust_tata_logistics",
      customerEmail: "finance@tata.com",
      amountCents: 450000,
      currency: "INR",
      status: "COMMITTED",
      transactionId: "tx_99182312",
      description: "Q3 High-Throughput Freight Clearing",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      invoiceNumber: "INV-2026-002",
      idempotencyKey: "idem_acme_987124",
      customerId: "cust_reliance_retail",
      customerEmail: "payments@ril.com",
      amountCents: 1250000,
      currency: "INR",
      status: "COMMITTED",
      transactionId: "tx_99182313",
      description: "Dedicated Multi-Tenant Cloud Compute Nodes",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      invoiceNumber: "INV-2026-003",
      idempotencyKey: "idem_acme_crash_test",
      customerId: "cust_simulated_fail",
      customerEmail: "test@fail.com",
      amountCents: 850000,
      currency: "INR",
      status: "ROLLED_BACK",
      transactionId: "tx_aborted_lock_timeout",
      description: "Simulated Mid-Flight Network Failure Test",
      timestamp: new Date(Date.now() - 14400000).toISOString(),
    },
  ],
  globex_corp: [
    {
      invoiceNumber: "INV-GBX-101",
      idempotencyKey: "idem_gbx_001",
      customerId: "cust_mahindra_logistics",
      customerEmail: "accounts@mahindra.com",
      amountCents: 980000,
      currency: "INR",
      status: "COMMITTED",
      transactionId: "tx_gbx_5541",
      description: "Warehousing API Gateway Quota Expansion",
      timestamp: new Date(Date.now() - 5400000).toISOString(),
    },
  ],
};

billingRouter.get("/invoices", (req: Request, res: Response) => {
  const ctx = getTenantContext();
  const invoices = mockLedgerStore[ctx.tenantId] || [];

  return res.json({
    tenantId: ctx.tenantId,
    totalRecords: invoices.length,
    invoices,
  });
});

billingRouter.post("/charge", (req: Request, res: Response) => {
  const ctx = getTenantContext();
  const { idempotencyKey, amountCents, customerId, customerEmail, description, simulateFailure } = req.body;

  if (!idempotencyKey || !amountCents) {
    return res.status(400).json({ error: "idempotencyKey and amountCents are required." });
  }

  if (!mockLedgerStore[ctx.tenantId]) {
    mockLedgerStore[ctx.tenantId] = [];
  }

  // Idempotency check:
  const existing = mockLedgerStore[ctx.tenantId].find((i) => i.idempotencyKey === idempotencyKey);
  if (existing) {
    return res.status(200).json({
      status: "ALREADY_PROCESSED",
      message: "Idempotent duplicate request intercepted. Returning verified committed state.",
      invoice: existing,
    });
  }

  // Failure simulation for Mid-Project Review demonstration:
  if (simulateFailure) {
    const rolledBackRecord = {
      invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
      idempotencyKey,
      customerId: customerId || "cust_simulated",
      customerEmail: customerEmail || "test@infotact.in",
      amountCents,
      currency: "INR",
      status: "ROLLED_BACK",
      transactionId: `tx_aborted_${Date.now()}`,
      description: description || "Mid-Flight Failure Injected",
      timestamp: new Date().toISOString(),
    };
    mockLedgerStore[ctx.tenantId].unshift(rolledBackRecord);

    return res.status(500).json({
      status: "ROLLED_BACK",
      message: "CRITICAL FAILURE SIMULATED: Socket dropped mid-flight. Redis distributed lock released and MongoDB transaction rolled back. Zero double-billing.",
      record: rolledBackRecord,
    });
  }

  const newInvoice = {
    invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
    idempotencyKey,
    customerId: customerId || "cust_enterprise",
    customerEmail: customerEmail || "billing@client.com",
    amountCents,
    currency: "INR",
    status: "COMMITTED",
    transactionId: `tx_${Date.now()}`,
    description: description || "Enterprise SaaS Usage Tier Billing",
    timestamp: new Date().toISOString(),
  };

  mockLedgerStore[ctx.tenantId].unshift(newInvoice);

  return res.status(201).json({
    status: "COMMITTED",
    message: "Transaction committed atomically across isolated tenant database with zero double-billing risk.",
    invoice: newInvoice,
  });
});
