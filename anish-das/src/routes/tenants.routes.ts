import { Router, Request, Response } from "express";

export const tenantsRouter = Router();

// In-memory tenant registry for rapid demo & onboarding
const activeTenants = [
  {
    tenantId: "acme_corp",
    name: "Acme Corporation",
    subdomain: "acme.ledgerguard.io",
    databaseName: "ledgerguard_tenant_acme_corp",
    tier: "ENTERPRISE",
    status: "ACTIVE",
    activeInvoicesCount: 142,
    monthlyVolumeCents: 4589000,
  },
  {
    tenantId: "globex_corp",
    name: "Globex Industries",
    subdomain: "globex.ledgerguard.io",
    databaseName: "ledgerguard_tenant_globex_corp",
    tier: "GROWTH",
    status: "ACTIVE",
    activeInvoicesCount: 89,
    monthlyVolumeCents: 2120000,
  },
  {
    tenantId: "soylent_corp",
    name: "Soylent Logistics",
    subdomain: "soylent.ledgerguard.io",
    databaseName: "ledgerguard_tenant_soylent_corp",
    tier: "ENTERPRISE",
    status: "ACTIVE",
    activeInvoicesCount: 310,
    monthlyVolumeCents: 8900000,
  },
];

tenantsRouter.get("/", (req: Request, res: Response) => {
  return res.json({
    totalTenants: activeTenants.length,
    tenants: activeTenants,
  });
});

tenantsRouter.post("/provision", (req: Request, res: Response) => {
  const { tenantId, name, subdomain, tier } = req.body;

  if (!tenantId || !name) {
    return res.status(400).json({ error: "tenantId and name are required." });
  }

  const newTenant = {
    tenantId: tenantId.toLowerCase().trim(),
    name,
    subdomain: subdomain || `${tenantId}.ledgerguard.io`,
    databaseName: `ledgerguard_tenant_${tenantId.toLowerCase().trim()}`,
    tier: tier || "GROWTH",
    status: "ACTIVE",
    activeInvoicesCount: 0,
    monthlyVolumeCents: 0,
  };

  activeTenants.push(newTenant);

  return res.status(201).json({
    message: "Tenant provisioned with dedicated isolated database.",
    tenant: newTenant,
  });
});
