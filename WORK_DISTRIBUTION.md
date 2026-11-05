# 📋 FleetDash - Official Team Work Distribution Document

> **Infotact Solutions Internship Project 1 (Month 1 Cycle)**\
> **Repository:** <https://github.com/Rupam852/FleetDash>\
> **Compliance:** Infotact Project Execution Handbook V2.0

------------------------------------------------------------------------

## 1. Team Hierarchy, Contact Details & Roles

  ----------------------------------------------------------------------------------------------------------------------
  Member Name    Role &           GitHub Username       Email                         Mobile No    Dedicated Branch & Directory
                 Specialization                                                                    
  -------------- ---------------- --------------------- ----------------------------- ------------ ---------------------
  **Rupam        **Team Lead,     `Rupam852`            `rupambairagya08@gmail.com`   +91 9477098726   `rupam-bairagya` *(Lead
  Bairagya**     Frontend &                                                                             Integration)*
  *(Team Lead)*  Canvas Viewport                                                                   
                 Engineer**                                                                        

  **Anish Das**  **Backend        `Anish061106`         `dasanish157@gmail.com`       +91 95647 64694   `anish-das`
                 Infrastructure &                                                                  
                 Ingestion                                                                         
                 Engineer**                                                                        

  **Subhankari   **Backend &      `subhankarim303-wq`   `subhankarim303@gmail.com`    +91 6297754704    `subhankari-mondal`
  Mondal**       Geospatial Logic                                                                  
                 Engineer**                                                                        

  **Mistu        **Database &     `mamma30y`            `mammamroy75@gmail.com`       +91 6291034314   `mistu-naskar`
  Naskar**       Storage                                                                   
                 Engineer**                                                                        
  ----------------------------------------------------------------------------------------------------------------------
  

### Role clarification

-   **Rupam** will lead the team and personally handle the React
    frontend, dashboard UI, Canvas viewport, frontend integration, and
    overall project coordination (Directory: `rupam-bairagya`).
-   **Anish** will take over the backend infrastructure, Express server,
    Node.js `worker_threads` coordinate-parsing pool, k6 load testing, and
    ingestion-engine implementation (Directory: `anish-das`).
-   **Subhankari** will take over the Redis messaging, geospatial rules,
    Turf.js boundary checks, geofencing, and alert logic (Directory:
    `subhankari-mondal`).
-   **Mistu** remains responsible for MongoDB schemas, storage
    optimization, and telemetry history (Directory: `mistu-naskar`).

------------------------------------------------------------------------

## 2. Week-Wise Task Allocation Matrix

### Week 1: Architecture, Schemas & UI Scaffolding (5th Nov -- 11th Nov)

-   **Rupam (Team Lead + Frontend):**
    -   Scaffold the React 18 + Vite + TypeScript frontend application.
    -   Build the enterprise dashboard layout, header navigation,
        sidebar, and telemetry KPI metric cards.
    -   Define frontend component structure and coordinate API contracts
        with backend members.
-   **Anish Das (Backend Infrastructure):**
    -   Scaffold the project monorepo with strict TypeScript
        configuration (zero `any` policy).
    -   Build the Express.js server and initialize the Node.js
        `worker_threads` coordinate-parsing pool.
    -   Prepare the initial telemetry ingestion pipeline structure.
-   **Mistu Naskar (Database & Storage):**
    -   Design MongoDB schemas implementing the **Time-Series Bucket
        Pattern**.
    -   Group high-frequency telemetry samples into hourly document
        arrays.
-   **Subhankari Mondal (Backend & Geospatial):**
    -   Model geospatial boundary zones (GeoJSON Polygons for Logistics
        Depots & Restricted Hubs).
    -   Configure environment secrets and message-broker configuration
        structure.

------------------------------------------------------------------------

### Week 2: High-Throughput Ingestion, Caching & Binary Transport (12th Nov -- 18th Nov)

-   **Rupam (Team Lead + Frontend):**
    -   Scaffold the Socket.IO client connection and connect it to the
        dashboard.
    -   Implement the custom `useBinaryTelemetry` hook to receive and
        decode compact `ArrayBuffer` payloads.
    -   Display incoming vehicle telemetry in the frontend using a clear
        loading, empty, and error state.
-   **Anish Das (Backend Infrastructure):**
    -   Create and execute `k6` load-testing scripts targeting the
        planned **2,000 req/sec** throughput.
    -   Verify telemetry ingestion for missing or duplicated records and
        optimize worker concurrency.
    -   Coordinate the ingestion endpoint contract with Subhankari and Mistu.
-   **Mistu Naskar (Database & Storage):**
    -   Implement compound indexes
        `{ vehicleId: 1, bucketStartTime: -1 }` on telemetry
        collections.
    -   Benchmark database queries and work toward the target of
        **sub-5ms** query response times.
