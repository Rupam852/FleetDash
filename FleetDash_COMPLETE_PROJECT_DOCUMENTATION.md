# FleetDash --- Complete Project Documentation

**Project:** High-Throughput Event-Driven Fleet Telemetry Dashboard\
**Program:** Infotact Solutions Internship --- Project 1\
**Repository:** https://github.com/Rupam852/FleetDash\
**Team:** Four members\
**Planned cycle in supplied work distribution:** 5 November -- 4
December\
**Status:** Team implementation guide. Proposed interfaces and design
details must be confirmed before implementation.

------------------------------------------------------------------------

## 1. Purpose and source basis

This document combines the supplied FleetDash project brief, the revised
team responsibility allocation, proposed system architecture,
development workflow, API/event contracts, testing plan, and review
preparation.

**Requirements from the supplied Infotact Project PDF** - Real-time
fleet telemetry dashboard. - Node.js `worker_threads` for coordinate
processing. - MongoDB Bucket Pattern for hourly telemetry groups. -
Redis Pub/Sub and Socket.IO for real-time distribution. - Binary
transport / `ArrayBuffer` payloads. - React and HTML5 Canvas with
`requestAnimationFrame`. - Turf.js geospatial boundary checks and
geofence alerts. - Vehicle history, metrics, load testing, automated
checks, and documentation. - Performance goals stated in the brief:
2,000 requests/second, sub-5ms database queries, and 60 FPS viewport
rendering under the specified workloads.

**Revised team allocation used here** - Rupam: Team Lead + Frontend +
Canvas + integration. - Anish: Backend geospatial + Redis messaging +
alerts. - Mistu: Database + storage + telemetry history. - Subhankari:
Backend infrastructure + ingestion + worker threads + load testing +
CI/CD.

The revised allocation reflects the updated work-distribution draft
prepared in this conversation. Confirm it with all members and the
internship mentor. API schemas, event names, folder layout, and some
architecture details below are proposals to agree on---not verbatim
requirements from the supplied PDF.

------------------------------------------------------------------------

## 2. Project overview

### 2.1 Problem statement

Logistics operators need to monitor many vehicles whose GPS coordinates
change frequently. A naive implementation can overload the Node.js main
event loop and freeze the browser when too many DOM elements or React
state updates are used.

FleetDash aims to receive, process, store, distribute, and render
vehicle telemetry efficiently. A fleet manager should be able to view
vehicle positions, inspect vehicle information and history, and receive
alerts when a vehicle crosses a configured geofence.

### 2.2 Main user and use case

**Fleet manager / operations monitor** 1. Opens the FleetDash dashboard.
2. Views current vehicle positions and summary metrics. 3. Selects a
vehicle to inspect its latest details. 4. Reviews vehicle history. 5.
Sees alerts when vehicles enter or leave monitored/restricted zones.

### 2.3 Objectives

1.  Build a usable fleet dashboard.
2.  Accept vehicle telemetry through a backend ingestion API.
3.  Process incoming coordinates without unnecessarily blocking the main
    event loop.
4.  Store telemetry in hourly buckets in MongoDB.
5.  Publish telemetry and alert events through Redis.
6.  Deliver live events to browser clients through Socket.IO.
7.  Render many moving vehicles using Canvas rather than one DOM node
    per vehicle.
8.  Detect geofence transitions using GeoJSON and Turf.js.
9.  Expose system metrics and vehicle history.
10. Validate correctness and performance with tests and benchmarks.

### 2.4 Scope

**Core scope** - Dashboard shell and live map viewport. - Vehicle
telemetry ingestion and validation. - Worker-based coordinate
processing. - MongoDB telemetry buckets and indexes. - Redis Pub/Sub and
Socket.IO streaming. - Geofence rules and alerts. - Vehicle history and
system metrics. - Testing, documentation, and demonstration.

**Not specified as mandatory in the supplied FleetDash brief**
Authentication, billing, route optimization, mobile apps, driver chat,
payments, and commercial GPS hardware integration. Do not add these
until the required scope works or the mentor requests them.

------------------------------------------------------------------------

