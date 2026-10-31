# 📋 FleetDash - Official Team Work Distribution Document
> **Infotact Solutions Internship Project 1 (Month 1 Cycle)**  
> **Repository:** [https://github.com/Rupam852/FleetDash](https://github.com/Rupam852/FleetDash)  
> **Compliance:** Infotact Project Execution Handbook V2.0 (Section 9 & Section 10)

---

## 1. Team Hierarchy, Contact Details & Roles

| Member Name | Role & Specialization | GitHub Username | Email | Mobile No | Dedicated Branch |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rupam Bairagya** *(Lead)* | **Team Lead & Systems Architect** | `Rupam852` | `rupambairagya08@gmail.com` | +91 9477098726 | `member-rupam` *(Main: Integration)* |
| **Anish Das** | **Backend & Geospatial Logic Engineer** | `Anish061106` | `dasanish157@gmail.com` | +91 95647 64694 | `member-anish` |
| **Subhankari Mondal** | **Frontend & Canvas Viewport Engineer** | `subhankarim303-wq` | `subhankarim303@gmail.com` | +91 62977 54704 | `member-subhankari` |
| **Mistu Naskar** | **Database & Storage Engineer** | `mamma30y` | `mammamroy75@gmail.com` | +91 62910 34314 | `member-mistu` |

---

## 2. Week-Wise Task Allocation Matrix

### Week 1: Architecture, Schemas & UI Scaffolding (5th Nov – 11th Nov)
* **Rupam (Lead):**
  * Scaffold monorepo with strict TypeScript configuration (zero `any` policy).
  * Build Express.js server and initialize Node.js `worker_threads` coordinate parsing pool.
* **Mistu Naskar:**
  * Design MongoDB schemas implementing the **Time-Series Bucket Pattern**.
  * Group high-frequency telemetry samples into hourly document arrays.
* **Anish Das:**
  * Model geospatial boundary zones (GeoJSON Polygons for Logistics Depots & Restricted Hubs).
  * Configure environment secrets and message broker configuration structure.
* **Subhankari Mondal:**
  * Scaffold React 18 + Vite + TypeScript frontend application.
  * Construct enterprise dashboard layout, header navigation, and telemetry KPI metric cards.

---

### Week 2: High-Throughput Ingestion, Caching & Binary Transport (12th Nov – 18th Nov)
* **Rupam (Lead):**
  * Create and execute `k6` load-testing scripts demonstrating **2,000 req/sec** sustained throughput.
  * Verify zero data omission and optimize ingestion worker concurrency.
* **Mistu Naskar:**
  * Implement compound indexes `{ vehicleId: 1, bucketStartTime: -1 }` on telemetry collections.
  * Conduct index benchmark proving **sub-5ms query response times**.
* **Anish Das:**
  * Deploy Redis Pub/Sub cluster channels (`telemetry:stream`, `telemetry:alerts`) to decouple ingestion.
  * Integrate binary buffer packaging pipeline.
* **Subhankari Mondal:**
  * Connect Socket.io client layer to receive high-frequency feeds.
  * Implement custom `useBinaryTelemetry` hook decoding compact `ArrayBuffer` payloads.

> **🎯 Mid-Project Review Window (20th – 27th Nov):**
> * Verified database queries under 5ms.
> * Demonstrated 2,000 req/sec ingestion with zero data omission.
> * Minimum 10 distinct commit days verified across team branches.

---

### Week 3: Geospatial Rules, Geofencing & 60 FPS Canvas (19th Nov – 25th Nov)
* **Rupam (Lead):**
  * Coordinate end-to-end integration between worker ingestion, database, and client WebSocket streams.
  * Implement live system metrics API (`/api/v1/metrics`).
* **Mistu Naskar:**
  * Implement high-performance bulk write operations (`bulkWrite`) for hourly buckets.
  * Build vehicle history retrieval API (`/api/v1/telemetry/history/:vehicleId`).
* **Anish Das:**
  * Implement backend boundary intersection checks using **Turf.js** (`@turf/boolean-point-in-polygon`).
  * Build state transition logic to trigger instant alert payloads on geofence breaches.
* **Subhankari Mondal:**
  * Build custom HTML5 Canvas 2D engine driven by `requestAnimationFrame`.
  * Decouple coordinate rendering from React state to achieve a **steady 60 FPS** under 5,000 vehicles.

---

### Week 4: Testing, Hardening, Polish & Final Review (26th Nov – 4th Dec)
* **Rupam (Lead):**
  * Setup automated CI/CD pipeline via GitHub Actions (`.github/workflows/ci.yml`).
  * Conduct final end-to-end system stress tests and coordinate the Final Project Demo.
* **Mistu Naskar:**
  * Optimize MongoDB connection pooling (maxPoolSize: 50) and test database failover resilience.
  * Complete database schema documentation and benchmarking reports.
* **Anish Das:**
  * Implement speed violation algorithms within geofences (over-speed alerts).
  * Write unit & integration tests using Jest and Supertest.
* **Subhankari Mondal:**
  * Build real-time Geofence alert drawer with audio-visual breach flash animations.
  * Implement interactive viewport pan/zoom controls and vehicle selection inspect cards.

> **🎯 Final Project Review Window (5th – 10th Dec):**
> * Full end-to-end working demonstration.
> * Steady 60 FPS viewport processing thousands of objects simultaneously.
> * Minimum 20 commit days verified across the review period (zero gaps).

---

## 3. GitHub Branch & Commit Protocol

As mandated by Infotact Solutions:
1. **Dedicated Branches:** Each member commits strictly to their designated branch:
   * Rupam Bairagya ➔ `member-rupam`
   * Anish Das ➔ `member-anish`
   * Mistu Naskar ➔ `member-mistu`
   * Subhankari Mondal ➔ `member-subhankari`
   * Lead Integration ➔ `main` (Merge & Tracking)
2. **Commit Attributions:** All commits must carry the respective member's verified Git name and email matching their GitHub account.
3. **Commit Quality:** Every commit must contain genuine code changes, documentation updates, or test cases. Empty or single-character commits are strictly disallowed.

