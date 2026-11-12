import { Router, Request, Response } from "express";
import { TenantMasterModel, getTenantDb, initMasterDb, closeAndRemoveTenantDb } from "../config/db.js";
import { getOptionalEnv } from "../config/env.js";
import { hashWorkspacePassword, verifyWorkspacePassword } from "../utils/cryptoPassword.js";
import { DEFAULT_HOME_STATE, normalizeHomeState } from "../utils/indianGstStates.js";
import { getErrorMessage } from "../utils/errors.js";

export const tenantsRouter = Router();

tenantsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    await initMasterDb();
    const rawTenants = await TenantMasterModel.find().sort({ createdAt: -1 }).lean();
    const tenants = rawTenants.map((t) => ({
      ...t,
      homeState: normalizeHomeState(t.homeState),
      isPasswordProtected: Boolean(t.passwordHash),
      passwordHash: undefined,
    }));
    return res.json({
      totalTenants: tenants.length,
      tenants,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    console.error("Failed to fetch tenants:", message);
    return res.status(500).json({ error: "DATABASE_ERROR", message });
  }
});

// Verify workspace security password (used when switching workspaces or entering locked workspace)
tenantsRouter.post("/verify-password", async (req: Request, res: Response) => {
  const { tenantId, password } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId is required" });
  }
  const cleanId = tenantId.toLowerCase().trim();

  try {
    await initMasterDb();
    const existing = await TenantMasterModel.findOne({ tenantId: cleanId });
    if (!existing) {
      return res.status(404).json({ error: "TENANT_NOT_FOUND", message: `Workspace '${cleanId}' not found.` });
    }

    if (!existing.passwordHash) {
      return res.json({ success: true, isPasswordProtected: false, message: "Workspace has no password set." });
    }

    if (!password) {
      return res.status(400).json({ success: false, error: "PASSWORD_REQUIRED", message: "Password is required." });
    }

    const isValid = verifyWorkspacePassword(password, existing.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "INVALID_PASSWORD",
        message: "Incorrect workspace password. Please try again.",
      });
    }

    return res.json({
      success: true,
      message: "Password verified successfully.",
      tenantId: cleanId,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    console.error("Verify password error:", message);
    return res.status(500).json({ error: "AUTH_ERROR", message });
  }
});

