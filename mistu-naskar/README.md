# 🗄️ LedgerGuard: Database Isolation & Multi-Tenant Engine

**Maintainer:** Mistu Naskar  
**Role:** Database Isolation Specialist  
**Branch:** `mistu-naskar`  

---

## 🎯 Domain Overview

The Database Isolation module provides the core data layer for LedgerGuard. It is responsible for dynamically provisioning, caching, and evicting tenant-specific MongoDB database connections, guaranteeing zero cross-tenant contamination.

### Core Components:
1. `TenantDatabaseManager`: Central singleton factory managing dynamic Mongoose connection pools per tenant.
2. `TenantModel` & `OrganizationModel`: Master catalog schemas managing tenant tiers and asymmetric RSA public keys.
3. `InvoiceModel` & `UsageQuotaModel`: Tenant-isolated models instantiated exclusively within tenant-scoped database connections.
4. `UsageAggregationService`: High-performance MongoDB aggregation pipelines computing financial and resource metrics.

---

## 🏃 Running Benchmarks

```bash
npm run benchmark:db
```
Demonstrates sub-5ms context switching across multiple concurrent tenant database pools.
