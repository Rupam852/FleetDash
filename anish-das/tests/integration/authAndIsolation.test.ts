import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import { InMemoryInfra } from "../helpers/mockInfra.js";

process.env.JWT_SECRET = "test_jwt_secret_ledgerguard_2026_isolated";
process.env.DEFAULT_ADMIN_PASSWORD = "AdminTestPassword#1";
process.env.MASTER_ADMIN_PIN = "123456";
process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
process.env.MONGODB_BASE_URI = "mongodb+srv://user:pass@mock-cluster.mongodb.net";

const infra = new InMemoryInfra();

jest.unstable_mockModule("../../src/config/db.js", () => infra.buildMocks());

const { app } = await import("../../src/app.js");

describe("Auth Gateway, Multi-Tenant Isolation & Tenant Lifecycle API", () => {
  beforeEach(() => {
    infra.reset();
  });

  it("returns 200 healthy telemetry with sanitized cloud hostnames", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("HEALTHY");
    expect(res.body.cloudTelemetry.mongoAtlas.cluster).toBe("mock-cluster.mongodb.net");
    expect(res.body.cloudTelemetry.upstashRedis.endpoint).toBe("mock-redis.upstash.io");
  });

  it("blocks unauthenticated requests across protected tenant, billing, and analytics routes", async () => {
    const [tenantsRes, billingRes, analyticsRes] = await Promise.all([
      request(app).get("/api/v1/tenants"),
      request(app).get("/api/v1/billing/invoices").set("X-Tenant-ID", "acme_corp"),
      request(app).get("/api/v1/analytics/usage").set("X-Tenant-ID", "acme_corp"),
    ]);

    expect(tenantsRes.status).toBe(401);
    expect(tenantsRes.body.error).toBe("UNAUTHORIZED");
    expect(billingRes.status).toBe(401);
    expect(analyticsRes.status).toBe(401);
  });

  it("issues an onboarding token when zero workspaces exist and blocks cross-tenant access with it", async () => {
    const badLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@ledgerguard.io", password: "WrongPassword" });
    expect(badLogin.status).toBe(401);
    expect(badLogin.body.error).toBe("INVALID_CREDENTIALS");

    const onboardingLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@ledgerguard.io", password: "AdminTestPassword#1" });
    expect(onboardingLogin.status).toBe(200);
    expect(onboardingLogin.body.requiresCreation).toBe(true);
    expect(onboardingLogin.body.sessionToken).toBeTruthy();

    // Onboarding token has tenantId="*" and scope="WORKSPACE_ONBOARDING"; must NOT bypass tenant isolation!
    const blockedBilling = await request(app)
      .get("/api/v1/billing/invoices")
      .set("Authorization", `Bearer ${onboardingLogin.body.sessionToken}`)
      .set("X-Tenant-ID", "acme_corp");

    expect(blockedBilling.status).toBe(403);
    expect(blockedBilling.body.error).toBe("FORBIDDEN_CROSS_TENANT_ATTEMPT");

    // Can use onboarding token to provision the first workspace cleanly
    const provisionRes = await request(app)
      .post("/api/v1/tenants/provision")
      .set("Authorization", `Bearer ${onboardingLogin.body.sessionToken}`)
      .send({
        tenantId: "acme_corp",
        name: "Acme Corporation",
        homeState: "Maharashtra (27)",
        workspacePassword: "AcmeLock!99",
      });

    expect(provisionRes.status).toBe(201);
    expect(provisionRes.body.tenant.tenantId).toBe("acme_corp");
    expect(provisionRes.body.tenant.homeState).toBe("Maharashtra (27)");
    expect(provisionRes.body.tenant.isPasswordProtected).toBe(true);
    expect(provisionRes.body.tenant.passwordHash).toBeUndefined();
  });

  it("enforces workspace passcodes and strict cross-tenant JWT claims + workspace switching", async () => {
    const mocks = infra.buildMocks();
    await mocks.TenantMasterModel.create({
      tenantId: "alpha_corp",
      name: "Alpha Enterprises",
      subdomain: "alpha_corp.ledgerguard.io",
      databaseName: "ledgerguard_tenant_alpha_corp",
      tier: "ENTERPRISE",
      status: "ACTIVE",
      homeState: "West Bengal (19)",
      passwordHash: null,
    });

    // Single unlocked workspace -> auto login directly to alpha_corp
    const singleLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "finance@alpha.io", password: "AdminTestPassword#1" });
    expect(singleLogin.status).toBe(200);
    expect(singleLogin.body.token).toBeTruthy();
    expect(singleLogin.body.activeWorkspace.tenantId).toBe("alpha_corp");

    const alphaToken: string = singleLogin.body.token;

    // Provision second locked workspace beta_corp using alphaToken
    const createBeta = await request(app)
      .post("/api/v1/tenants/provision")
      .set("Authorization", `Bearer ${alphaToken}`)
      .send({
        tenantId: "beta_corp",
        name: "Beta Fintech Pvt Ltd",
        homeState: "Karnataka (29)",
        workspacePassword: "BetaSecret#42",
      });
    expect(createBeta.status).toBe(201);

    // Multi-workspace login without tenantId returns workspace selection list with sanitized passwordHash
    const multiLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "finance@alpha.io", password: "AdminTestPassword#1" });
    expect(multiLogin.status).toBe(200);
    expect(multiLogin.body.requiresSelection).toBe(true);
    expect(multiLogin.body.availableWorkspaces).toHaveLength(2);
    expect(multiLogin.body.availableWorkspaces[0].passwordHash).toBeUndefined();

    // Cross-tenant attempt: alphaToken cannot read beta_corp invoices or usage analytics
    const crossBilling = await request(app)
      .get("/api/v1/billing/invoices")
      .set("Authorization", `Bearer ${alphaToken}`)
      .set("X-Tenant-ID", "beta_corp");
    expect(crossBilling.status).toBe(403);
    expect(crossBilling.body.error).toBe("FORBIDDEN_CROSS_TENANT_ATTEMPT");

    const crossAnalytics = await request(app)
      .get("/api/v1/analytics/usage")
      .set("Authorization", `Bearer ${alphaToken}`)
      .set("X-Tenant-ID", "beta_corp");
    expect(crossAnalytics.status).toBe(403);
    expect(crossAnalytics.body.error).toBe("FORBIDDEN_CROSS_TENANT_ATTEMPT");

    // Workspace switch rejects missing or invalid workspace password
    const switchMissingPwd = await request(app)
      .post("/api/v1/auth/switch-workspace")
      .set("Authorization", `Bearer ${alphaToken}`)
      .send({ tenantId: "beta_corp" });
    expect(switchMissingPwd.status).toBe(401);
    expect(switchMissingPwd.body.error).toBe("WORKSPACE_PASSWORD_REQUIRED");

    const switchWrongPwd = await request(app)
      .post("/api/v1/auth/switch-workspace")
      .set("Authorization", `Bearer ${alphaToken}`)
      .send({ tenantId: "beta_corp", workspacePassword: "WrongBetaPassword" });
    expect(switchWrongPwd.status).toBe(401);
    expect(switchWrongPwd.body.error).toBe("INVALID_WORKSPACE_PASSWORD");

    // Workspace switch with valid passcode issues fresh beta_corp JWT
    const switchValid = await request(app)
      .post("/api/v1/auth/switch-workspace")
      .set("Authorization", `Bearer ${alphaToken}`)
      .send({ tenantId: "beta_corp", workspacePassword: "BetaSecret#42" });
    expect(switchValid.status).toBe(200);
    expect(switchValid.body.token).toBeTruthy();
    expect(switchValid.body.activeWorkspace.tenantId).toBe("beta_corp");

    const allowedBeta = await request(app)
      .get("/api/v1/billing/invoices")
      .set("Authorization", `Bearer ${switchValid.body.token}`)
      .set("X-Tenant-ID", "beta_corp");
    expect(allowedBeta.status).toBe(200);
    expect(allowedBeta.body.databaseName).toBe("ledgerguard_tenant_beta_corp");
  });

  it("enforces duplicate provisioning conflict, Master Admin PIN on suspend, and root tenant delete protection", async () => {
    const mocks = infra.buildMocks();
    await mocks.TenantMasterModel.create({
      tenantId: "acme_corp",
      name: "Acme Root Corp",
      subdomain: "acme_corp.ledgerguard.io",
      databaseName: "ledgerguard_tenant_acme_corp",
      tier: "ENTERPRISE",
      status: "ACTIVE",
      homeState: "West Bengal (19)",
      passwordHash: null,
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "root@acme.io", password: "AdminTestPassword#1", tenantId: "acme_corp" });
    const rootToken: string = loginRes.body.token;

    // Duplicate provision returns 409 TENANT_EXISTS
    const dupRes = await request(app)
      .post("/api/v1/tenants/provision")
      .set("Authorization", `Bearer ${rootToken}`)
      .send({ tenantId: "acme_corp", name: "Duplicate Acme" });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error).toBe("TENANT_EXISTS");

    // Suspend without PIN returns 401 ADMIN_PIN_REQUIRED; wrong PIN returns 401 INVALID_ADMIN_PIN
    const noPinRes = await request(app)
      .put("/api/v1/tenants/acme_corp")
      .set("Authorization", `Bearer ${rootToken}`)
      .send({ status: "SUSPENDED" });
    expect(noPinRes.status).toBe(401);
    expect(noPinRes.body.error).toBe("ADMIN_PIN_REQUIRED");

    const badPinRes = await request(app)
      .put("/api/v1/tenants/acme_corp")
      .set("Authorization", `Bearer ${rootToken}`)
      .send({ status: "SUSPENDED", adminPin: "999999" });
    expect(badPinRes.status).toBe(401);
    expect(badPinRes.body.error).toBe("INVALID_ADMIN_PIN");

    const validSuspendRes = await request(app)
      .put("/api/v1/tenants/acme_corp")
      .set("Authorization", `Bearer ${rootToken}`)
      .send({ status: "SUSPENDED", adminPin: "123456" });
    expect(validSuspendRes.status).toBe(200);
    expect(validSuspendRes.body.tenant.status).toBe("SUSPENDED");

    // Deleting protected root acme_corp returns 403 ROOT_TENANT_PROTECTED
    const deleteRootRes = await request(app)
      .delete("/api/v1/tenants/acme_corp")
      .set("Authorization", `Bearer ${rootToken}`);
    expect(deleteRootRes.status).toBe(403);
    expect(deleteRootRes.body.error).toBe("ROOT_TENANT_PROTECTED");
  });
});