tenantsRouter.post("/provision", async (req: Request, res: Response) => {
  const { tenantId, name, subdomain, tier, homeState, workspacePassword } = req.body;

  if (!tenantId || !name) {
    return res.status(400).json({ error: "tenantId and name are required." });
  }

  const cleanId = tenantId.toLowerCase().trim();
  const dbName = `ledgerguard_tenant_${cleanId}`;
  const resolvedHomeState = normalizeHomeState(homeState || DEFAULT_HOME_STATE);

  try {
    await initMasterDb();

    // Check if tenant already exists
    const existing = await TenantMasterModel.findOne({ tenantId: cleanId });
    if (existing) {
      return res.status(409).json({ error: "TENANT_EXISTS", message: `Tenant ${cleanId} already provisioned.` });
    }

    const passwordHash =
      workspacePassword && typeof workspacePassword === "string" && workspacePassword.trim()
        ? hashWorkspacePassword(workspacePassword.trim())
        : null;

    const newTenant = await TenantMasterModel.create({
      tenantId: cleanId,
      name: name.trim(),
      subdomain: subdomain || `${cleanId}.ledgerguard.io`,
      databaseName: dbName,
      tier: tier || "ENTERPRISE",
      status: "ACTIVE",
      homeState: resolvedHomeState,
      passwordHash,
      isPasswordProtected: Boolean(passwordHash),
    });

    // Dynamically provision and bootstrap dedicated isolated database on MongoDB Atlas
    await getTenantDb(cleanId);

    return res.status(201).json({
      message: `Tenant ${cleanId} provisioned with dedicated isolated database: ${dbName}`,
      tenant: {
        ...newTenant.toObject(),
        homeState: resolvedHomeState,
        isPasswordProtected: Boolean(passwordHash),
        passwordHash: undefined,
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    console.error("Failed to provision tenant:", message);
    return res.status(500).json({ error: "PROVISION_FAILED", message });
  }
});

// Update / Edit an existing tenant workspace
tenantsRouter.put("/:tenantId", async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const { name, tier, status, homeState, subdomain, currentPassword, newPassword, removePassword, adminPin } = req.body;
  const cleanId = tenantId.toLowerCase().trim();

  try {
    await initMasterDb();
    const existing = await TenantMasterModel.findOne({ tenantId: cleanId });
    if (!existing) {
      return res.status(404).json({ error: "TENANT_NOT_FOUND", message: `Tenant ${cleanId} not found.` });
    }

    // Master Admin PIN verification for status change (ACTIVE <-> SUSPENDED)
    if (status && status !== existing.status) {
      const MASTER_STATUS_PIN = getOptionalEnv("MASTER_ADMIN_PIN");
      if (!MASTER_STATUS_PIN) {
        return res.status(500).json({
          error: "ADMIN_PIN_NOT_CONFIGURED",
          message: "MASTER_ADMIN_PIN is not configured on the server.",
        });
      }
      if (!adminPin) {
        return res.status(401).json({
          error: "ADMIN_PIN_REQUIRED",
          message: "Master Admin Security PIN is required to change workspace status (suspend/reactivate).",
        });
      }
      if (String(adminPin).trim() !== MASTER_STATUS_PIN) {
        return res.status(401).json({
          error: "INVALID_ADMIN_PIN",
          message: "Incorrect Master Admin PIN. Authorization denied.",
        });
      }
      existing.status = status;
    }

    if (name) existing.name = name.trim();
    if (tier) existing.tier = tier;
    if (homeState) existing.homeState = normalizeHomeState(homeState);
    if (subdomain) existing.subdomain = subdomain.trim();

    // Password modification logic
    if (existing.passwordHash && (newPassword !== undefined || removePassword)) {
      if (!currentPassword) {
        return res.status(401).json({
          error: "CURRENT_PASSWORD_REQUIRED",
          message: "Current password is required to change or remove workspace security.",
        });
      }
      if (!verifyWorkspacePassword(currentPassword, existing.passwordHash)) {
        return res.status(401).json({
          error: "INVALID_CURRENT_PASSWORD",
          message: "Incorrect current workspace password.",
        });
      }
    }

    if (removePassword || newPassword === "NONE" || (existing.passwordHash && newPassword === "")) {
      existing.passwordHash = null;
      existing.isPasswordProtected = false;
    } else if (newPassword && typeof newPassword === "string" && newPassword.trim()) {
      existing.passwordHash = hashWorkspacePassword(newPassword.trim());
      existing.isPasswordProtected = true;
    }

    await existing.save();

    return res.json({
      message: `Tenant ${cleanId} updated successfully.`,
      tenant: {
        ...existing.toObject(),
        homeState: normalizeHomeState(existing.homeState),
        isPasswordProtected: Boolean(existing.passwordHash),
        passwordHash: undefined,
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    console.error("Failed to update tenant:", message);
    return res.status(500).json({ error: "UPDATE_FAILED", message });
  }
});

// Delete / Remove a tenant workspace and purge its isolated database
tenantsRouter.delete("/:tenantId", async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const cleanId = tenantId.toLowerCase().trim();

  // Root primary tenant protection
  if (cleanId === "acme_corp") {
    return res.status(403).json({
      error: "ROOT_TENANT_PROTECTED",
      message: "The primary root tenant 'acme_corp' is protected and cannot be deleted.",
    });
  }

  try {
    await initMasterDb();
    const existing = await TenantMasterModel.findOne({ tenantId: cleanId });
    if (!existing) {
      return res.status(404).json({ error: "TENANT_NOT_FOUND", message: `Tenant ${cleanId} not found.` });
    }

    // Require password if workspace is protected
    if (existing.passwordHash) {
      const providedPassword = req.body?.workspacePassword || req.headers["x-workspace-password"];
      if (!providedPassword) {
        return res.status(401).json({
          error: "PASSWORD_REQUIRED_FOR_DELETION",
          message: `Workspace '${existing.name}' is password-protected. Password is required to confirm deletion.`,
        });
      }
      if (!verifyWorkspacePassword(String(providedPassword), existing.passwordHash)) {
        return res.status(401).json({
          error: "INVALID_WORKSPACE_PASSWORD",
          message: "Incorrect workspace password. Deletion aborted.",
        });
      }
    }

    // Drop the isolated database on MongoDB Atlas
    try {
      const conn = await getTenantDb(cleanId);
      await conn.dropDatabase();
    } catch (dropErr: unknown) {
      console.warn(`Could not drop database for tenant ${cleanId}:`, getErrorMessage(dropErr));
    }

    // Close and remove connection from pool
    await closeAndRemoveTenantDb(cleanId);

    // Remove from master directory
    await TenantMasterModel.deleteOne({ tenantId: cleanId });

    return res.json({
      message: `Tenant ${cleanId} and its isolated database have been safely removed.`,
      tenantId: cleanId,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    console.error("Failed to delete tenant:", message);
    return res.status(500).json({ error: "DELETE_FAILED", message });
  }
});
