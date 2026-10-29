# CampusPulse — Smart Campus Digital Twin
### Enterprise Relational DBMS Semester Project & Spatial Operations Control Center

CampusPulse is a smart campus operations platform and spatial digital twin. Designed as a comprehensive database management systems (DBMS) semester project, it models university infrastructure, spatial floor plans, room allocations, conflict-free scheduling, maintenance workflows, and real-time SQL analytics using **Oracle Database 21c as the primary and authoritative database**.

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
|           - 3NF Normalized Schema across 6 Core Relations               |
|           - Row-Level Locking (SELECT ... FOR UPDATE) for Concurrency   |
|           - PL/SQL Compound Trigger for Overlap Prevention              |
|           - Check Constraints, Foreign Keys & Cascading Deletes         |
|           - Pre-compiled Analytics Views (v_dashboard_summary)          |
|           - Performance B-Tree Indexes on Composite Foreign Keys        |
+-------------------------------------------------------------------------+
```

---

## 🗄️ Relational Database Schema & ER Diagram

CampusPulse utilizes a fully normalized (3NF) relational schema with integrity constraints enforced directly at the DBMS engine layer:

```mermaid
erDiagram
    users ||--o{ bookings : "reserves"
    users ||--o{ maintenance_tickets : "reports"
    buildings ||--o{ rooms : "contains"
    buildings ||--o{ events : "hosts"
    rooms ||--o{ bookings : "allocated_for"
    rooms ||--o{ maintenance_tickets : "requires"
    rooms ||--o{ events : "holds"

    users {
        int id PK "IDENTITY(1,1)"
        string name "VARCHAR2(100)"
        string email UK "VARCHAR2(120)"
        string role "CHECK ('STUDENT','FACULTY','ADMIN','STAFF')"
        string department "VARCHAR2(100)"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    buildings {
        int id PK "IDENTITY(1,1)"
        string code UK "VARCHAR2(20)"
        string name "VARCHAR2(100)"
        int floors "CHECK floors > 0"
        float map_x "FLOAT (0-100)"
        float map_y "FLOAT (0-100)"
        text description "TEXT / CLOB"
        string status "CHECK ('OPERATIONAL','PARTIAL','MAINTENANCE')"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    rooms {
        int id PK "IDENTITY(1,1)"
        int building_id FK "REFERENCES buildings(id) ON DELETE CASCADE"
        string room_number "VARCHAR2(20)"
        int floor "INTEGER"
        int capacity "CHECK capacity > 0"
        string room_type "CHECK ('CLASSROOM','LAB','AUDITORIUM','CONFERENCE','STUDY_POD')"
        string status "CHECK ('AVAILABLE','OCCUPIED','MAINTENANCE')"
        bool has_projector "BOOLEAN / NUMBER(1)"
        bool has_ac "BOOLEAN / NUMBER(1)"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    bookings {
        int id PK "IDENTITY(1,1)"
        int room_id FK "REFERENCES rooms(id) ON DELETE CASCADE"
        int user_id FK "REFERENCES users(id) ON DELETE CASCADE"
        string title "VARCHAR2(150)"
        timestamp start_time "TIMESTAMP WITH TIME ZONE"
        timestamp end_time "CHECK end_time > start_time"
        string status "CHECK ('CONFIRMED','CANCELLED','COMPLETED')"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    maintenance_tickets {
        int id PK "IDENTITY(1,1)"
        int room_id FK "REFERENCES rooms(id) ON DELETE CASCADE"
        int user_id FK "REFERENCES users(id) ON DELETE SET NULL"
        string title "VARCHAR2(150)"
        text description "TEXT / CLOB"
        string priority "CHECK ('LOW','MEDIUM','HIGH','CRITICAL')"
        string status "CHECK ('OPEN','IN_PROGRESS','RESOLVED')"
        timestamp reported_at "TIMESTAMP WITH TIME ZONE"
        timestamp resolved_at "TIMESTAMP WITH TIME ZONE"
    }

    events {
        int id PK "IDENTITY(1,1)"
        string title "VARCHAR2(150)"
        text description "TEXT / CLOB"
        int building_id FK "REFERENCES buildings(id) ON DELETE CASCADE"
        int room_id FK "REFERENCES rooms(id) ON DELETE SET NULL"
        timestamp start_time "TIMESTAMP WITH TIME ZONE"
        timestamp end_time "CHECK end_time > start_time"
        string category "CHECK ('ACADEMIC','TECH','WORKSHOP','CULTURAL','ATHLETIC')"
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

```math
\text{Overlap} \iff \neg \left(
\text{existing.end\_time} \leq \text{new.start\_time}
\lor
\text{existing.start\_time} \geq \text{new.end\_time}
\right)
```

**Equivalent simplified condition:**

```math
\text{Overlap} \iff
(\text{existing.start\_time} < \text{new.end\_time})
\land
(\text{new.start\_time} < \text{existing.end\_time})
```

- Back-to-back bookings (e.g., 10:00–11:00 and 11:00–12:00) are permitted without false-positive rejections.
- Cancelled bookings (`status = 'CANCELLED'`) do not block time slots.
  
### 3. Non-Inflating Multi-Table Aggregation with Pre-Aggregated Subqueries
When joining independent one-to-many relationships (e.g., a building has multiple rooms, and rooms have multiple maintenance tickets), a naive `JOIN` causes row multiplication and inflates aggregate counts:
```sql
SELECT 
    b.code AS building_code,
    b.name AS building_name,
    COALESCE(r_agg.total_rooms, 0) AS total_rooms,
    COALESCE(r_agg.total_capacity, 0) AS total_capacity,
    COALESCE(r_agg.avg_room_capacity, 0.0) AS avg_room_capacity,
    COALESCE(t_agg.active_tickets, 0) AS active_tickets
FROM buildings b
JOIN (
    SELECT 
        building_id,
        COUNT(id) AS total_rooms,
        SUM(capacity) AS total_capacity,
        ROUND(AVG(capacity), 1) AS avg_room_capacity
    FROM rooms
    GROUP BY building_id
) r_agg ON b.id = r_agg.building_id
LEFT JOIN (
    SELECT 
        r2.building_id,
        COUNT(mt.id) AS active_tickets
    FROM maintenance_tickets mt
    JOIN rooms r2 ON mt.room_id = r2.id
    WHERE mt.status IN ('OPEN', 'IN_PROGRESS')
    GROUP BY r2.building_id
) t_agg ON b.id = t_agg.building_id
ORDER BY total_capacity DESC;
```

### 4. Dynamic Availability via Correlated `NOT EXISTS` Subquery
```sql
SELECT r.room_number, b.name AS building_name, r.room_type, r.capacity, r.status
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.status != 'MAINTENANCE'
  AND NOT EXISTS (
      SELECT 1 
      FROM bookings bk 
      WHERE bk.room_id = r.id 
        AND bk.status = 'CONFIRMED'
        AND CURRENT_TIMESTAMP BETWEEN bk.start_time AND bk.end_time
  )
ORDER BY r.capacity DESC;
```

### 5. Normalized Database Analytics View (`v_dashboard_summary`)
```sql
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
    b.id AS building_id,
    b.code AS building_code,
    b.name AS building_name,
    b.floors,
    b.status AS building_status,
    COUNT(r.id) AS total_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'AVAILABLE' THEN 1 ELSE 0 END), 0) AS available_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END), 0) AS occupied_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'MAINTENANCE' THEN 1 ELSE 0 END), 0) AS maintenance_rooms,
    ROUND(
        CASE 
            WHEN COUNT(r.id) > 0 THEN (SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END) / COUNT(r.id)) * 100 
            ELSE 0 
        END, 2
    ) AS occupancy_rate
FROM buildings b
LEFT JOIN rooms r ON b.id = r.building_id
GROUP BY b.id, b.code, b.name, b.floors, b.status;
```

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Database** | Oracle Database (XE / Free / Cloud) | 21c | Primary authoritative relational database |
| **DB Driver** | `python-oracledb` | 26.0+ | High-performance Python-Oracle driver |
| **ORM** | SQLAlchemy | 2.1+ | Unit of work, Declarative Base, Transactions |
| **Backend** | FastAPI | 0.162+ | Asynchronous RESTful API framework |
| **Validation** | Pydantic v2 | 2.14+ | Schema parsing, strict type enforcement |
| **Frontend** | React, TypeScript, Vite | 19.x / Vite 8.x | Dynamic Control Matrix UI & SVG Map Twin |
| **Styling** | Tailwind CSS v4 | 4.x | Dark cyberpunk interface with neon telemetry |
| **Charts** | Recharts | 2.x | Real-time booking trends and occupancy charts |

---

## 🚀 Setup & Execution Guide

### Prerequisites
- **Python**: 3.10, 3.11, or 3.12
- **Node.js**: 18+ and npm
- **Oracle Database**: Oracle Database 21c Express Edition (XE), Oracle Free, or Oracle Cloud Autonomous Database.
  *(Windows services `OracleServiceXE` and `OracleOraDB21Home1TNSListener` must be running).*

---

### Step 1: Environment Configuration (`.env`)

Copy `.env.example` to `.env` in the project root:
```powershell
Copy-Item .env.example .env
```

Configure your Oracle connection string in `.env`:
```ini
# Oracle Connection URL Format:
DATABASE_URL=oracle+oracledb://campuspulse:your_password@localhost:1521/?service_name=XEPDB1

# CORS Allowed Origins:
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000","http://127.0.0.1:3000"]
```

> **Important URL-Encoding Note:**
> If your Oracle password contains special characters (`@`, `#`, `$`, `/`, `:`, `%`), they must be percent-encoded:
> - `@` $\to$ `%40`
> - `#` $\to$ `%23`
> - `$` $\to$ `%24`
> - `/` $\to$ `%2F`

---

### Step 2: Backend Dependency Installation

Activate your Python virtual environment and install dependencies:
```powershell
# Using the existing venv:
backend\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

---

### Step 3: Database Initialization & Seeding

Run the idempotent initialization script:
```powershell
backend\venv\Scripts\python.exe backend\scripts\init_db.py
```
This command:
1. Verifies connectivity to Oracle Database.
2. Creates all 6 normalized relational tables with check constraints and primary/foreign keys.
3. Compiles views (`v_dashboard_summary`, `v_room_live_status`) and the compound trigger (`trg_no_overlapping_bookings`).
4. Creates composite performance indexes.
5. Seeds the demonstration dataset (5 buildings, 25 rooms, 10 users, 12 bookings, 6 tickets, 6 events) without duplicating records on re-runs.

---

### Step 4: Schema Integrity Verification

Execute the dedicated verification command:
```powershell
backend\venv\Scripts\python.exe backend\scripts\verify_db.py
```
Checks:
- [x] Oracle connection ping
- [x] `USER_TABLES` existence
- [x] `USER_VIEWS` existence and `VALID` compilation status
- [x] `USER_TRIGGERS` active status (`ENABLED` and `VALID`)
- [x] Primary, foreign, check, and unique constraints in `USER_CONSTRAINTS`
- [x] Performance indexes in `USER_INDEXES`
- [x] Seed data counts and zero orphaned foreign keys
- [x] Successful query execution against `v_dashboard_summary`

Exits with code `0` on success, `1` on failure.

---

### Step 5: Start the FastAPI Backend Server

```powershell
backend\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```
- Interactive API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Healthcheck Endpoint: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### Step 6: Start the Frontend Application

```powershell
cd frontend
npm.cmd run dev -- --host 127.0.0.1
```
Access the dark control center dashboard at: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

To compile a production bundle:
```powershell
npm.cmd run build
```

---

## 🧪 Automated Test Suite

CampusPulse includes 22 automated tests covering unit logic, concurrency, database views, and Oracle integration:

```powershell
# Run full test suite:
backend\venv\Scripts\python.exe -m pytest -v
```

The suite needs no database setup: `conftest.py` seeds a throwaway SQLite database through
`init_db.py` before the app is imported, so the mutating tests (bookings, tickets, events) never
touch the Oracle schema configured in `.env`. To run against a specific engine instead, set
`DATABASE_URL` first — the 5 Oracle metadata tests then run rather than skipping.

### Test Coverage Summary:
- **`test_health` & `test_root`**: API availability.
- **`test_dashboard_stats` & `test_buildings_endpoint`**: Multi-table aggregation verification.
- **`test_rooms_list_and_filters`**: Filter queries by room type and capacity.
- **`test_not_exists_availability_query`**: NOT EXISTS subquery for conflict-free rooms.
- **`test_booking_creation_and_conflict_rejection`**: Verifies HTTP 409 rejection on overlapping intervals and slot reuse upon cancellation.
- **`test_back_to_back_bookings_accepted`**: Verifies half-open interval rule $[10:00, 11:00)$ and $[11:00, 12:00)$.
- **`test_different_rooms_concurrent_bookings`**: Verifies parallel bookings in different rooms succeed.
- **`test_invalid_booking_time_interval`**: Rejects invalid end $\le$ start with HTTP 400.
- **`test_maintenance_room_status_transitions`**: Verifies that resolving 1 of multiple tickets retains room in MAINTENANCE, and resolving the final ticket restores AVAILABLE/OCCUPIED.
- **`test_event_validation_and_room_building_consistency`**: Rejects room-building mismatches with HTTP 400.
- **`test_analytics_queries` & `test_analytics_unknown_query_404`**: Verifies all 5 DBMS Studio queries and confirms HTTP 404 for unknown query IDs.
- **`test_analytics_aggregation_no_multiplication`**: Regression check proving room counts are not multiplied by tickets.
- **`test_dashboard_view_regression`**: Verifies `v_dashboard_summary` view executes.
- **`test_concurrent_booking_conflict`**: Multi-threaded concurrency stress test verifying exactly 1 booking succeeds while 3 parallel requests receive HTTP 409.
- **`test_oracle_integration`**: Verifies Oracle metadata, triggers, views, and row-level locking.

---

## 📡 REST API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status |
| `GET` | `/api/dashboard` | Live statistics, booking trends, and building occupancy |
| `GET` | `/api/buildings` | List buildings with aggregated room counters |
| `GET` | `/api/buildings/{id}` | Building metadata with room allocations |
| `GET` | `/api/rooms` | Filter rooms by building, type, capacity, or search |
| `GET` | `/api/rooms/available` | Correlated `NOT EXISTS` query for conflict-free rooms |
| `GET` | `/api/rooms/{id}` | Room details with active bookings & ticket status |
| `GET` | `/api/bookings` | List bookings with room, building, and user join |
| `POST` | `/api/bookings` | Create booking with pessimistic row-locking conflict prevention |
| `POST` | `/api/bookings/{id}/cancel` | Cancel an active booking |
| `GET` | `/api/maintenance` | List maintenance tickets filtered by status & priority |
| `POST` | `/api/maintenance` | Create maintenance ticket (CRITICAL sets room to MAINTENANCE) |
| `PATCH`| `/api/maintenance/{id}/status`| Update ticket status (resolving restores room status) |
| `GET` | `/api/events` | List upcoming campus events (deterministic ordering) |
| `POST` | `/api/events` | Schedule campus event with room-building verification |
| `GET` | `/api/users` | List university users |
| `GET` | `/api/analytics/queries` | Catalog of DBMS demonstration queries |
| `POST`| `/api/analytics/execute/{id}` | Execute demonstration SQL query with execution latency |

---

## 🔧 Troubleshooting Guide

| Issue | Cause | Solution |
|---|---|---|
| **ORA-12541 / Connection Refused** | Oracle TNS Listener not running | Start the Windows service `OracleOraDB21Home1TNSListener` via `Get-Service *oracle* \| Start-Service`. |
| **ORA-01017: Invalid Username/Password** | Special characters in credentials | URL-encode special characters in `DATABASE_URL` (e.g. `@` as `%40`). |
| **ORA-02014: Cannot SELECT FOR UPDATE** | Query combined `FETCH FIRST` with `FOR UPDATE` | Use primary-key lookup with `one_or_none()` without `.limit(1)`. |
| **ORA-01408: Column list already indexed** | Redundant index on indexed FK | Composite indexes check existing columns and avoid duplicates. |
| **Missing `v_dashboard_summary` in SQLite** | Views only generated on Oracle/Postgres DDL | Run `init_db.py`, which creates `v_dashboard_summary` and `v_room_live_status` in SQLite. |
| **PowerShell script execution disabled** | Windows ExecutionPolicy restricts `.ps1` | Use `npm.cmd run build` and `backend\venv\Scripts\python.exe` directly. |
