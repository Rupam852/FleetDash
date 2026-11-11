import axios from "axios";
import { RsaCryptoHelper } from "../crypto/rsaHelper.js";

// Dynamically use current hostname so both localhost and mobile LAN work seamlessly
const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
export const API_BASE_URL = `http://${hostname}:5000/api/v1`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject active tenant header, JWT token, and RSA-256 Zero-Knowledge signatures
apiClient.interceptors.request.use(async (config) => {
  const currentTenant = localStorage.getItem("ledgerguard_active_tenant") || "acme_corp";
  const token = localStorage.getItem("ledgerguard_auth_token");

  config.headers["X-Tenant-ID"] = currentTenant;
  config.headers["X-Org-ID"] = `org_${currentTenant}`;

  const existingAuth = config.headers["Authorization"] || config.headers["authorization"];
  if (token && !existingAuth) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  const urlPath = config.url || "";
  const method = (config.method || "get").toLowerCase();
  const isBillingMutation =
    ["post", "put", "patch", "delete"].includes(method) &&
    urlPath.includes("/billing") &&
    !urlPath.includes("/billing/public");

  if (isBillingMutation && typeof window !== "undefined") {
    const keyPair = await RsaCryptoHelper.getOrCreateWorkspaceKeyPair(currentTenant);
    let rawPayload = "";
    if (config.data !== undefined && config.data !== null) {
      rawPayload = typeof config.data === "string" ? config.data : JSON.stringify(config.data);
      config.data = rawPayload;
    }

    const signature = await RsaCryptoHelper.signRawString(keyPair.privateKeyPem, rawPayload);
    config.headers["X-Signature-SHA256"] = signature;
    config.headers["X-Public-Key"] = btoa(keyPair.publicKeyPem);
    config.headers["X-Key-Fingerprint"] = keyPair.keyFingerprint;
  }

  return config;
});