## 3. Team roles and ownership

  -----------------------------------------------------------------------------
  Member            Role              Primary ownership   Branch
  ----------------- ----------------- ------------------- ---------------------
  Rupam Bairagya    Team Lead +       React dashboard,    `rupam-bairagya`
                    Frontend & Canvas Canvas viewport,    
                    Engineer          frontend            
                                      integration,        
                                      coordination and    
                                      final demo          

  Anish Das         Backend           GeoJSON zones,      `anish-das`
                    Geospatial &      Turf.js checks,     
                    Messaging         Redis Pub/Sub       
                    Engineer          integration,        
                                      geofence            
                                      transitions and     
                                      alerts              

  Mistu Naskar      Database &        MongoDB schemas,    `mistu-naskar`
                    Storage Engineer  hourly bucket       
                                      design, indexes,    
                                      bulk writes,        
                                      vehicle history     
                                      persistence/API     

  Subhankari Mondal Backend           Express foundation, `subhankari-mondal`
                    Infrastructure &  ingestion API,      
                    Ingestion         `worker_threads`,   
                    Engineer          backend integration 
                                      support, k6 load    
                                      tests and CI        
  -----------------------------------------------------------------------------

### 3.1 Rupam --- Team Lead + Frontend + Canvas

**Languages:** TypeScript (primary), HTML5, CSS3.\
**Technologies:** React 18, Vite, Socket.IO Client, HTML5 Canvas 2D,
`requestAnimationFrame`.

**Responsibilities** - Coordinate the overall project plan and team. -
Own the frontend structure and dashboard layout. - Build sidebar,
header, KPI cards, map viewport, vehicle details and alert UI. - Define
frontend TypeScript types and coordinate shared payload contracts. -
Connect Socket.IO client events to the UI. - Render vehicle positions on
Canvas without causing React to re-render for every coordinate update. -
Add vehicle selection and viewport pan/zoom interactions. - Integrate
frontend with backend APIs and test end-to-end behavior. - Review pull
requests and coordinate safe merges into `main`. - Prepare the project
demonstration and help the team prepare for viva.

**Deliverables** - Running React + Vite + TypeScript application. -
Dashboard pages and components. - Canvas vehicle renderer. - Socket.IO
client integration. - Vehicle inspection UI and geofence alert drawer. -
Frontend setup documentation and integration evidence.

### 3.2 Anish --- Backend Geospatial & Messaging

**Languages/data:** TypeScript/JavaScript, JSON, GeoJSON.\
**Technologies:** Node.js/Express integration, Redis Pub/Sub, Turf.js,
Socket.IO event-flow coordination.

**Responsibilities** - Define GeoJSON Polygon/MultiPolygon boundaries
for depots and restricted zones. - Implement point-in-polygon checks
using Turf.js. - Track geofence state transitions: outside → inside and
inside → outside. - Avoid generating a new alert for every coordinate
while a vehicle remains inside a zone; emit on meaningful transitions. -
Configure Redis channels such as `telemetry:stream` and
`telemetry:alerts`. - Coordinate event payload formats with Subhankari
and Rupam. - Integrate geofence alerts into the backend event flow. -
Implement speed-violation logic within configured zones if time permits
and core geofence alerts are stable. - Write tests for boundary cases
and alert transitions.

**Deliverables** - GeoJSON zone definitions/model. - Geofence service
and transition logic. - Redis Pub/Sub integration. - Alert event
payloads. - Geospatial unit tests and setup notes.

### 3.3 Mistu --- Database & Storage

**Languages/data:** TypeScript/JavaScript, MongoDB Query Language,
JSON.\
**Technologies:** MongoDB, Mongoose, indexes and bulk writes.

**Responsibilities** - Design vehicle and telemetry data models. -
Implement the MongoDB Time-Series Bucket Pattern described in the
brief. - Group high-frequency telemetry samples into hourly bucket
documents. - Implement the compound index
`{ vehicleId: 1, bucketStartTime: -1 }` where appropriate to the final
schema. - Implement efficient bulk writes. - Create vehicle telemetry
history retrieval. - Validate bucket boundaries, timestamp handling, and
duplicate/out-of-order data behavior with the team. - Benchmark queries
and document the environment and measured latency. - Document database
setup and schema decisions.

**Deliverables** - Mongoose models/schemas. - Hourly bucket write and
read functions. - Required indexes. - Vehicle history API implementation
in coordination with backend owner. - Database tests and benchmark
report.

### 3.4 Subhankari --- Backend Infrastructure & Ingestion

**Languages:** TypeScript (primary), JavaScript/Node.js; JavaScript for
k6 scripts.\
**Technologies:** Node.js, Express.js, `worker_threads`, Socket.IO
server integration support, k6, GitHub Actions.

