export interface Tenant {
  tenantId: string;
  name: string;
  subdomain: string;
  databaseName: string;
  tier: "FREE" | "GROWTH" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED" | "PROVISIONING";
  homeState?: string;
  isPasswordProtected?: boolean;
}

export interface Invoice {
  invoiceNumber: string;
  idempotencyKey: string;
  customerId: string;
  customerName?: string;
  customerEmail: string;
  customerGstin?: string;
  billingAddress?: string;
  placeOfSupply?: string;
  sellerState?: string;
  supplyType?: "INTRA_STATE" | "INTER_STATE";
  sacCode?: string;
  quantity?: number;
  unitPriceCents?: number;
  amountCents: number;
  currency: string;
  isGstApplicable?: boolean;
  gstRate?: number;
  status: "COMMITTED" | "ROLLED_BACK" | "PENDING";
  rollbackReason?: string;
  transactionId: string;
  description: string;
  timestamp: string;
  rsaSignature?: string;
  rsaFingerprint?: string;
  rsaPublicKeyPem?: string;
  signedPayload?: string;
}

export interface UsageMetrics {
  totalRevenueCents: number;
}

export interface AuthUser {
  email: string;
  name?: string;
  tenantId?: string;
  organizationId?: string;
  role?: "OWNER" | "ADMIN" | "FINANCE_OPERATOR" | "AUDITOR";
}

export interface RollbackAuditResult {
  traceId?: string;
  workspace?: string;
  databaseTarget?: string;
  redisLockAcquired?: boolean;
  redisLockReleased?: boolean;
  mongoTransactionAborted?: boolean;
  stagedTxPurged?: boolean;
  amountDebitedCents?: number;
  recoveryLatencyMs?: number;
  doubleSpendPrevented?: boolean;
  stateIntegrity?: string;
}

export interface FleetTenantBreakdown {
  tenantId: string;
  name: string;
  tier: "FREE" | "GROWTH" | "ENTERPRISE";
  databaseName: string;
  invoicesCount: number;
  storageKb: number;
  revenueRupees: string;
}

export interface FleetClusterData {
  clusterHost: string;
  region: string;
  totalDatabases: number;
  totalTenants: number;
  totalClusterInvoices: number;
  totalClusterRevenueRupees: string;
  totalClusterStorageKb: number;
  clusterCapacityMb: number;
  clusterStorageUsedPercent: number;
  tenantBreakdowns: FleetTenantBreakdown[];
}

export interface PublicVerificationResponse {
  status: string;
  isAuthentic: boolean;
  verifiedAt: string;
  tenant: Tenant;
  invoice: Invoice;
  securitySeal: {
    algorithm: string;
    cryptographicProof: string;
    authority: string;
    signature: string;
    tamperProofStatus: string;
  };
}
