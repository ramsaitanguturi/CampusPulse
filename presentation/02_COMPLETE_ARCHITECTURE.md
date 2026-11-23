# 02 — Complete System Architecture

## 1. High-Level Architectural Pattern
CampusPulse follows a classic **3-Tier Enterprise Architecture**:
1. **Presentation Tier**: React 19 + TypeScript Single Page Application (SPA).
2. **Application / Business Logic Tier**: FastAPI asynchronous REST API + SQLAlchemy 2.0 ORM.
3. **Authoritative Data Tier**: Oracle Database 21c Express Edition (`XEPDB1`).

```
+--------------------------------------------------------------------------+
|                     PRESENTATION TIER (Frontend SPA)                     |
|          React 19 | TypeScript | Vite | Tailwind CSS v4 | Recharts       |
|    - Cyberpunk / Dark UI Control Center                                  |
|    - SVG Campus Map Spatial Digital Twin                                 |
|    - DBMS Studio Live Query Console                                      |
+------------------------------------+-------------------------------------+
                                     |  REST API / JSON (HTTP 8000)
                                     v
+--------------------------------------------------------------------------+
|                 APPLICATION TIER (FastAPI Backend Engine)                |
|             Python 3.12 | Pydantic v2 | SQLAlchemy 2.0 ORM               |
|    - 8 Modular Routers (/api/dashboard, /rooms, /bookings, etc.)         |
|    - CampusService: Transaction boundaries, Lock Orchestration           |
|    - Half-Open Interval Mathematical Validation                          |
+------------------------------------+-------------------------------------+
                                     |  SQLAlchemy Engine / python-oracledb
                                     |  Connection Pool (size=10, max_overflow=20)
                                     v
+--------------------------------------------------------------------------+
|                   DATA TIER (Oracle Database 21c XE)                     |
|    - 6 BCNF-Normalized Relational Tables with Identity Keys              |
|    - Pessimistic Row-Level Locking (SELECT ... FOR UPDATE)               |
|    - PL/SQL Compound Trigger (TRG_NO_OVERLAPPING_BOOKINGS)               |
|    - Pre-compiled Views (v_dashboard_summary, v_room_live_status)        |
|    - 8 Composite B-Tree Indexes on Foreign Keys and Temporal Intervals   |
+--------------------------------------------------------------------------+
```

---

## 2. Component Directory Architecture

```
CampusPulse/
├── backend/
│   ├── app/
│   │   ├── config.py             <- Pydantic Settings, DB credential resolution & URL masking
│   │   ├── database.py           <- SQLAlchemy engine factory, pooling & SQLite pragma setup
│   │   ├── main.py               <- FastAPI entry point, CORS allowlist, global exception handler
│   │   ├── models/entities.py    <- 6 Declarative SQLAlchemy ORM entities & schema constraints
│   │   ├── routers/              <- 8 REST API routers handling request routing
│   │   ├── schemas/schemas.py    <- Pydantic v2 request/response validation schemas
│   │   └── services/campus_service.py <- Core business logic, row locks & ACID transactions
│   ├── scripts/
│   │   ├── oracle_schema.sql     <- Authoritative Oracle 21c DDL script (tables, views, trigger)
│   │   ├── sql_demonstrations.sql<- 20 syllabus SQL queries for SQL*Plus viva demo
│   │   ├── init_db.py            <- Database initialization & idempotent seed data populator
│   │   └── verify_db.py          <- 9-point Oracle schema integrity auditor
│   └── tests/                    <- 45 automated test cases across 5 test suites
└── frontend/
    ├── src/
    │   ├── App.tsx               <- Master state holder, view-switching & modal controller
    │   ├── components/           <- 8 UI view modules (Dashboard, Map, Rooms, Bookings, etc.)
    │   ├── services/api.ts       <- Typed HTTP REST API client with custom ApiError handling
    │   └── types/index.ts        <- TypeScript domain models & API response interfaces
```

---

## 3. Database Connection & Pooling Strategy
The database connectivity layer is centralized in [backend/app/database.py](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/app/database.py):

- **Driver**: `python-oracledb` 26.0+ operating in **Thin Mode** (pure Python, zero Oracle Client library / Instant Client prerequisites).
- **Connection URL**: `oracle+oracledb://campuspulse:***@localhost:1521/?service_name=XEPDB1`.
- **Pool Tuning**:
  - `pool_size = 10`: Maintains 10 persistent ready connections.
  - `max_overflow = 20`: Allows up to 20 additional transient connections under peak concurrency.
  - `pool_pre_ping = True`: Actively verifies connection vitality (`SELECT 1 FROM dual`) before dispensing connections from the pool, preventing stale socket errors.
- **Security & Hygiene**: `mask_database_url()` intercepts connection strings and replaces plaintext passwords with `***` across all application logs and console outputs.

---

## 4. End-to-End Request-Response Flow

```
1. Client Action (Browser)
   └── User clicks "Confirm Reservation" in BookingsView.tsx
2. HTTP POST Request
   └── POST http://localhost:8000/api/bookings with JSON payload
3. FastAPI Middleware & Routing
   └── CORS Allowlist validation -> Pydantic Schema parsing (BookingCreate)
4. Service Layer Execution (CampusService.create_booking)
   ├── Step A: Validates end_time > start_time
   ├── Step B: Begins atomic database transaction
   ├── Step C: Acquires exclusive row lock: SELECT * FROM rooms WHERE id = :id FOR UPDATE
   ├── Step D: Executes overlap query against confirmed bookings for that room
   │           └── If conflict exists: db.rollback() -> raises ConflictError (409)
   ├── Step E: Inserts new Booking tuple -> db.commit()
   └── Step F: Oracle Compound Trigger executes in kernel as final safety check
5. Response Delivery
   └── Returns HTTP 201 Created with JSON booking details to React UI
```
