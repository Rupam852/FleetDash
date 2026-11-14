import { TenantModel, ITenant } from "../models/Tenant.model.js";
import { OrganizationModel } from "../models/Organization.model.js";
import { tenantDbManager } from "../config/tenantDbManager.js";

export interface CreateTenantInput {
  tenantId: string;
  name: string;
  subdomain: string;
  tier?: "FREE" | "GROWTH" | "ENTERPRISE";
  legalEntityName: string;
  taxIdentifier: string;
  billingEmail: string;
  rsaPublicKey: string;
  keyFingerprint: string;
}

export class TenantProvisioningService {
  /**
   * Bootstraps a new enterprise tenant:
   * 1. Inserts master tenant and organization metadata
   * 2. Dynamically provisions the dedicated MongoDB database namespace
   * 3. Initializes isolated collection indexes
   */
  public static async provisionTenant(input: CreateTenantInput): Promise<{
    tenant: ITenant;
    databaseName: string;
    provisionedAt: Date;
  }> {
    const databaseName = `ledgerguard_tenant_${input.tenantId.toLowerCase().trim()}`;

    // 1. Create master Tenant record
    const tenant = await TenantModel.create({
      tenantId: input.tenantId,
      name: input.name,
      subdomain: input.subdomain,
      databaseName,
      tier: input.tier || "GROWTH",
      status: "ACTIVE",
      isolationLevel: "DEDICATED_DATABASE",
    });

    // 2. Create Organization record with cryptographic public key
    await OrganizationModel.create({
      organizationId: `org_${input.tenantId}`,
      tenantId: input.tenantId,
      legalEntityName: input.legalEntityName,
      taxIdentifier: input.taxIdentifier,
      billingEmail: input.billingEmail,
      rsaPublicKey: input.rsaPublicKey,
      keyFingerprint: input.keyFingerprint,
      isActive: true,
    });

    // 3. Boot dynamic connection to ensure collections & indexes are created
    const tenantContext = await tenantDbManager.getTenantConnection(input.tenantId);
    await tenantContext.models.Invoice.init();
    await tenantContext.models.UsageQuota.init();
    await tenantContext.models.AuditLog.init();

    return {
      tenant,
      databaseName,
      provisionedAt: new Date(),
    };
  }

  /**
   * Validates if a tenant is active and ready to process transactions
   */
  public static async validateTenantAccess(tenantId: string): Promise<boolean> {
    const tenant = await TenantModel.findOne({
      tenantId: tenantId.toLowerCase().trim(),
      status: "ACTIVE",
    });
    return !!tenant;
  }
}