**Responsibilities** - Set up the backend application foundation and
Express server. - Implement telemetry ingestion endpoint and request
validation. - Create a worker-thread pool or controlled worker lifecycle
for coordinate parsing/processing. - Define worker messaging and failure
handling. - Coordinate with Mistu for persistence and Anish for Redis
publishing. - Add backend health checks and structured error handling. -
Create k6 load-testing scripts and record throughput, latency, error
rate, and dropped/duplicated data observations. - Set up GitHub Actions
for install, type-check, lint, and tests once scripts exist. - Document
environment variables and backend run instructions.

**Deliverables** - Express backend scaffold. - Telemetry ingestion
route/service. - Worker-thread processing module. - Backend validation
and error handling. - k6 scripts and benchmark results. - GitHub Actions
CI workflow and backend documentation.

### 3.5 Shared responsibilities

All members must understand the overall architecture and module
interfaces, use agreed TypeScript conventions, keep secrets out of
source control, test before pushing, communicate blockers early, commit
genuine work to their own branch, and help resolve integration defects.

------------------------------------------------------------------------

## 4. Technology stack

  -------------------------------------------------------------------------
  Layer                   Technology                Purpose
  ----------------------- ------------------------- -----------------------
  Frontend framework      React 18                  Dashboard UI and
                                                    components

  Frontend build tool     Vite                      Local development and
                                                    build

  Main language           TypeScript                Type-safe frontend and
                                                    backend

  Markup and styling      HTML5, CSS3               Layout and responsive
                                                    styling

  Map rendering           HTML5 Canvas 2D           Efficient vehicle
                                                    marker drawing

  Animation               `requestAnimationFrame`   Schedule Canvas redraws

  Backend runtime         Node.js                   Server-side JavaScript
                                                    runtime

  Backend framework       Express.js                REST API and middleware

  Parallel processing     `worker_threads`          Offload coordinate
                                                    processing

  Database                MongoDB                   Vehicle and telemetry
                                                    storage

  ODM                     Mongoose                  MongoDB schemas and
                                                    models

  Messaging               Redis Pub/Sub             Decouple ingestion from
                                                    consumers

  Real-time communication Socket.IO                 Deliver live events to
                                                    clients

  Geospatial              GeoJSON + Turf.js         Geofence calculations

  Load testing            k6                        Generate traffic and
                                                    measure performance

  Unit/API tests          Jest + Supertest          Test services and HTTP
                                                    endpoints

  CI                      GitHub Actions            Automate checks
  -------------------------------------------------------------------------

**Language clarification:** Use TypeScript as the default application
language for frontend and backend. HTML/CSS are used in the frontend. k6
scripts use JavaScript. MongoDB queries use MongoDB query syntax. The
supplied FleetDash brief does not require a separate Java, Python, or
PHP application.

------------------------------------------------------------------------

## 5. Proposed system architecture

### 5.1 Logical architecture

``` text
                 VEHICLE / GPS TELEMETRY
                           |
                           v
                 [ Express Ingestion API ]
                           |
                    Validate payload
                           |
                           v
                 [ Worker Thread Pool ]
                 Parse / normalize data
                           |
              +------------+-------------+
              |                          |
              v                          v
       [ MongoDB Service ]        [ Redis Publisher ]
       Hourly bucket storage       telemetry:stream
              |                          |
              v                          v
       [ MongoDB ]                 [ Redis Pub/Sub ]
                                         |
                             +-----------+-----------+
                             |                       |
                             v                       v
                    [ Socket.IO Server ]      [ Geofence Service ]
                             |                 Turf.js zone checks
                             |                       |
                             |                 Redis alerts channel
                             |                       |
                             +-----------+-----------+
                                         |
                                         v
                              [ Socket.IO Client ]
                                         |
                                         v
                              [ React Dashboard ]
                                         |
                         +---------------+--------------+
                         |               |              |
                         v               v              v
                    KPI Cards       Canvas Map      Alert Drawer
                                         |
                                  Vehicle Selection
                                         |
                                  History API
```

This is a proposed logical flow combining the modules in the supplied
brief. The team must decide whether geofence checks run directly in the
ingestion processing path or as a separate consumer of the telemetry
stream. Keep the first implementation simple and avoid duplicate
processing.

### 5.2 Data flow

1.  A simulator or telemetry source sends a GPS update to the ingestion
    API.
2.  Express validates the request shape and basic values.
3.  The ingestion service sends CPU-heavy parsing/normalization work to
    a worker thread.
4.  Processed telemetry is passed to storage and Redis according to the
    agreed reliability strategy.
5.  The database layer groups telemetry into hourly buckets in MongoDB.
6.  Redis publishes telemetry messages to subscribers.
7.  Socket.IO forwards events to connected dashboard clients.
8.  React updates its in-memory vehicle data.
9.  Canvas draws the latest positions.
10. The geofence service checks coordinates against GeoJSON zones and
    emits alerts on state transitions.
