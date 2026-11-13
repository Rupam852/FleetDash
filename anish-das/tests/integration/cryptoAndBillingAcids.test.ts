import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import crypto from "node:crypto";
import request from "supertest";
import { InMemoryInfra } from "../helpers/mockInfra.js";

process.env.JWT_SECRET = "test_jwt_secret_ledgerguard_2026_crypto";
process.env.DEFAULT_ADMIN_PASSWORD = "AdminTestPassword#1";
process.env.MASTER_ADMIN_PIN = "123456";
process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
process.env.MONGODB_BASE_URI = "mongodb+srv://user:pass@mock-cluster.mongodb.net";

const infra = new InMemoryInfra();

jest.unstable_mockModule("../../src/config/db.js", () => infra.buildMocks());

const { app } = await import("../../src/app.js");

function generateRsaPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const fingerprint = `SHA256:${crypto.createHash("sha256").update(publicKey).digest("hex").slice(0, 32)}`;
  return { publicKey, privateKey, fingerprint };
}

function signPayload(privateKeyPem: string, rawBody: string): string {
  const signer = crypto.createSign("SHA256");
  signer.update(rawBody);
  signer.end();
  return signer.sign(privateKeyPem, "base64");
}

describe("RSA-256 Verification, Redlock Idempotency, ACID Rollbacks & Analytics Pipelines", () => {
  const rsa = generateRsaPair();
  let alphaToken = "";

  beforeEach(async () => {
    infra.reset();
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
    await mocks.TenantMasterModel.create({
      tenantId: "gamma_corp",
      name: "Gamma Industries",
      subdomain: "gamma_corp.ledgerguard.io",
      databaseName: "ledgerguard_tenant_gamma_corp",
      tier: "GROWTH",
      status: "ACTIVE",
      homeState: "Maharashtra (27)",
      passwordHash: null,
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "ops@alpha.io", tenantId: "alpha_corp" });
    alphaToken = loginRes.body.token;
  });

  function postSigned(path: string, bodyObj: Record<string, unknown>, tenantId = "alpha_corp") {
    const rawBody = JSON.stringify(bodyObj);
    const sig = signPayload(rsa.privateKey, rawBody);
    return request(app)
      .post(path)
      .set("Authorization", `Bearer ${alphaToken}`)
      .set("X-Tenant-ID", tenantId)
      .set("Content-Type", "application/json")
      .set("X-Signature-SHA256", sig)
      .set("X-Public-Key", Buffer.from(rsa.publicKey).toString("base64"))
      .set("X-Key-Fingerprint", rsa.fingerprint)
      .send(rawBody);
  }

  it("enforces RSA-256 Zero-Knowledge signatures on mutating billing requests", async () => {
    // 1. Missing headers -> 400
    const missingSigRes = await request(app)
      .post("/api/v1/billing/charge")
      .set("Authorization", `Bearer ${alphaToken}`)
      .set("X-Tenant-ID", "alpha_corp")
      .send({ idempotencyKey: "idem_nosig", amountCents: 10000 });

    expect(missingSigRes.status).toBe(400);
    expect(missingSigRes.body.error).toBe("MISSING_ZERO_KNOWLEDGE_SIGNATURE");

    // 2. Signature generated for payload A, sent with tampered payload B -> 401
    const originalBody = JSON.stringify({ idempotencyKey: "idem_tamper", amountCents: 10000 });
    const tamperedBody = JSON.stringify({ idempotencyKey: "idem_tamper", amountCents: 999999 });
    const sigForOriginal = signPayload(rsa.privateKey, originalBody);

    const tamperedRes = await request(app)
      .post("/api/v1/billing/charge")
      .set("Authorization", `Bearer ${alphaToken}`)
      .set("X-Tenant-ID", "alpha_corp")
      .set("Content-Type", "application/json")
      .set("X-Signature-SHA256", sigForOriginal)
      .set("X-Public-Key", Buffer.from(rsa.publicKey).toString("base64"))
      .send(tamperedBody);

    expect(tamperedRes.status).toBe(401);
    expect(tamperedRes.body.error).toBe("CRYPTOGRAPHIC_SIGNATURE_INVALID");
  });

  it("commits ACID invoice + audit log once, enforces Redis idempotency cache & Redlock contention, and isolates tenant DBs", async () => {
    const payload = {
      idempotencyKey: "idem_acid_1001",
      amountCents: 250000,
      quantity: 2,
      customerId: "cust_wb_1",
      customerName: "Bengal Retail Pvt Ltd",
      customerEmail: "accounts@bengalretail.in",
      placeOfSupply: "West Bengal (19)",
      description: "Enterprise Plan Q3",
      isGstApplicable: true,
    };

    const firstRes = await postSigned("/api/v1/billing/charge", payload);
    expect(firstRes.status).toBe(201);
    expect(firstRes.headers["x-crypto-verified"]).toBe("true");
    expect(firstRes.body.status).toBe("COMMITTED");
    expect(firstRes.body.invoice.sellerState).toBe("West Bengal (19)");
    expect(firstRes.body.invoice.supplyType).toBe("INTRA_STATE");
    expect(firstRes.body.invoice.unitPriceCents).toBe(125000);

    // Multi-document ACID verification: 1 Invoice AND 1 INVOICE_COMMITTED AuditLog in alpha_corp, 0 in gamma_corp
    const alphaStore = infra.getTenantStore("alpha_corp");
    const gammaStore = infra.getTenantStore("gamma_corp");
    expect(alphaStore.invoices).toHaveLength(1);
    expect(alphaStore.auditLogs).toHaveLength(1);
    expect(alphaStore.auditLogs[0].eventType).toBe("INVOICE_COMMITTED");
    expect(gammaStore.invoices).toHaveLength(0);

    // Replay same idempotencyKey -> 200 ALREADY_PROCESSED (no second invoice created)
    const duplicateRes = await postSigned("/api/v1/billing/charge", payload);
    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.status).toBe("ALREADY_PROCESSED");
    expect(duplicateRes.body.invoice.invoiceNumber).toBe(firstRes.body.invoice.invoiceNumber);
    expect(alphaStore.invoices).toHaveLength(1);

    // Pre-occupied Redlock for another customer contention test -> 429 LOCK_CONTENTION
    infra.redisStore.set("lock:tenant:alpha_corp:cust_locked_99", "external-owner-token");
    const lockedRes = await postSigned("/api/v1/billing/charge", {
      idempotencyKey: "idem_locked_99",
      amountCents: 50000,
      customerId: "cust_locked_99",
    });
    expect(lockedRes.status).toBe(429);
    expect(lockedRes.body.error).toBe("LOCK_CONTENTION");
    // Must NOT delete another owner's Redlock fencing token!
    expect(infra.redisStore.get("lock:tenant:alpha_corp:cust_locked_99")).toBe("external-owner-token");
  });

  it("blocks charges on suspended workspaces with 403 WORKSPACE_SUSPENDED", async () => {
    const suspendRes = await request(app)
      .put("/api/v1/tenants/alpha_corp")
      .set("Authorization", `Bearer ${alphaToken}`)
      .send({ status: "SUSPENDED", adminPin: "123456" });
    expect(suspendRes.status).toBe(200);

    const chargeRes = await postSigned("/api/v1/billing/charge", {
      idempotencyKey: "idem_suspended_block",
      amountCents: 50000,
    });
    expect(chargeRes.status).toBe(403);
    expect(chargeRes.body.error).toBe("WORKSPACE_SUSPENDED");
  });

  it("aborts staged transaction on mid-flight chaos fault, purges uncommitted docs, and records void receipt", async () => {
    const res = await postSigned("/api/v1/billing/simulate-rollback", {
      amountCents: 185000,
      customerEmail: "chaos@alpha.io",
      description: "Automated Resilience Check",
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ROLLED_BACK");
    expect(res.body.audit.redisLockAcquired).toBe(true);
    expect(res.body.audit.redisLockReleased).toBe(true);
    expect(res.body.audit.mongoTransactionAborted).toBe(true);
    expect(res.body.audit.stagedTxPurged).toBe(true);
    expect(res.body.audit.amountDebitedCents).toBe(0);
    expect(res.body.invoice.status).toBe("ROLLED_BACK");

    // Verify no PENDING staged invoice remains and only TRANSACTION_ABORTED receipt was committed
    const alphaStore = infra.getTenantStore("alpha_corp");
    expect(alphaStore.invoices.some((i) => i.status === "PENDING")).toBe(false);
    expect(alphaStore.auditLogs.some((a) => a.eventType === "TRANSACTION_STAGED")).toBe(false);
    expect(alphaStore.auditLogs.some((a) => a.eventType === "TRANSACTION_ABORTED")).toBe(true);
  });

  it("supports public QR invoice verification and atomic ACID invoice deletion + analytics aggregation", async () => {
    const committedRes = await postSigned("/api/v1/billing/charge", {
      idempotencyKey: "idem_public_verify",
      amountCents: 300000,
      customerId: "cust_mh_1",
      customerEmail: "buyer@mumbai.in",
      placeOfSupply: "Maharashtra (27)",
      isGstApplicable: true,
    });
    expect(committedRes.status).toBe(201);
    expect(committedRes.body.invoice.supplyType).toBe("INTER_STATE");
    const invNum: string = committedRes.body.invoice.invoiceNumber;

    // Public unauthenticated QR verify works without Bearer token
    const verifyRes = await request(app).get(`/api/v1/billing/public/verify/${invNum}?tenant=alpha_corp`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.status).toBe("AUTHENTIC_VERIFIED");
    expect(verifyRes.body.isAuthentic).toBe(true);
    expect(verifyRes.body.securitySeal.cryptographicProof).toBe("ZERO_KNOWLEDGE_VERIFIED");

    // Analytics reflects the committed invoice accurately
    const usageRes = await request(app)
      .get("/api/v1/analytics/usage")
      .set("Authorization", `Bearer ${alphaToken}`)
      .set("X-Tenant-ID", "alpha_corp");
    expect(usageRes.status).toBe(200);
    expect(usageRes.body.metrics.totalRevenueCents).toBe(300000);
    expect(usageRes.body.metrics.committedTransactions).toBe(1);
    expect(usageRes.body.topCustomers[0].email).toBe("buyer@mumbai.in");

    const fleetRes = await request(app)
      .get("/api/v1/analytics/fleet-cluster")
      .set("Authorization", `Bearer ${alphaToken}`);
    expect(fleetRes.status).toBe(200);
    expect(fleetRes.body.totalTenants).toBe(2);
    expect(fleetRes.body.totalClusterInvoices).toBe(1);
    expect(fleetRes.body.totalClusterRevenueRupees).toBe("3000.00");

    // Signed DELETE removes invoice atomically, logs INVOICE_DELETED, and clears Redis idempotency cache
    const deleteSig = signPayload(rsa.privateKey, "");
    const deleteRes = await request(app)
      .delete(`/api/v1/billing/invoices/${invNum}`)
      .set("Authorization", `Bearer ${alphaToken}`)
      .set("X-Tenant-ID", "alpha_corp")
      .set("X-Signature-SHA256", deleteSig)
      .set("X-Public-Key", Buffer.from(rsa.publicKey).toString("base64"));

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.status).toBe("DELETED");
    expect(infra.getTenantStore("alpha_corp").invoices).toHaveLength(0);
    expect(infra.getTenantStore("alpha_corp").auditLogs.some((a) => a.eventType === "INVOICE_DELETED")).toBe(true);
    expect(infra.redisStore.has("idempotency:alpha_corp:idem_public_verify")).toBe(false);

    // Public verify after delete returns 404
    const postDeleteVerify = await request(app).get(`/api/v1/billing/public/verify/${invNum}`);
    expect(postDeleteVerify.status).toBe(404);
  });
});

