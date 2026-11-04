# FleetDash -- High-Throughput Event-Driven Fleet Telemetry Dashboard

FleetDash is a team-based internship project focused on building a
real-time fleet telemetry dashboard. It is designed to help a fleet
manager monitor vehicle locations, receive geofence alerts, and inspect
vehicle telemetry history through a web-based dashboard.

> **Project status:** Development in progress. This README describes the
> project goals and planned architecture. Features should be marked as
> completed only after they are implemented and tested.

## Problem Statement

Logistics companies need to track many vehicles in real time.
Traditional ingestion and rendering approaches can block the Node.js
event loop or overload the browser when large numbers of coordinate
updates arrive frequently.

FleetDash aims to process incoming vehicle coordinates efficiently and
display live vehicle positions without overwhelming the frontend.

## Main Features and Project Goals

-   Live vehicle tracking on a dashboard map.
-   Backend ingestion and processing of GPS telemetry.
-   Hourly telemetry storage using the MongoDB Bucket Pattern.
-   Real-time event delivery using Redis Pub/Sub and Socket.IO.
-   Binary transport using compact `ArrayBuffer` payloads.
-   Geofence boundary checks using GeoJSON and Turf.js.
-   Alerts when vehicles enter or leave configured geofenced areas.
-   Vehicle telemetry history.
-   Canvas-based vehicle rendering using `requestAnimationFrame`.
-   System metrics and performance testing.

## Technology Stack

  Area                              Technologies
  --------------------------------- -------------------------------------------
  Frontend                          React 18, Vite, TypeScript
  Rendering                         HTML5 Canvas API, `requestAnimationFrame`
  Backend                           Node.js, Express.js, TypeScript
  Background processing             Node.js `worker_threads`
  Database                          MongoDB, Mongoose
  Messaging and real-time updates   Redis Pub/Sub, Socket.IO
  Geospatial processing             GeoJSON, Turf.js
  Load testing                      k6
  Testing                           Jest, Supertest
  CI/CD                             GitHub Actions

## High-Level Architecture

``` text
Vehicle GPS / Telemetry Data
            |
            v
     Express Ingestion API
            |
            v
   worker_threads Processing
            |
            v
       Redis Pub/Sub
        /         \
       v           v
 MongoDB        Socket.IO
 Telemetry          |
 Storage            v
                React Client
                    |
                    v
             HTML5 Canvas Map
                    |
                    v
             Fleet Dashboard

Geofence Rules (Turf.js) evaluate vehicle coordinates
and produce alert events for the dashboard.
```

The architecture is a project target. The final implementation may
evolve as modules are integrated and tested.

## Repository Structure

The following is the intended structure. Update it to match the actual
repository as development progresses.