-   **Subhankari Mondal (Backend & Geospatial):**
    -   Configure Redis Pub/Sub channels (`telemetry:stream`,
        `telemetry:alerts`) to decouple ingestion from client
        notifications.
    -   Integrate the binary-buffer packaging pipeline with the backend
        messaging flow.

> **🎯 Mid-Project Review Window (20th -- 27th Nov):** \* Demonstrate
> the Week 1 and Week 2 implementations. \* Show frontend, backend API,
> and database integration. \* Demonstrate live telemetry delivery where
> implemented. \* Present measured load-test and database benchmark
> results; do not claim targets that have not been tested. \* Ensure
> every active member has meaningful commits on their own branch and the
> team meets the applicable commit-day requirement.

------------------------------------------------------------------------

### Week 3: Geospatial Rules, Geofencing & 60 FPS Canvas (19th Nov -- 25th Nov)

-   **Rupam (Team Lead + Frontend):**
    -   Build the custom HTML5 Canvas 2D viewport driven by
        `requestAnimationFrame`.
    -   Decouple high-frequency coordinate rendering from React state.
    -   Implement vehicle rendering, selection, and basic viewport
        interaction; profile performance and work toward the **60 FPS**
        target.
-   **Anish Das (Backend Infrastructure):**
    -   Integrate the worker-based ingestion pipeline with the database
        and backend event flow.
    -   Implement the live system metrics API (`/api/v1/metrics`).
    -   Support end-to-end integration and investigate ingestion or
        streaming bottlenecks.
-   **Mistu Naskar (Database & Storage):**
    -   Implement high-performance bulk write operations (`bulkWrite`)
        for hourly buckets.
    -   Build the vehicle history retrieval API
        (`/api/v1/telemetry/history/:vehicleId`).
-   **Subhankari Mondal (Backend & Geospatial):**
    -   Implement backend boundary-intersection checks using **Turf.js**
        (`@turf/boolean-point-in-polygon`).
    -   Build state-transition logic to trigger alert payloads on
        geofence breaches.

------------------------------------------------------------------------

### Week 4: Testing, Hardening, Polish & Final Review (26th Nov -- 4th Dec)

-   **Rupam (Team Lead + Frontend):**
    -   Build the real-time geofence alert drawer with clear breach
        indicators and alert details.
    -   Implement interactive viewport pan/zoom controls and
        vehicle-selection inspection cards.
    -   Coordinate final frontend/backend integration, end-to-end
        testing, and the Final Project Demo.
-   **Anish Das (Backend Infrastructure):**
    -   Set up the GitHub Actions CI workflow
        (`.github/workflows/ci.yml`) for automated checks.
    -   Conduct backend ingestion stress tests and fix worker or API
        bottlenecks.
    -   Document backend setup, environment variables, and ingestion
        flow.
-   **Mistu Naskar (Database & Storage):**
    -   Optimize MongoDB connection pooling (target `maxPoolSize: 50`,
        subject to testing).
    -   Test database failure handling and complete schema documentation
        and benchmarking reports.
-   **Subhankari Mondal (Backend & Geospatial):**
    -   Implement speed-violation logic within geofences (over-speed
        alerts).
    -   Write unit and integration tests using Jest and Supertest for
        assigned backend modules.

> **🎯 Final Project Review Window (5th -- 10th Dec):** \* Demonstrate
> the complete end-to-end working system. \* Show live vehicle updates,
> geofence alerts, and vehicle history. \* Present measured viewport and
> backend performance results. \* Ensure the required daily team
> repository activity and individual branch contributions are genuine
> and verifiable.

------------------------------------------------------------------------

## 3. GitHub Branch & Commit Protocol

As mandated by Infotact Solutions:

1.  **Dedicated Branches:** Each member commits their own work to their
    designated branch:

    -   Rupam Bairagya ➔ `rupam-bairagya`
    -   Anish Das ➔ `anish-das`
    -   Mistu Naskar ➔ `mistu-naskar`
    -   Subhankari Mondal ➔ `subhankari-mondal`
    -   Lead Integration ➔ `main` (review, merge, and progress tracking
        by Rupam)

2.  **Commit Attribution:** All commits must use the respective member's
    verified Git name and email matching their GitHub account.

3.  **Commit Quality:** Every commit must contain genuine code changes,
    documentation updates, configuration changes, assets, or test cases.
    Empty, duplicate, or meaningless commits are not acceptable.

4.  **Pull Request & Integration Workflow:**

    -   Each member pushes completed work to their own branch.
    -   Rupam reviews the changes and coordinates integration into
        `main`.
    -   Resolve merge conflicts carefully and run relevant tests before
        merging.
    -   Do not commit code under another member's identity.

5.  **Communication:** Members should share progress, blockers, and
    completed tasks with the team regularly. If a task is delayed,
    inform the team early so work can be reassigned without waiting
    until the review.

------------------------------------------------------------------------

**Note:** This document updates the responsibility allocation only. The
team should confirm the revised assignments with all members and the
internship mentor before treating this as the approved official
distribution.
