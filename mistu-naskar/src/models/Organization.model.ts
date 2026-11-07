import { Schema, model, Document, Model } from "mongoose";

export interface IOrganization extends Document {
  organizationId: string;
  tenantId: string;
  legalEntityName: string;
  taxIdentifier: string; // GSTIN / EIN
  billingEmail: string;
  rsaPublicKey: string; // Asymmetric verification key
  keyFingerprint: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = new Schema<IOrganization>(
  {
    organizationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    legalEntityName: {
      type: String,
      required: true,
      trim: true,
    },
    taxIdentifier: {
      type: String,
      required: true,
      trim: true,
    },
    billingEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    rsaPublicKey: {
      type: String,
      required: true,
    },
    keyFingerprint: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const OrganizationModel: Model<IOrganization> = model<IOrganization>(
  "Organization",
  OrganizationSchema
);
