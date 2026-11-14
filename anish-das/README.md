# 🌐 LedgerGuard: API Gateway & Cryptographic Routing

**Maintainer:** Anish Das  
**Role:** Backend & API Gateway Lead  
**Branch:** `anish-das`  

---

## 🎯 Domain Overview

The API Gateway is the central entry point for all tenant interactions in LedgerGuard. It handles asymmetric JWT decoding, extracts organization and tenant claims, establishes execution context isolation using Node.js `AsyncLocalStorage`, and verifies RSA-256 payload signatures before dispatching financial operations.

### Key Modules:
1. `tenantContextMiddleware`: Binds `tenantId` and `organizationId` to execution context preventing cross-request pollution.
2. `jwtTenantAuthMiddleware`: Validates asymmetric JWT signatures and enforces strict tenant scope matching.
3. `cryptoVerifierMiddleware`: RSA-256 zero-knowledge signature verification guarding billing endpoints.
4. `billingRouter`: Idempotent billing endpoints with distributed lock orchestration.
5. `tenantsRouter`: Automated enterprise tenant provisioning.

---

## 🏃 Running the Gateway

```bash
npm run dev
```
Starts the API gateway on `http://localhost:5000`.
