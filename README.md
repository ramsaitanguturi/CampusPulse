# CampusPulse — Smart Campus Digital Twin
### Enterprise Relational DBMS Semester Project & Spatial Operations Control Center

[![Database](https://img.shields.io/badge/Database-Oracle%2021c%20XE%20%2F%20Free-red.svg)](https://www.oracle.com/database/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20SQLAlchemy%202.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript%20%2B%20Vite-61DAFB.svg)](https://react.dev/)
[![Tests](https://img.shields.io/badge/Test%20Suite-38%20Passed%20%2F%200%20Failed-brightgreen.svg)](TESTING_REPORT.md)
[![Schema](https://img.shields.io/badge/Normalization-3NF%20%26%20BCNF%20Compliant-blue.svg)](DATABASE_DESIGN.md)

**CampusPulse** is an enterprise-grade smart campus operations platform and spatial digital twin. Designed as a comprehensive database management systems (DBMS) semester project, it models university infrastructure, spatial floor plans, room allocations, conflict-free scheduling, maintenance workflows, and real-time SQL analytics using **Oracle Database 21c as the primary and authoritative database backend**.

---

## 📚 Complete Academic Documentation Index

All required academic evaluation documents have been prepared and verified:

1. **[DATABASE_DESIGN.md](DATABASE_DESIGN.md)**: Full Relational Model, 6 Entity Descriptions, Primary/Foreign Keys, Referential Actions, Functional Dependencies, and 1NF/2NF/3NF/BCNF Normalization Proofs.
2. **[SQL_CONCEPTS.md](SQL_CONCEPTS.md)**: Comprehensive explanation of all 20 applied SQL syllabus concepts with executable queries and output breakdowns.
3. **[ORACLE_DATABASE_GUIDE.md](ORACLE_DATABASE_GUIDE.md)**: Production guide for Oracle Database 21c XE, Pluggable DB (`XEPDB1`), schema compilation, user provisioning, and connection pool tuning.
4. **[TRANSACTION_AND_CONCURRENCY.md](TRANSACTION_AND_CONCURRENCY.md)**: In-depth analysis of ACID properties, pessimistic row-level locking (`SELECT ... FOR UPDATE`), mutating-table resolution via Oracle Compound Triggers, and concurrency stress tests.
5. **[TESTING_REPORT.md](TESTING_REPORT.md)**: Technical testing audit detailing all 38 automated test cases, environments, and 100% passing results against Oracle 21c.
6. **[PROJECT_DEMONSTRATION.md](PROJECT_DEMONSTRATION.md)**: Step-by-step viva script and professor demonstration walkthrough with exact instructions and talking points.

---

## 🏛️ System Architecture

```
+-------------------------------------------------------------------------+
|                  CampusPulse Frontend Control Center                    |
|          (React 19, TypeScript, Vite, Tailwind CSS v4, Recharts)        |
+------------------------------------+------------------------------------+
                                     |  REST API / JSON
                                     v
+-------------------------------------------------------------------------+
|                         FastAPI Backend Engine                          |
|             (Pydantic v2 Validation, Safe CORS Allowlist, REST)         |
+------------------------------------+------------------------------------+
                                     |  SQLAlchemy 2.0 ORM / python-oracledb
                                     v
+-------------------------------------------------------------------------+
|                 Oracle Database 21c XE / Free (PRIMARY)                 |
|           - 3NF / BCNF Schema across 6 Core Relations                   |
|           - Row-Level Locking (SELECT ... FOR UPDATE) for Concurrency   |
|           - PL/SQL Compound Trigger for Mutating-Free Overlap Check     |
|           - Check Constraints, Foreign Keys & Cascading Deletes         |
|           - Pre-compiled Analytics Views (v_dashboard_summary)          |
|           - 8 Performance B-Tree Indexes on Composite Foreign Keys      |
+-------------------------------------------------------------------------+
```

---

## 🗄️ Relational Database Schema & ER Diagram

CampusPulse utilizes a fully normalized (3NF/BCNF) relational schema with constraints enforced directly at the DBMS engine layer:

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "reserves"
    USERS ||--o{ MAINTENANCE_TICKETS : "reports"
    BUILDINGS ||--o{ ROOMS : "contains (1:N)"
    BUILDINGS ||--o{ EVENTS : "hosts (1:N)"
    ROOMS ||--o{ BOOKINGS : "allocated_for (1:N)"
    ROOMS ||--o{ MAINTENANCE_TICKETS : "requires (1:N)"
    ROOMS ||--o{ EVENTS : "holds (0..1:N)"

    USERS {
        int id PK "IDENTITY"
        string name "VARCHAR2(100)"
        string email UK "VARCHAR2(120)"
        string role "CHECK: STUDENT, FACULTY, ADMIN, STAFF"
        string department "VARCHAR2(100)"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    BUILDINGS {
        int id PK "IDENTITY"
        string code UK "VARCHAR2(20)"
        string name "VARCHAR2(100)"
        int floors "CHECK floors > 0"
        float map_x "FLOAT (0-1000)"
        float map_y "FLOAT (0-650)"
        text description "CLOB"
        string status "CHECK: OPERATIONAL, PARTIAL, MAINTENANCE"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    ROOMS {
        int id PK "IDENTITY"
        int building_id FK "REFERENCES BUILDINGS(id) ON DELETE CASCADE"
        string room_number "VARCHAR2(20)"
        int floor "NUMBER"
        int capacity "CHECK capacity > 0"
        string room_type "CHECK: CLASSROOM, LAB, AUDITORIUM, CONFERENCE, STUDY_POD"
        string status "CHECK: AVAILABLE, OCCUPIED, MAINTENANCE"
        bool has_projector "NUMBER(1) CHECK IN (0,1)"
        bool has_ac "NUMBER(1) CHECK IN (0,1)"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    BOOKINGS {
        int id PK "IDENTITY"
        int room_id FK "REFERENCES ROOMS(id) ON DELETE CASCADE"
        int user_id FK "REFERENCES USERS(id) ON DELETE CASCADE"
        string title "VARCHAR2(150)"
        timestamp start_time "TIMESTAMP WITH TIME ZONE"
        timestamp end_time "CHECK end_time > start_time"
        string status "CHECK: CONFIRMED, CANCELLED, COMPLETED"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    MAINTENANCE_TICKETS {
        int id PK "IDENTITY"
        int room_id FK "REFERENCES ROOMS(id) ON DELETE CASCADE"
        int user_id FK "REFERENCES USERS(id) ON DELETE SET NULL"
        string title "VARCHAR2(150)"
        text description "CLOB"
        string priority "CHECK: LOW, MEDIUM, HIGH, CRITICAL"
        string status "CHECK: OPEN, IN_PROGRESS, RESOLVED"
        timestamp reported_at "TIMESTAMP WITH TIME ZONE"
        timestamp resolved_at "TIMESTAMP WITH TIME ZONE"
    }

    EVENTS {
        int id PK "IDENTITY"
        string title "VARCHAR2(150)"
        text description "CLOB"
        int building_id FK "REFERENCES BUILDINGS(id) ON DELETE CASCADE"
        int room_id FK "REFERENCES ROOMS(id) ON DELETE SET NULL"
        timestamp start_time "TIMESTAMP WITH TIME ZONE"
        timestamp end_time "CHECK end_time > start_time"
        string category "CHECK: ACADEMIC, TECH, WORKSHOP, CULTURAL, ATHLETIC"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }
```

---

## ⚡ Core DBMS Concepts Demonstrated (Viva Focus)

CampusPulse demonstrates critical topics in advanced relational database engineering:

### 1. Concurrency Control & Row-Level Locking (`SELECT ... FOR UPDATE`)
To prevent concurrent race conditions where two simultaneous transactions attempt to book the exact same room slot:
- Every booking transaction first issues a pessimistic row lock on the target room:
  ```sql
  SELECT id, status FROM rooms WHERE id = :room_id FOR UPDATE;
  ```
- This serializes concurrent booking operations for that room in Oracle. Transaction $T_2$ blocks until $T_1$ commits or rolls back.
- When $T_2$ acquires the lock, it immediately sees $T_1$'s committed booking and rejects the overlapping request with an informative **HTTP 409 Conflict**.
- If a direct SQL execution attempts an overlapping insert, Oracle's `TRG_NO_OVERLAPPING_BOOKINGS` compound trigger raises application error `-20001`, rolling back the transaction.

### 2. Half-Open Interval Scheduling: `[start_time, end_time)`
Booking overlap condition mathematically defined as:
$$\text{Overlap} \iff \neg \bigl(e_1 \le s_2 \lor s_1 \ge e_2\bigr) \iff (e_1 > s_2) \land (s_1 < e_2)$$
- Back-to-back bookings (e.g., 10:00–11:00 and 11:00–12:00) are permitted without false-positive rejections.
- Cancelled bookings (`status = 'CANCELLED'`) do not block time slots.
  
### 3. Non-Inflating Multi-Table Aggregation with Pre-Aggregated Subqueries
When joining independent one-to-many relationships (e.g., a building has multiple rooms, and rooms have multiple maintenance tickets), a naive `JOIN` causes row multiplication and inflates aggregate counts. CampusPulse utilizes pre-aggregated subqueries:
```sql
SELECT 
    b.code AS building_code,
    b.name AS building_name,
    COALESCE(r_agg.total_rooms, 0) AS total_rooms,
    COALESCE(r_agg.total_capacity, 0) AS total_capacity,
    COALESCE(t_agg.active_tickets, 0) AS active_tickets
FROM buildings b
JOIN (
    SELECT building_id, COUNT(id) AS total_rooms, SUM(capacity) AS total_capacity
    FROM rooms GROUP BY building_id
) r_agg ON b.id = r_agg.building_id
LEFT JOIN (
    SELECT r2.building_id, COUNT(mt.id) AS active_tickets
    FROM maintenance_tickets mt JOIN rooms r2 ON mt.room_id = r2.id
    WHERE mt.status IN ('OPEN', 'IN_PROGRESS')
    GROUP BY r2.building_id
) t_agg ON b.id = t_agg.building_id;
```

### 4. Dynamic Availability via Correlated `NOT EXISTS` Subquery
```sql
SELECT r.room_number, b.name AS building_name, r.room_type, r.capacity, r.status
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.status != 'MAINTENANCE'
  AND NOT EXISTS (
      SELECT 1 FROM bookings bk 
      WHERE bk.room_id = r.id AND bk.status = 'CONFIRMED'
        AND CURRENT_TIMESTAMP BETWEEN bk.start_time AND bk.end_time
  );
```

### 5. Normalized Database Analytics View (`v_dashboard_summary`)
```sql
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
    b.id AS building_id,
    b.code AS building_code,
    b.name AS building_name,
    COUNT(r.id) AS total_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'AVAILABLE' THEN 1 ELSE 0 END), 0) AS available_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END), 0) AS occupied_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'MAINTENANCE' THEN 1 ELSE 0 END), 0) AS maintenance_rooms,
    ROUND(CASE WHEN COUNT(r.id) > 0 THEN (SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END) / COUNT(r.id)) * 100 ELSE 0 END, 2) AS occupancy_rate
FROM buildings b
LEFT JOIN rooms r ON b.id = r.building_id
GROUP BY b.id, b.code, b.name, b.floors, b.status;
```

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Database** | Oracle Database (XE / Free / Cloud) | 21c (21.3+) | Primary authoritative relational database |
| **DB Driver** | `python-oracledb` | 26.0+ | Official Python-Oracle driver (Thin Mode) |
| **ORM** | SQLAlchemy | 2.1+ | Unit of work, Declarative Base, Session management |
| **Backend** | FastAPI | 0.162+ | Asynchronous RESTful API framework |
| **Validation** | Pydantic v2 | 2.14+ | Schema parsing, strict type enforcement |
| **Frontend** | React, TypeScript, Vite | 19.x / Vite 8.x | Dynamic Control Matrix UI & SVG Map Twin |
| **Styling** | Tailwind CSS v4 | 4.x | Dark cyberpunk interface with neon telemetry |
| **Charts** | Recharts | 3.x | Real-time booking trends and occupancy charts |

---

## 🚀 Setup & Execution Guide

### Prerequisites
- **Python**: 3.10, 3.11, or 3.12
- **Node.js**: 18+ and npm
- **Oracle Database**: Oracle Database 21c Express Edition (XE), Oracle Free, or Cloud Autonomous Database.
  *(Ensure services `OracleServiceXE` and `OracleOraDB21Home1TNSListener` are running).*

---

### Step 1: Environment Configuration (`.env`)

Verify your `.env` in the project root:
```ini
DATABASE_URL=oracle+oracledb://campuspulse:campuspulse123@localhost:1521/?service_name=XEPDB1
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000","http://127.0.0.1:3000"]
```

---

### Step 2: Database Initialization & Seeding

Deploy schema DDL and populate seed data:
```powershell
backend\venv\Scripts\python.exe backend\scripts\init_db.py
```

Alternatively, compile directly in SQL\*Plus:
```powershell
sqlplus campuspulse/campuspulse123@localhost:1521/XEPDB1 @backend\scripts\oracle_schema.sql
```

---

### Step 3: Schema Integrity Verification

Execute the automated verification tool to audit all 9 schema criteria:
```powershell
backend\venv\Scripts\python.exe backend\scripts\verify_db.py
```
*Expected Result*: Exit code `0` (ALL CHECKS PASSED).

---

### Step 4: Run the 20 SQL Syllabus Demonstrations

Execute the full collection of 20 syllabus demonstration queries in SQL\*Plus:
```powershell
sqlplus campuspulse/campuspulse123@localhost:1521/XEPDB1 @backend\scripts\sql_demonstrations.sql
```

---

### Step 5: Start the Backend Server

```powershell
backend\venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000
```
- Interactive API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Healthcheck Endpoint: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### Step 6: Start the Frontend Application

```powershell
cd frontend
npm.cmd run dev
```
Access the control center at: **[http://localhost:5173/](http://localhost:5173/)**

To test production compilation:
```powershell
npm.cmd run build
```

---

## 🧪 Automated Test Suite (38 Tests)

CampusPulse includes 38 comprehensive automated tests:

```powershell
# Run the complete test suite against Oracle Database 21c:
backend\venv\Scripts\pytest -v
```

### Test Coverage Highlights:
- **`backend/tests/test_api.py` (16 tests)**: API endpoints, root, health, dashboard stats, filter queries, not-exists availability, event validation, maintenance state machine.
- **`backend/tests/test_concurrency.py` (1 test)**: 4 parallel threads targeting the same room; asserts exactly 1 success (201) and 3 conflicts (409) with zero duplicate records.
- **`backend/tests/test_database_integrity.py` (12 tests)**: Foreign keys, unique constraints, check constraints, offline room booking blocks, direct SQL compound trigger enforcement (`ORA-20001`), transaction atomicity & rollback verification.
- **`backend/tests/test_oracle_integration.py` (5 tests)**: `USER_TABLES`, `USER_TRIGGERS`, `USER_VIEWS`, and `SELECT ... FOR UPDATE` locking on Oracle.
- **`backend/tests/test_sql_demonstrations.py` (4 tests)**: Verifies that syllabus queries execute cleanly on Oracle.

---

## 📸 Key Application Screenshots to Capture for Submission

When submitting project reports or presenting slides, capture the following screens:

| File Name | Screen Description | Key Visible Elements |
| :--- | :--- | :--- |
| `screenshot-01-dashboard.png` | **Operations Overview** | Building metrics, active booking trends area chart, building occupancy bars, recent telemetry. |
| `screenshot-02-campus-map.png` | **Spatial Digital Twin** | Vector campus map, interactive building polygon selection, floor-by-floor room selector. |
| `screenshot-03-room-details.png` | **Room Inspector Modal** | Room 101 Turing Auditorium, capacity (180), active session, upcoming reservations list. |
| `screenshot-04-bookings-view.png` | **Booking Matrix & Conflict Modal** | Reservation table, "+ New Reservation" modal, and the prominent red **HTTP 409 Conflict rejection** alert. |
| `screenshot-05-maintenance.png` | **Maintenance Dispatch** | Open/In-Progress work order cards, status transition buttons, priority badges (Critical, High). |
| `screenshot-06-events.png` | **Campus Events Hub** | Chronological event timeline, category filter chips (Tech, Academic, Cultural). |
| `screenshot-07-dbms-studio.png` | **DBMS Viva Query Workbench** | Query selector tabs, live SQL statement viewer, latency measurement badge, tabular results. |
| `screenshot-08-sqlplus-verification.png`| **SQL\*Plus Schema Execution** | Terminal running `verify_db.py` showing `VERIFICATION RESULT: ALL CHECKS PASSED (EXIT CODE 0)`. |

---

## 📂 Project Directory Structure

```
CampusPulse/
├── DATABASE_DESIGN.md            <- Relational model, FDs, 1NF-BCNF proofs, ER diagram
├── SQL_CONCEPTS.md               <- 20 syllabus SQL query guides with sample outputs
├── ORACLE_DATABASE_GUIDE.md      <- Oracle 21c XE setup, PDB, user provisioning, pooling
├── TRANSACTION_AND_CONCURRENCY.md<- ACID proofs, row-locking, compound trigger mechanics
├── TESTING_REPORT.md             <- QA audit of all 38 automated tests (100% pass)
├── PROJECT_DEMONSTRATION.md      <- Step-by-step viva presentation script
├── README.md                     <- Primary project documentation
├── .env.example                  <- Environment configuration template
├── conftest.py                   <- Pytest bootstrap with Oracle connection auto-detection
├── pytest.ini                    <- Pytest configuration
├── backend/
│   ├── app/
│   │   ├── config.py             <- Pydantic Settings & URL maskers
│   │   ├── database.py           <- SQLAlchemy engine & oracledb pool setup
│   │   ├── main.py               <- FastAPI application router registry & CORS
│   │   ├── models/entities.py    <- Declarative ORM models & table constraints
│   │   ├── routers/              <- Modular API endpoints (8 routers)
│   │   ├── schemas/schemas.py    <- Pydantic request/response schemas
│   │   └── services/campus_service.py <- Core business logic, row locks, ACID transactions
│   ├── scripts/
│   │   ├── oracle_schema.sql     <- Authoritative Oracle 21c DDL script
│   │   ├── sql_demonstrations.sql<- 20 syllabus SQL demonstration queries
│   │   ├── create_oracle_user.sql<- SQL script to provision user campuspulse
│   │   ├── init_db.py            <- Database initialization & idempotent seeder
│   │   ├── verify_db.py          <- 9-point Oracle schema integrity auditor
│   │   ├── drop_tables.sql       <- Cascade drop helper
│   │   └── schema.sql            <- PostgreSQL secondary script
│   └── tests/
│       ├── test_api.py           <- REST API integration tests (16 tests)
│       ├── test_concurrency.py   <- Multi-threaded row-locking stress test (1 test)
│       ├── test_database_integrity.py <- FK, Check, Unique, ACID rollback tests (12 tests)
│       ├── test_oracle_integration.py <- Oracle dictionary & trigger tests (5 tests)
│       └── test_sql_demonstrations.py <- Automated syllabus query tests (4 tests)
└── frontend/
    ├── package.json              <- Vite, React 19, Tailwind CSS v4, Lucide
    ├── src/
    │   ├── App.tsx               <- Main control matrix component
    │   ├── components/           <- 8 modular cyberpunk UI components
    │   │   ├── DashboardView.tsx
    │   │   ├── CampusMap.tsx
    │   │   ├── RoomsView.tsx
    │   │   ├── BookingsView.tsx
    │   │   ├── MaintenanceView.tsx
    │   │   ├── EventsView.tsx
    │   │   ├── DbmsStudioView.tsx
    │   │   ├── Navbar.tsx
    │   │   └── Sidebar.tsx
    │   ├── services/api.ts       <- Typed REST API client
    │   └── types/index.ts        <- TypeScript interfaces
    └── dist/                     <- Production build bundle
```
