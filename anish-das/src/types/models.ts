export type TenantTier = "FREE" | "GROWTH" | "ENTERPRISE";
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "PROVISIONING";
export type SupplyType = "INTRA_STATE" | "INTER_STATE";
export type InvoiceStatus = "COMMITTED" | "PENDING" | "ROLLED_BACK";
export type AuditEventType =
  | "INVOICE_COMMITTED"
  | "TRANSACTION_STAGED"
  | "TRANSACTION_ABORTED"
  | "INVOICE_DELETED";

export interface ITenantMaster {
  tenantId: string;
  name: string;
  subdomain: string;
  databaseName: string;
  tier: TenantTier;
  status: TenantStatus;
  homeState?: string;
  passwordHash?: string | null;
  isPasswordProtected?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITenantInvoice {
  invoiceNumber: string;
  idempotencyKey: string;
  customerId: string;
  customerName?: string | null;
  customerEmail: string;
  customerGstin?: string | null;
  billingAddress?: string | null;
  placeOfSupply?: string | null;
  sellerState?: string | null;
  supplyType?: SupplyType | null;
  sacCode?: string;
  quantity?: number;
  unitPriceCents?: number | null;
  amountCents: number;
  currency: string;
  isGstApplicable?: boolean;
  gstRate?: number;
  status: InvoiceStatus;
  rollbackReason?: string | null;
  transactionId: string;
  description: string;
  timestamp: string;
  rsaSignature?: string | null;
  rsaFingerprint?: string | null;
  rsaPublicKeyPem?: string | null;
  signedPayload?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITenantAuditLog {
  eventType: AuditEventType;
  transactionId: string;
  invoiceNumber?: string | null;
  idempotencyKey?: string | null;
  actorEmail?: string | null;
  status: string;
  amountCents?: number;
  rsaSignature?: string | null;
  rsaFingerprint?: string | null;
  details?: string | null;
  timestamp: string;
  createdAt?: Date;
  updatedAt?: Date;
}

