import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { initMasterDb, TenantMasterModel, redis } from "../config/db.js";
import { getOptionalEnv, getRequiredEnv } from "../config/env.js";
import { verifyWorkspacePassword } from "../utils/cryptoPassword.js";
import { normalizeHomeState } from "../utils/indianGstStates.js";
import { jwtUserAuthMiddleware } from "../middleware/jwtTenantAuth.js";
import { getTenantContext } from "../middleware/tenantContext.js";
import { getErrorMessage } from "../utils/errors.js";
import { ITenantMaster } from "../types/models.js";

export const authRouter = Router();

// Password Reset Endpoint
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  const { email, currentPassword, newPassword, confirmPassword } = req.body;

  if (!email || !currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      error: "ALL_FIELDS_REQUIRED",
      message: "Email, Current Password, New Password, and Confirm Password are all required.",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      error: "PASSWORD_MISMATCH",
      message: "New password and Confirm password do not match.",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      error: "PASSWORD_TOO_SHORT",
      message: "New password must be at least 6 characters long.",
    });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    const userPwdKey = `auth:user:password:${cleanEmail}`;
    const storedPassword = (await redis.get<string>(userPwdKey)) || getOptionalEnv("DEFAULT_ADMIN_PASSWORD");

    if (!storedPassword || currentPassword !== storedPassword) {
      return res.status(401).json({
        error: "INVALID_CURRENT_PASSWORD",
        message: "Current password is incorrect. Please verify your existing password.",
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        error: "SAME_PASSWORD",
        message: "New password cannot be identical to current password.",
      });
    }

    // Persist new password into distributed Redis
    await redis.set(userPwdKey, newPassword);

    return res.json({
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    console.error("Password reset error:", message);
    return res.status(500).json({ error: "RESET_FAILED", message });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password, tenantId, workspacePassword, organizationId } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const jwtSecret = getRequiredEnv("JWT_SECRET");

    // Verify user account password if provided
    if (password) {
      const userPwdKey = `auth:user:password:${cleanEmail}`;
      const storedPassword = (await redis.get<string>(userPwdKey)) || getOptionalEnv("DEFAULT_ADMIN_PASSWORD");
      if (!storedPassword || password !== storedPassword) {
        return res.status(401).json({
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password. Please verify credentials.",
        });
      }
    }

    await initMasterDb();
    const allTenants = await TenantMasterModel.find({ status: "ACTIVE" }).sort({ createdAt: 1 }).lean();

    // 1. If tenantId is explicitly provided (direct login or workspace chosen)
    if (tenantId) {
      const normalizedReqTenant = String(tenantId).toLowerCase().trim();
      const matchedTenant = allTenants.find((t) => t.tenantId === normalizedReqTenant);
      const selectedTenant: Pick<
        ITenantMaster,
        "tenantId" | "name" | "tier" | "passwordHash" | "homeState"
      > = matchedTenant || {
        tenantId: normalizedReqTenant,
        name: String(tenantId),
        tier: "ENTERPRISE",
        passwordHash: null,
        homeState: undefined,
      };

      // Check if selected workspace is password-protected
      if (selectedTenant.passwordHash) {
        if (!workspacePassword) {
          return res.status(401).json({
            error: "WORKSPACE_PASSWORD_REQUIRED",
            message: `Workspace '${selectedTenant.name}' is password-protected. Please enter the workspace security password.`,
            isPasswordProtected: true,
            tenantId: selectedTenant.tenantId,
          });
        }

        const isValid = verifyWorkspacePassword(workspacePassword, selectedTenant.passwordHash);
        if (!isValid) {
          return res.status(401).json({
            error: "INVALID_WORKSPACE_PASSWORD",
            message: "Incorrect workspace password. Please try again.",
            isPasswordProtected: true,
            tenantId: selectedTenant.tenantId,
          });
        }
      }

      const org = organizationId || `org_${selectedTenant.tenantId}`;
      const token = jwt.sign(
        {
          sub: `user_${Date.now()}`,
          email,
          tenantId: selectedTenant.tenantId,
          organizationId: org,
          role: "ADMIN",
        },
        jwtSecret,
        { expiresIn: "8h" }
      );

      const sanitizedWorkspace = {
        ...selectedTenant,
        homeState: normalizeHomeState(selectedTenant.homeState),
        isPasswordProtected: Boolean(selectedTenant.passwordHash),
        passwordHash: undefined,
      };

      return res.json({
        message: "Authentication successful",
        token,
        activeWorkspace: sanitizedWorkspace,
        user: {
          email,
          name: "TeamNova Admin",
          tenantId: selectedTenant.tenantId,
          organizationId: org,
          role: "ADMIN",
        },
      });
    }

    // 2. If no tenantId provided, check available workspaces
    if (allTenants.length === 0) {
      // Case C: User has 0 workspaces -> Prompt to create workspace with short-lived onboarding token
      const sessionToken = jwt.sign(
        {
          sub: `user_${Date.now()}`,
          email,
          tenantId: "*",
          organizationId: "org_onboarding",
          role: "ADMIN",
          scope: "WORKSPACE_ONBOARDING",
        },
        jwtSecret,
        { expiresIn: "15m" }
      );
      return res.json({
        requiresCreation: true,
        sessionToken,
        user: { email, name: "TeamNova Admin" },
        message: "No workspace found. Please set up your first workspace.",
      });
    }

    // Case B: Exactly 1 workspace and NOT password protected -> Directly log in
    if (allTenants.length === 1 && !allTenants[0].passwordHash) {
      const singleTenant = allTenants[0];
      const org = `org_${singleTenant.tenantId}`;
      const token = jwt.sign(
        {
          sub: `user_${Date.now()}`,
          email,
          tenantId: singleTenant.tenantId,
          organizationId: org,
          role: "ADMIN",
        },
        jwtSecret,
        { expiresIn: "8h" }
      );

      return res.json({
        message: "Authentication successful",
        token,
        activeWorkspace: {
          ...singleTenant,
          homeState: normalizeHomeState(singleTenant.homeState),
          isPasswordProtected: false,
          passwordHash: undefined,
        },
        user: {
          email,
          name: "TeamNova Admin",
          tenantId: singleTenant.tenantId,
          organizationId: org,
          role: "ADMIN",
        },
      });
    }

    // Case A: Workspaces available -> User selection with locked status
    const sanitizedWorkspaces = allTenants.map((t) => ({
      ...t,
      homeState: normalizeHomeState(t.homeState),
      isPasswordProtected: Boolean(t.passwordHash),
      passwordHash: undefined,
    }));

    const sessionToken = jwt.sign(
      {
        sub: `user_${Date.now()}`,
        email,
        tenantId: "*",
        organizationId: "org_onboarding",
        role: "ADMIN",
        scope: "WORKSPACE_ONBOARDING",
      },
      jwtSecret,
      { expiresIn: "15m" }
    );

    return res.json({
      requiresSelection: true,
      sessionToken,
      availableWorkspaces: sanitizedWorkspaces,
      user: { email, name: "TeamNova Admin" },
      message: "Multiple workspaces available. Please select which workspace to launch.",
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    console.error("Login routing error:", message);
    return res.status(500).json({ error: "AUTH_ERROR", message });
  }
});