11. The dashboard displays alerts.
12. The manager can request historical telemetry through the history
    API.

### 5.3 Reliability decision required

The team must agree what happens if MongoDB or Redis is temporarily
unavailable. Do not silently drop data or claim "zero data loss" without
a tested acknowledgement/retry strategy. Document whether the ingestion
API responds after persistence, after queue/publication, or after
another defined acceptance point.

------------------------------------------------------------------------

## 6. Proposed repository structure

This is the recommended monorepo target, not a claim that all folders
already exist in GitHub.

``` text
FleetDash/
├── client/
│   ├── public/
│   └── src/
│       ├── app/
│       ├── assets/
│       ├── components/
│       │   ├── layout/
│       │   ├── dashboard/
│       │   ├── vehicles/
│       │   └── alerts/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       ├── socket/
│       ├── canvas/
│       ├── types/
│       └── styles/
│
├── server/
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── workers/
│       ├── sockets/
│       ├── messaging/
│       ├── geofence/
│       ├── models/
│       ├── utils/
│       ├── types/
│       └── app.ts
│
├── shared/types/
├── tests/
│   ├── integration/
│   └── load/
├── docs/
│   ├── architecture.md
│   ├── api-contracts.md
│   ├── database-schema.md
│   └── benchmark-results.md
├── .github/workflows/ci.yml
├── .gitignore
├── .env.example
├── package.json
├── tsconfig.base.json
└── README.md
```

### Folder ownership suggestion

  Folder/module                                Primary owner
  -------------------------------------------- -------------------------------------------
  `client/`                                    Rupam
  `server/src/workers/` and ingestion          Subhankari
  `server/src/geofence/` and messaging         Anish
  `server/src/models/` and database services   Mistu
  `shared/types/`                              Rupam coordinates; all members contribute
  `tests/`                                     Each member for their module
  `.github/workflows/`                         Subhankari

Avoid having multiple members edit the same files simultaneously without
coordination.

------------------------------------------------------------------------

## 7. Shared data contracts --- proposed

These are starting points. Confirm field names, units, validation rules,
and versioning with all members before coding against them.

### 7.1 Vehicle telemetry

``` ts
export interface VehicleTelemetry {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmph: number;
  headingDegrees: number;
  recordedAt: string; // ISO 8601 timestamp
}
```

Validation: - `vehicleId` is a non-empty identifier. - Latitude is
between -90 and 90. - Longitude is between -180 and 180. - Speed is
non-negative. - Heading uses the agreed range, normally 0--359. -
Timestamp is parseable and timezone-aware.

### 7.2 Geofence model

``` ts
export interface Geofence {
  id: string;
  name: string;
  type: "restricted" | "depot";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  speedLimitKmph?: number;
  enabled: boolean;
}
```

GeoJSON coordinate order is longitude first, latitude second. Validate
polygon structure and closure before using it.

### 7.3 Alert event

``` ts
export interface GeofenceAlert {
  alertId: string;
  vehicleId: string;
  geofenceId: string;
  geofenceName: string;
  eventType: "ENTER" | "EXIT" | "SPEED_VIOLATION";
  occurredAt: string;
  latitude: number;
  longitude: number;
  speedKmph: number;
}
```

### 7.4 Vehicle live state for frontend

``` ts
export interface VehicleLiveState {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmph: number;
  headingDegrees: number;
  lastUpdatedAt: string;
  status: "online" | "stale" | "offline";
}
```

The stale/offline threshold must be agreed and documented; do not invent
one in the UI.

------------------------------------------------------------------------

## 8. Proposed REST API and Socket.IO contracts

The supplied work distribution explicitly names: -
`GET /api/v1/metrics` - `GET /api/v1/telemetry/history/:vehicleId`

The ingestion route and event names below are proposals for the team to
confirm.

### 8.1 REST endpoints

  ----------------------------------------------------------------------------------------------
  Method            Endpoint                                 Owner             Purpose
  ----------------- ---------------------------------------- ----------------- -----------------
  `GET`             `/api/v1/health`                         Subhankari        Basic service
                                                                               health

  `POST`            `/api/v1/telemetry`                      Subhankari        Accept telemetry
                                                                               payload

  `GET`             `/api/v1/metrics`                        Subhankari +      Live system
                                                             integration       metrics

  `GET`             `/api/v1/telemetry/history/:vehicleId`   Mistu             Read vehicle
                                                                               history

  `GET`             `/api/v1/geofences`                      Anish             List configured
                                                                               zones

  `POST`            `/api/v1/geofences`                      Anish             Create a zone, if
                                                                               included in MVP
  ----------------------------------------------------------------------------------------------