``` text
FleetDash/
├── client/                 # React + Vite + TypeScript frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       └── canvas/
├── server/                 # Node.js + Express backend
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── routes/
│       ├── models/
│       ├── workers/
│       ├── services/
│       └── sockets/
├── shared/                 # Shared TypeScript types and contracts
├── tests/                  # Integration and other tests
├── docs/                   # Architecture and project documentation
├── .github/
│   └── workflows/          # GitHub Actions workflows
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Install or arrange access to the following before running the complete
application:

-   Node.js and npm
-   Git
-   MongoDB instance (local or MongoDB Atlas)
-   Redis-compatible instance
-   A code editor such as Visual Studio Code

### Clone the repository

``` bash
git clone https://github.com/Rupam852/FleetDash.git
cd FleetDash
```

### Check your environment

``` bash
node --version
npm --version
git --version
```

### Install dependencies and run

The frontend and backend setup commands depend on the package scripts
committed to the repository. Once the `client/` and `server/`
applications and their `package.json` files are in place, use the
scripts documented in their respective folders.

For example, after those scripts have been configured:

``` bash
cd client
npm install
npm run dev
```

In a separate terminal, after the backend scripts have been configured:

``` bash
cd server
npm install
npm run dev
```

> If these folders or scripts do not exist yet, complete the project
> scaffolding first. Do not assume these commands are available in the
> current repository state.

## Environment Configuration

Keep credentials and secrets in local environment files. Never commit
real database credentials, Redis passwords, tokens, or private keys.

Example variables to configure when the backend is implemented:

``` env
PORT=5000
NODE_ENV=development
MONGODB_URI=
REDIS_URL=
CLIENT_ORIGIN=http://localhost:5173
```

Create the actual environment-variable validation and configuration
according to the backend implementation. Keep `.env` files out of Git
and provide a sanitized `.env.example` file for teammates.

## Planned API and Real-Time Interfaces

The project work distribution identifies the following API endpoints:

  ----------------------------------------------------------------------------------------
  Method                  Endpoint                                 Purpose
  ----------------------- ---------------------------------------- -----------------------
  GET                     `/api/v1/metrics`                        Live system metrics

  GET                     `/api/v1/telemetry/history/:vehicleId`   Retrieve telemetry
                                                                   history for a vehicle
  ----------------------------------------------------------------------------------------

The ingestion endpoint and Socket.IO event names/payload schemas should
be documented here after the team finalizes and implements their API
contracts.

## Team and Responsibilities

  -----------------------------------------------------------------------
  Member                  Responsibility          GitHub Branch
  ----------------------- ----------------------- -----------------------
  Rupam Bairagya          Team Lead, Frontend,    `rupam-bairagya`
                          Canvas viewport,        
                          integration             

  Anish Das               Backend, geospatial     `anish-das`
                          logic, Redis messaging  
                          and alerts              

  Mistu Naskar            Database schemas,       `mistu-naskar`
                          storage, indexes and    
                          telemetry history       

  Subhankari Mondal       Backend infrastructure, `subhankari-mondal`
                          ingestion engine,       
                          worker threads, load    
                          testing and CI/CD       
  -----------------------------------------------------------------------

## Git Branch and Contribution Workflow

Each team member should work on their dedicated branch:

-   `rupam-bairagya`
-   `anish-das`
-   `mistu-naskar`
-   `subhankari-mondal`

Recommended workflow:

1.  Switch to your own branch.
2.  Pull the latest changes for that branch.
3.  Make a focused change related to your assigned task.
4.  Run the relevant checks and tests.
5.  Commit meaningful code, documentation, configuration, or test
    changes.
6.  Push your branch to GitHub.
7.  Open or request a review before integration.
8.  The team lead reviews changes and coordinates merging into `main`.

Example:

``` bash
git switch rupam-bairagya
git pull
git status
git add .
git commit -m "Build fleet dashboard layout"
git push -u origin rupam-bairagya
```

Use your own verified Git identity. Do not create commits under another
team member's identity. Avoid empty, duplicate, or meaningless commits.

## Development Timeline

The project plan is organized into four implementation weeks:

  -----------------------------------------------------------------------
  Phase                               Focus
  ----------------------------------- -----------------------------------
  Week 1                              Architecture, schemas,
                                      backend/frontend scaffolding

  Week 2                              Telemetry ingestion, Redis Pub/Sub,
                                      Socket.IO and binary transport

  Mid-project review                  Demonstrate Week 1 and Week 2
                                      progress

  Week 3                              Geofencing, alerts, Canvas
                                      rendering and vehicle history

  Week 4                              Testing, performance validation,
                                      CI/CD, documentation and polish

  Final review                        End-to-end demonstration and
                                      technical evaluation
  -----------------------------------------------------------------------

Refer to the team's approved Work Distribution document and the Infotact
internship handbook for the applicable review dates and GitHub activity
requirements.

## Performance Targets

The project brief specifies the following targets for validation:

-   Demonstrate a target ingestion throughput of **2,000 requests per
    second**.
-   Work toward database index query response times below **5 ms**.
-   Work toward a steady **60 FPS** Canvas viewport while rendering a
    large number of vehicles.

These are targets, not claims of achieved performance. Record the test
environment, workload, measurement method, and actual results before
reporting that a target has been met.

## Testing and Quality

Planned quality checks include:

-   Unit and integration tests using Jest and Supertest.
-   Load testing using k6.
-   Database index and query benchmarks.
-   End-to-end checks for ingestion, storage, live updates, and geofence
    alerts.
-   TypeScript strict mode and avoidance of `any`.
-   Review of error handling, validation, and environment configuration.

## Security and Configuration Notes

-   Do not commit `.env` files or credentials.
-   Validate incoming telemetry payloads.
-   Validate and sanitize data at API boundaries.
-   Restrict production database and Redis access.
-   Avoid exposing internal infrastructure credentials to the frontend.
-   Keep logs free of secrets and sensitive connection strings.

## Contribution

Contributions are managed by the FleetDash internship team through
assigned GitHub branches. Coordinate changes with the team before
modifying shared interfaces, database schemas, or event payload
contracts.

## Acknowledgements

Developed as **Project 1** for the Infotact Solutions internship
program.

------------------------------------------------------------------------

**Repository:** https://github.com/Rupam852/FleetDash\
**Project:** FleetDash -- High-Throughput Event-Driven Fleet Telemetry
Dashboard
