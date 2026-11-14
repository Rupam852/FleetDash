# 🔒 LedgerGuard: Distributed Locks & ACID Rollback Engine

**Maintainer:** Subhankari Mondal  
**Role:** Distributed Systems & Locks Specialist  
**Branch:** `subhankari-mondal`  

---

## 🎯 Domain Overview

This module guarantees financial integrity across the LedgerGuard platform. By integrating Redis-based distributed locking (Redlock algorithm with fencing tokens) and MongoDB multi-document ACID transactions, it completely eliminates race conditions, double-spending, and partial state corruption.

### Key Components:
1. `RedisConnectionManager`: Robust connection manager with automatic retry backoff.
2. `DistributedLockManager`: Atomic Redis lock acquisition with unique fencing tokens and safe Lua release scripts.
3. `AcidTransactionManager`: Multi-document ACID transaction wrapper (`session.withTransaction()`).
4. `IdempotentLedgerService`: Double-checked idempotency caching preventing repeat billing calls.
5. `RollbackSimulator`: Chaos failure injection engine validating instant rollbacks during mid-flight timeouts.

---

## 🏃 Running Benchmarks

```bash
npm run benchmark:locks
```
Simulates 200 concurrent transactions competing for the same account and verifies 100% mutual exclusion with zero double-billing.