// Switch active workspace and issue a fresh tenant-scoped JWT
authRouter.post("/switch-workspace", jwtUserAuthMiddleware, async (req: Request, res: Response) => {
  const { tenantId, workspacePassword, organizationId } = req.body;

  if (!tenantId || typeof tenantId !== "string") {
    return res.status(400).json({
      error: "TENANT_ID_REQUIRED",
      message: "Target tenantId is required to switch workspaces.",
    });
  }

  const cleanTenantId = tenantId.toLowerCase().trim();

  try {
    const jwtSecret = getRequiredEnv("JWT_SECRET");
    await initMasterDb();
    const targetTenant = await TenantMasterModel.findOne({ tenantId: cleanTenantId }).lean();

    if (!targetTenant) {
      return res.status(404).json({
        error: "TENANT_NOT_FOUND",
        message: `Workspace '${cleanTenantId}' not found.`,
      });
    }

    if (targetTenant.passwordHash) {
      if (!workspacePassword) {
        return res.status(401).json({
          error: "WORKSPACE_PASSWORD_REQUIRED",
          message: `Workspace '${targetTenant.name}' is password-protected. Please enter the workspace password.`,
          isPasswordProtected: true,
          tenantId: cleanTenantId,
        });
      }

      const isValid = verifyWorkspacePassword(String(workspacePassword), targetTenant.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          error: "INVALID_WORKSPACE_PASSWORD",
          message: "Incorrect workspace password. Access denied.",
          isPasswordProtected: true,
          tenantId: cleanTenantId,
        });
      }
    }

    const ctx = getTenantContext();
    const org = organizationId || `org_${cleanTenantId}`;
    const email = ctx.userEmail || "admin@acme.com";
    const sub = ctx.userId || `user_${Date.now()}`;
    const role = (ctx.role as "OWNER" | "ADMIN" | "FINANCE_OPERATOR" | "AUDITOR") || "ADMIN";

    const token = jwt.sign(
      {
        sub,
        email,
        tenantId: cleanTenantId,
        organizationId: org,
        role,
      },
      jwtSecret,
      { expiresIn: "8h" }
    );

    return res.json({
      success: true,
      message: `Switched active JWT scope to workspace '${cleanTenantId}'.`,
      token,
      activeWorkspace: {
        ...targetTenant,
        homeState: normalizeHomeState(targetTenant.homeState),
        isPasswordProtected: Boolean(targetTenant.passwordHash),
        passwordHash: undefined,
      },
      user: {
        email,
        name: "TeamNova Admin",
        tenantId: cleanTenantId,
        organizationId: org,
        role,
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    console.error("Workspace switch error:", message);
    return res.status(500).json({ error: "WORKSPACE_SWITCH_FAILED", message });
  }
});
