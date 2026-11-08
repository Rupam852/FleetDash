import { Schema, Document } from "mongoose";

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  tenantId: string;
  organizationId: string;
  customerId: string;
  customerEmail: string;
  currency: string;
  items: IInvoiceItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  status: "DRAFT" | "PENDING" | "PAID" | "VOID" | "ROLLED_BACK";
  idempotencyKey: string;
  paymentTransactionId?: string;
  dueAt: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPriceCents: { type: Number, required: true, min: 0 },
  totalCents: { type: Number, required: true, min: 0 },
});

export const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
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
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
      uppercase: true,
    },
    items: [InvoiceItemSchema],
    subtotalCents: {
      type: Number,
      required: true,
      min: 0,
    },
    taxCents: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCents: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "PAID", "VOID", "ROLLED_BACK"],
      default: "PENDING",
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },
    paymentTransactionId: {
      type: String,
    },
    dueAt: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);