For every endpoint document request body/query parameters, success
response, validation errors, server errors, access policy if added,
examples, and tests.

### 8.2 Proposed Socket.IO events

  -----------------------------------------------------------------------
  Direction               Event                   Purpose
  ----------------------- ----------------------- -----------------------
  Server → client         `telemetry:update`      New vehicle
                                                  position/telemetry

  Server → client         `geofence:alert`        Vehicle entered/exited
                                                  zone or speed alert

  Server → client         `system:metrics`        Current
                                                  processing/system
                                                  metrics

  Client → server         `vehicle:subscribe`     Subscribe to vehicle
                                                  stream, if needed

  Client → server         `vehicle:unsubscribe`   Stop vehicle-specific
                                                  subscription
  -----------------------------------------------------------------------

Use a shared TypeScript event map so frontend and backend do not
independently invent event names or payload shapes.

### 8.3 Redis channels from the supplied work distribution

-   `telemetry:stream`
-   `telemetry:alerts`

Agree on message envelope, serialization, event version, and error
handling before implementation. If binary transport is required,
document byte layout, field types, byte order, versioning, and decoder
tests. Do not guess the binary protocol separately on frontend and
backend.

------------------------------------------------------------------------

## 9. Database design proposal

The project brief requires MongoDB Bucket Pattern storage for
high-frequency telemetry grouped into hourly arrays. Mistu should
finalize the schema and have the team review it.

### 9.1 Vehicle collection --- suggested

