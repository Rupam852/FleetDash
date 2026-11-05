export interface Tenant {
  tenantId: string;
  name: string;
  subdomain: string;
  databaseName: string;
  tier: "FREE" | "GROWTH" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED" | "PROVISIONING";
  activeInvoicesCount: number;
  monthlyVolumeCents: number;
}

export interface Invoice {
  invoiceNumber: string;
  idempotencyKey: string;
  customerId: string;
  customerEmail: string;
  amountCents: number;
  currency: string;
  status: "COMMITTED" | "ROLLED_BACK" | "PENDING";
  transactionId: string;
  description: string;
  timestamp: string;
}

export interface UsageMetrics {
  totalRevenueCents: number;
  committedTransactions: number;
  rollbacksHandled: number;
  apiCallCount: number;
  storageBytesUsed: number;
  quotaLimitPercent: number;
}