``` ts
interface VehicleDocument {
  vehicleId: string;
  label?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 9.2 Telemetry bucket --- illustrative

``` ts
interface TelemetryBucketDocument {
  vehicleId: string;
  bucketStartTime: Date; // start of the hour
  bucketEndTime: Date;
  count: number;
  samples: Array<{
    recordedAt: Date;
    latitude: number;
    longitude: number;
    speedKmph: number;
    headingDegrees: number;
  }>;
}
```

Suggested index from the work distribution:

``` js
{ vehicleId: 1, bucketStartTime: -1 }
```

### 9.3 Decisions to document

-   How an hourly bucket key is calculated.
-   How late/out-of-order telemetry is handled.
-   Maximum bucket size/sample count.
-   How duplicate telemetry is detected, if required.
-   Whether buckets are updated with `$push`, bulk writes, or another
    method.
-   Retention policy, if required.
-   Query range behavior for vehicle history.
-   Index benchmark dataset and query plan.

The illustrative interfaces above are not final Mongoose schemas.

------------------------------------------------------------------------

## 10. Frontend design and modules

### 10.1 Suggested dashboard layout

``` text
+--------------------------------------------------------------+
| FleetDash header                         System connection  |
+------------------+-------------------------------------------+
| Sidebar          | KPI: Total | Active | Alerts | Avg Speed   |
|                  +-------------------------------------------+
| Overview         |                                           |
| Live Map         |             CANVAS MAP                    |
| Vehicles         |       Vehicle markers / movement          |
| Alerts           |                                           |
| History          +-------------------------------------------+
| Settings         | Selected vehicle / recent alerts           |
+------------------+-------------------------------------------+
```

### 10.2 Suggested React components

  Component               Responsibility
  ----------------------- --------------------------------------
  `App`                   App entry and route/layout
  `DashboardLayout`       Sidebar, header and content frame
  `Sidebar`               Navigation
  `Header`                Page title and connection state
  `MetricCard`            One KPI value
  `FleetMapCanvas`        Canvas element and drawing lifecycle
  `VehicleDetailsPanel`   Selected vehicle details
  `VehicleList`           Searchable vehicle list
  `AlertDrawer`           Recent geofence alerts
  `ConnectionStatus`      Socket connection status

### 10.3 Canvas rules

-   Keep latest vehicle positions in an in-memory structure such as
    `Map<string, VehicleLiveState>`.
-   Do not call React state setters for every coordinate if that causes
    excessive component renders.
-   Use `requestAnimationFrame` for drawing.
-   Separate data updates from drawing.
-   Handle Canvas resize and device pixel ratio.
-   Add pan/zoom only after basic rendering works.
-   Test with progressively larger datasets.
-   Record measured FPS and browser/device details.

Canvas renders map markers; React manages surrounding UI such as cards,
controls, and panels.

------------------------------------------------------------------------

## 11. Four-week implementation plan

Dates follow the supplied work distribution. The review windows overlap
the week schedule; Week 1--2 deliverables must be demonstrable before
the mid-review window begins.

### Week 1 --- 5 to 11 November: Architecture and scaffolding

**Rupam** - Confirm monorepo structure and shared contracts. - Scaffold
React 18 + Vite + TypeScript. - Build dashboard layout, sidebar, header,
KPI cards and static map placeholder. - Create frontend component
structure.

**Subhankari** - Set up Express + TypeScript backend. - Create health
route and server startup. - Build initial telemetry ingestion route and
validation structure. - Create worker-thread proof of concept for
coordinate parsing.

**Anish** - Define GeoJSON zone examples. - Create geofence data shape
and initial Turf.js service. - Define Redis configuration and
channel/message proposal with Subhankari.

**Mistu** - Design vehicle and telemetry bucket schemas. - Implement
hourly bucket grouping. - Prepare MongoDB connection and basic
persistence test.

**Week 1 exit criteria** - Frontend starts locally. - Backend starts
locally. - Database connection test succeeds. - Sample telemetry can be
validated. - Team agrees on shared TypeScript contracts.

### Week 2 --- 12 to 18 November: Ingestion and live transport

**Rupam** - Connect Socket.IO client. - Build typed telemetry
hook/service. - Display incoming sample vehicle data. - Add loading,
empty, disconnected and error states.

**Subhankari** - Connect ingestion route to worker processing. - Add
worker error handling and concurrency controls. - Create k6 test script
and capture baseline results. - Coordinate persistence and Redis
handoff.

**Anish** - Implement Redis Pub/Sub channels. - Publish telemetry and
alert events using the agreed message format. - Test publish/subscribe
behavior.

**Mistu** - Implement compound index. - Implement bucket lookup/update
path. - Benchmark representative vehicle/time-range queries.

**Mid-review readiness** - Show frontend and backend running. - Send
sample telemetry through ingestion. - Demonstrate database
persistence. - Demonstrate a live event reaching the frontend if
integrated. - Present measured results, gaps and next steps. - Each
member should explain their own module.

### Week 3 --- 19 to 25 November: Geofencing and Canvas

**Rupam** - Build Canvas 2D renderer. - Add `requestAnimationFrame`
loop. - Render and update vehicle markers. - Add vehicle selection and
basic viewport interactions.

**Subhankari** - Integrate worker ingestion with persistence and message
publishing. - Implement `/api/v1/metrics`. - Investigate ingestion
throughput and error handling.

**Anish** - Implement Turf.js point-in-polygon checks. - Implement
geofence state transitions. - Publish ENTER/EXIT alert events. - Add
geofence tests.

**Mistu** - Implement bulk writes for hourly buckets. - Implement
`/api/v1/telemetry/history/:vehicleId`. - Add query tests and document
index performance.

### Week 4 --- 26 November to 4 December: Hardening and final demo

**Rupam** - Add alert drawer and vehicle inspection panel. - Add
pan/zoom and polish dashboard. - Coordinate end-to-end tests and final
demo.

**Subhankari** - Add GitHub Actions CI workflow. - Run backend stress
tests and investigate bottlenecks. - Document environment and backend
startup.

**Anish** - Add speed-violation logic if core geofence alerts are
complete. - Write Jest/Supertest tests for geospatial and alert modules.

**Mistu** - Tune MongoDB connection pool based on measurements. - Test
failure handling and query behavior. - Complete schema and benchmark
documentation.

**Final-review readiness** - Demonstrate end-to-end telemetry path. -
Demonstrate live vehicle updates and geofence alerts. - Demonstrate
vehicle history and system metrics. - Show test results and known
limitations. - Ensure demo environment is stable.

------------------------------------------------------------------------

## 12. GitHub workflow and collaboration

### 12.1 Branch policy

  Branch                Owner
  --------------------- ------------------------------
  `main`                Integrated, reviewed project
  `rupam-bairagya`      Rupam
  `anish-das`           Anish
  `mistu-naskar`        Mistu
  `subhankari-mondal`   Subhankari

### 12.2 Daily workflow

Each member should: 1. Switch to their own branch. 2. Pull the latest
changes for that branch. 3. Work on a small, clearly scoped task. 4. Run
relevant checks and tests. 5. Review `git diff`. 6. Commit meaningful
changes with a clear message. 7. Push to their own branch. 8. Inform the
team of progress and blockers.

Example:

``` bash
git switch rupam-bairagya
git pull origin rupam-bairagya
git status
git add client/
git commit -m "Build dashboard layout"
git push origin rupam-bairagya
```

Integration: 1. Member pushes their branch. 2. Open a Pull Request into
`main`. 3. Rupam reviews code and checks tests. 4. Resolve conflicts
with the relevant author. 5. Merge only after the feature works with
current project code.

Do not commit as another member. Do not create empty, fake, repeated, or
meaningless commits.

### 12.3 Infotact GitHub activity requirements

The supplied handbook states: - Mid review: during the preceding 14
days, the team repository needs activity on at least 10 different days;
each active member must show progress on their own branch. - Final
review: during the preceding 20 days, the repository needs at least one
commit every day; each active member must show activity on their own
branch. - Valid work can include code, documentation, tests, design
updates, research, debugging, and configuration. - Empty commits,
single-character changes, duplicated commits, and generated spam commits
are invalid.

Follow the safer interpretation: each active member should make genuine
progress on their own branch regularly, and the shared repository must
meet the overall day-count requirement. Confirm ambiguity with the
mentor.

### 12.4 Communication

-   Use one team channel such as WhatsApp or Discord.
-   Share daily update: completed, next task, blocker.
-   Raise blockers early.
-   If a member is unresponsive, follow the handbook contact/escalation
    process and inform the mentor rather than silently changing
    ownership.

------------------------------------------------------------------------

## 13. Testing and acceptance criteria

### 13.1 Functional tests

  Area        Minimum check
  ----------- --------------------------------------------------------
  Ingestion   Valid telemetry accepted; invalid coordinates rejected
  Worker      Worker processes sample data and reports errors safely
  Database    Telemetry saved into correct hourly bucket
  Index       History query uses intended index where applicable
  Redis       Publisher and subscriber exchange expected event
  Socket.IO   Connected client receives telemetry event
  Canvas      Vehicle marker appears at correct projected position
  Geofence    Point inside/outside polygon is classified correctly
  Alerts      ENTER/EXIT transition creates expected alert
  History     Vehicle history endpoint returns ordered records
  Metrics     Metrics endpoint returns documented fields

### 13.2 Performance targets from the brief

  -----------------------------------------------------------------------
  Target                              Evidence required
  ----------------------------------- -----------------------------------
  2,000 requests/second ingestion     k6 script, environment, duration,
                                      throughput, p95/p99 latency, error
                                      rate

  Sub-5ms database queries            Query benchmark, dataset size,
                                      index definition, explain plan,
                                      measured latency

  60 FPS viewport                     Browser/device, vehicle count,
                                      duration, measured FPS/frame-time
                                      distribution
  -----------------------------------------------------------------------

These targets are demanding. First establish correctness at small scale,
then increase load gradually and record where performance degrades. Do
not report targets as achieved until measured.

### 13.3 Suggested testing progression

1.  One vehicle, one telemetry update.
2.  One vehicle, repeated updates.
3.  Multiple vehicles, moderate update frequency.
4.  Database history query.
5.  One geofence ENTER and EXIT transition.
6.  Multiple concurrent Socket.IO clients.
7.  Gradually increase ingestion load with k6.
8.  Increase Canvas marker count and measure frame rate.
9.  Test Redis/MongoDB disconnection and recovery behavior.

------------------------------------------------------------------------

## 14. Security and reliability practices

-   Store MongoDB and Redis credentials only in local environment
    variables or approved secret storage.
-   Commit `.env.example`, never real `.env` files.
-   Validate incoming telemetry values and payload sizes.
-   Add rate limiting if required by the deployment threat model.
-   Do not expose database credentials or Redis connection strings to
    the browser.
-   Handle worker crashes and rejected messages explicitly.
-   Add structured logs with timestamps and request/event identifiers.
-   Avoid logging secrets or unnecessary personal information.
-   Define retry behavior and duplicate handling.
-   Restrict production database access.
-   Document backup/retention expectations if required by the mentor.

Example environment template:

``` env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=
REDIS_URL=
```

Actual variable names must match the implementation. Never paste
credentials into GitHub, chat messages, screenshots, or documentation.

------------------------------------------------------------------------

## 15. Local development setup

### Prerequisites

-   Node.js LTS and npm
-   Git
-   Visual Studio Code
-   MongoDB local instance or MongoDB Atlas
-   Redis instance or approved Redis-compatible service

### Clone

``` bash
git clone https://github.com/Rupam852/FleetDash.git
cd FleetDash
```

### Check tools

``` bash
node -v
npm -v
git --version
```

### Switch to your branch

``` bash
git switch rupam-bairagya
```

If the local branch does not exist but remote branch does:

``` bash
git fetch origin
git switch --track origin/rupam-bairagya
```

### Install and run

Exact npm commands depend on the package scripts committed by the team.
Once the monorepo is scaffolded, document the confirmed commands here.
Do not assume `npm run dev` exists until it is defined in
`package.json`.

------------------------------------------------------------------------

## 16. Review and viva preparation

### Rupam

-   Why React is used for the dashboard.
-   Why Canvas is used for many vehicle markers.
-   What `requestAnimationFrame` does.
-   How Socket.IO updates reach the frontend.
-   How the frontend avoids unnecessary React re-renders.
-   How the frontend connects to backend APIs.

### Anish

-   What GeoJSON is.
-   Why GeoJSON coordinate order is longitude then latitude.
-   How point-in-polygon checks work.
-   How ENTER/EXIT transitions are detected.
-   What Redis Pub/Sub does.
-   How alert events reach the dashboard.

### Mistu

-   What the MongoDB Bucket Pattern is.
-   Why telemetry is grouped by hour.
-   What the compound index does.
-   How bulk writes help.
-   How vehicle history is queried.
-   How query benchmarks were measured.

### Subhankari

-   What Node.js is and how the event loop works.
-   Why worker threads are used.
-   How the ingestion API validates telemetry.
-   How worker messages/errors are handled.
-   How k6 load tests are configured.
-   What the CI workflow checks.

### Team-level questions

-   Explain the complete telemetry flow from GPS payload to Canvas
    marker.
-   What happens if MongoDB is unavailable?
-   What happens if Redis is unavailable?
-   How are duplicate or out-of-order updates handled?
-   How does the system detect a geofence breach?
-   How were throughput, query latency, and FPS measured?

------------------------------------------------------------------------

## 17. Definition of done

A feature is not complete merely because code has been written. Mark it
complete only when it meets agreed acceptance criteria, TypeScript
checks pass, relevant tests pass, error/empty states are handled, it has
been reviewed, it is integrated into `main`, documentation is updated,
and the team can demonstrate and explain it.

### Project completion checklist

-   [ ] Frontend dashboard runs.
-   [ ] Backend server runs.
-   [ ] MongoDB connection works.
-   [ ] Telemetry ingestion works.
-   [ ] Worker-thread processing works.
-   [ ] Hourly bucket persistence works.
-   [ ] Redis Pub/Sub works.
-   [ ] Socket.IO live updates work.
-   [ ] Canvas renders moving vehicles.
-   [ ] Geofence ENTER/EXIT alerts work.
-   [ ] Vehicle history API works.
-   [ ] Metrics API works.
-   [ ] Tests pass.
-   [ ] Performance benchmarks are documented.
-   [ ] CI workflow passes.
-   [ ] README and technical docs are updated.
-   [ ] Final demo and viva are prepared.

------------------------------------------------------------------------

## 18. Decisions the team must confirm

Before implementing the full system, hold a short team meeting and
record decisions for:

1.  Final monorepo structure and npm workspace strategy.
2.  Exact telemetry ingestion endpoint and response behavior.
3.  Shared TypeScript interfaces and event payload formats.
4.  Whether geofence processing is synchronous in ingestion or a
    separate Redis consumer.
5.  MongoDB bucket schema and duplicate/out-of-order handling.
6.  Binary transport format and versioning.
7.  Vehicle simulator/data source for the demo.
8.  Deployment target and environment.
9.  Whether authentication is required for this project cycle.
10. Performance test hardware, dataset, duration, and measurement
    method.

Do not let four members independently invent these interfaces. Agree
once, write them down, and implement against the same contract.

------------------------------------------------------------------------

## 19. References

This document is based primarily on supplied materials: - Infotact
Solutions, **PROJECT DOCUMENT -- MERN STACK DEVELOPMENT**, Project 1:
FleetDash, pages 1--2 and technology summary on page 6. - Team
**WORK_DISTRIBUTION.md**, revised in this conversation for the current
four-member allocation. - Infotact Solutions, **Project Execution
Handbook V2.0**, including review structure, evaluation, GitHub branch
rules, team responsibilities, and commit activity requirements. -
Infotact internship collaboration instructions.

**Repository:** https://github.com/Rupam852/FleetDash

**Reminder:** Keep this document aligned with the code that actually
exists. Update proposed contracts, folder paths, commands, and benchmark
results as the project develops.
