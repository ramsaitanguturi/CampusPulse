# CampusPulse — Smart Campus Digital Twin
### Enterprise Relational DBMS Semester Project & Spatial Operations Control Center

[![Database](https://img.shields.io/badge/Database-Oracle%2021c%20XE%20%2F%20Free-red.svg)](https://www.oracle.com/database/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20SQLAlchemy%202.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript%20%2B%20Vite-61DAFB.svg)](https://react.dev/)
[![Oracle Tests](https://img.shields.io/badge/Oracle%2021c%20Suite-45%20Passed%20%2F%200%20Failed-brightgreen.svg)](TESTING_REPORT.md)
[![SQLite Fallback](https://img.shields.io/badge/SQLite%20Fallback-27%20Passed%20%2F%2018%20Skipped-blue.svg)](TESTING_REPORT.md)
[![Schema](https://img.shields.io/badge/Normalization-3NF%20%26%20BCNF%20Compliant-blue.svg)](DATABASE_DESIGN.md)

**CampusPulse** is an enterprise-grade smart campus operations platform and spatial digital twin. Designed as a comprehensive database management systems (DBMS) semester project, it models university infrastructure, spatial floor plans, room allocations, conflict-free scheduling, maintenance workflows, and real-time SQL analytics using **Oracle Database 21c as the primary and authoritative database backend**.

---

## 📋 Table of Contents

- [1. Project Overview](#1-project-overview)
  - [Core Features](#core-features)
  - [Technology Stack](#technology-stack)
- [2. System Architecture](#2-system-architecture)
- [3. Relational Database Schema & ER Diagram](#3-relational-database-schema--er-diagram)
- [4. Academic Documentation Index](#4-academic-documentation-index)
- [5. Core DBMS Concepts Demonstrated (Viva Focus)](#5-core-dbms-concepts-demonstrated-viva-focus)
- [6. Prerequisites & Environment Verification](#6-prerequisites--environment-verification)
- [7. Clone the Repository](#7-clone-the-repository)
- [8. Backend Setup](#8-backend-setup)
- [9. Frontend Setup](#9-frontend-setup)
- [10. Oracle Database Configuration](#10-oracle-database-configuration)
  - [Option A: Individual Local Oracle Database](#option-a-individual-local-oracle-database)
  - [Option B: Shared Team Oracle Database](#option-b-shared-team-oracle-database)
  - [Connection String Breakdown](#connection-string-breakdown)
  - [URL-Encoding Special Characters](#url-encoding-special-characters)
- [11. Environment Variables Configuration](#11-environment-variables-configuration)
- [12. Database Initialization & Schema Provisioning](#12-database-initialization--schema-provisioning)
  - [Schema Provisioning Workflow](#schema-provisioning-workflow)
  - [Schema Integrity Audit](#schema-integrity-audit)
- [13. Running CampusPulse](#13-running-campuspulse)
  - [Starting Backend](#starting-the-backend-server)
  - [Starting Frontend](#starting-the-frontend-client)
  - [Service Endpoints & Verification](#service-endpoints--communication-verification)
- [14. Testing & Quality Verification Suite](#14-testing--quality-verification-suite)
  - [Backend Test Suite](#backend-test-suite)
  - [Frontend Verification](#frontend-verification)
  - [Evaluation Modes (Oracle vs SQLite Fallback)](#automated-evaluation-modes)
- [15. GitHub Team Collaboration Workflow](#15-github-team-collaboration-workflow)
  - [Standard Team Workflow](#standard-team-workflow)
  - [Branching & Pull Request Guidelines](#branching--pull-request-guidelines)
  - [Files Excluded from Git](#files-excluded-from-git)
- [16. Troubleshooting Guide](#16-troubleshooting-guide)
- [17. Application Screenshots](#17-key-application-screenshots-to-capture-for-submission)
- [18. Project Directory Structure](#18-project-directory-structure)

---

## 1. Project Overview

CampusPulse is a centralized smart-campus command center and spatial digital twin built to manage facilities, schedules, and operations across university grounds. Designed from the ground up to showcase advanced relational database principles, the system demonstrates how enterprise database engines solve real-world concurrent booking conflicts, handle spatial hierarchies, enforce referential integrity, and generate real-time operational intelligence.

### Core Features

- **Spatial Campus Digital Twin**: Interactive 2D vector map rendering university buildings with coordinates, floor plans, real-time occupancy counts, and dynamic status indicators (Operational, Partial, Maintenance).
- **Conflict-Free Interval Scheduling**: Sub-millisecond room reservation engine backed by half-open temporal intervals `[start_time, end_time)` and database-level pessimistic row locks (`SELECT ... FOR UPDATE`) preventing concurrent double-booking race conditions.
- **Mutating-Free PL/SQL Compound Trigger**: An Oracle compound trigger (`trg_no_overlapping_bookings`) executing cross-row interval overlap validation without triggering `ORA-04091 mutating-table` exceptions.
- **Facility Maintenance Dispatch System**: End-to-end work order lifecycle tracker managing room repairs across priorities (Low, Medium, High, Critical) and states (Open, In Progress, Resolved).
- **Dynamic Facility Availability Engine**: Correlated SQL subqueries utilizing `NOT EXISTS` to calculate instantaneous room availability against active confirmed reservations.
- **DBMS Viva Studio**: Interactive embedded SQL workbench with pre-compiled queries covering 20 essential DBMS curriculum topics (nested subqueries, joins, aggregations, window functions, and views) complete with live execution telemetry.

### Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 19.3+ | Component-driven user interface and reactive state management |
| **Programming Language** | TypeScript | 6.0+ | Strict type safety across UI models, API responses, and client services |
| **Build Tool & Dev Server**| Vite | 8.3+ | Lightning-fast Hot Module Replacement (HMR) and optimized Rollup bundling |
| **UI Styling** | Tailwind CSS v4 | 4.3+ | Dark cyberpunk high-density operational aesthetic with neon telemetry |
| **Data Visualization** | Recharts | 3.10+ | Real-time booking trends, building occupancy charts, and metrics |
| **Backend Framework** | FastAPI | 0.110+ | Asynchronous RESTful API with automated OpenAPI / Swagger documentation |
| **Backend Runtime** | Python | 3.10 – 3.12 | Core backend language runtime (Python 3.12 recommended) |
| **ORM & Persistence** | SQLAlchemy | 2.0+ | Enterprise Unit-of-Work, Declarative Base, and connection pooling |
| **Database Engine** | Oracle Database 21c XE | 21.3+ | Primary authoritative relational database engine with PDB `XEPDB1` |
| **Oracle Driver** | `python-oracledb` | 2.1+ / 26.0+ | Official Python-Oracle driver running in zero-client **Thin Mode** |
| **Data Validation** | Pydantic v2 | 2.6+ | Strict request payload validation and type coercion |
| **Testing** | Pytest | 8.1+ | Automated test runner with multi-threaded concurrency audits |

---

## 2. System Architecture

```
+-------------------------------------------------------------------------+
|                  CampusPulse Frontend Control Center                    |
|          (React 19, TypeScript, Vite, Tailwind CSS v4, Recharts)        |
+------------------------------------+------------------------------------+
                                     |  REST API / JSON (/api)
                                     v  [Vite Dev Proxy :5173 -> :8000]
+-------------------------------------------------------------------------+
|                         FastAPI Backend Engine                          |
|             (Pydantic v2 Validation, Safe CORS Allowlist, REST)         |
+------------------------------------+------------------------------------+
                                     |  SQLAlchemy 2.0 ORM / python-oracledb
                                     v  (Thin Mode Connection Pool)
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

## 3. Relational Database Schema & ER Diagram

CampusPulse implements a fully normalized (3NF/BCNF) relational schema with constraints enforced directly at the DBMS engine layer:

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

## 4. Academic Documentation Index

All required academic evaluation documents are maintained in the repository root:

1. **[DATABASE_DESIGN.md](DATABASE_DESIGN.md)**: Full Relational Model, 6 Entity Descriptions, Primary/Foreign Keys, Referential Actions, Functional Dependencies, and 1NF/2NF/3NF/BCNF Normalization Proofs.
2. **[SQL_CONCEPTS.md](SQL_CONCEPTS.md)**: Comprehensive explanation of all 20 applied SQL syllabus concepts with executable queries and output breakdowns.
3. **[ORACLE_DATABASE_GUIDE.md](ORACLE_DATABASE_GUIDE.md)**: Production guide for Oracle Database 21c XE, Pluggable DB (`XEPDB1`), schema compilation, user provisioning, and connection pool tuning.
4. **[TRANSACTION_AND_CONCURRENCY.md](TRANSACTION_AND_CONCURRENCY.md)**: In-depth analysis of ACID properties, pessimistic row-level locking (`SELECT ... FOR UPDATE`), mutating-table resolution via Oracle Compound Triggers, and concurrency stress tests.
5. **[TESTING_REPORT.md](TESTING_REPORT.md)**: Technical testing audit detailing all 45 automated test cases, environments, and 100% passing results against Oracle 21c (as well as offline SQLite fallback verification).
6. **[PROJECT_DEMONSTRATION.md](PROJECT_DEMONSTRATION.md)**: Step-by-step viva script and professor demonstration walkthrough with exact instructions and talking points.

---

## 5. Core DBMS Concepts Demonstrated (Viva Focus)

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

## 6. Prerequisites & Environment Verification

Before setting up CampusPulse, ensure all required software packages are installed on your computer:

1. **Git**: Distributed version control system ([git-scm.com](https://git-scm.com/)).
2. **Python (3.10, 3.11, or 3.12)**: 64-bit Python runtime with `pip` and `venv` ([python.org](https://www.python.org/downloads/)).
3. **Node.js (v18+) & npm**: JavaScript runtime and package manager ([nodejs.org](https://nodejs.org/)).
4. **Oracle Database 21c Express Edition (XE) or Oracle Free**: Primary database engine ([oracle.com](https://www.oracle.com/database/technologies/xe-downloads.html)).
5. **Oracle SQL Developer (Recommended)**: Free graphical interface for inspecting schema objects, tablespaces, and running ad-hoc queries ([oracle.com](https://www.oracle.com/database/sqldeveloper/)).
6. **Code Editor**: [Visual Studio Code](https://code.visualstudio.com/) (recommended) with Python, ESLint, and Tailwind CSS extensions.

### Installation Verification Commands

Open a Windows PowerShell terminal and run:

```powershell
git --version
python --version
node --version
npm.cmd --version
```

> [!NOTE]
> On Windows PowerShell, `npm` may trigger a script execution error (`PSSecurityException`) if `.ps1` execution is disabled. Using `npm.cmd` invokes the command directly and bypasses PowerShell script execution policies.

#### Expected Output:
```text
git version 2.40.0.windows.1 (or higher)
Python 3.12.10 (or 3.10.x / 3.11.x)
v18.20.0 (or v20.x / v22.x / v24.x)
10.x.x (or 11.x.x)
```

#### Oracle Windows Services Check:
If running Oracle locally, verify that both the database engine and the TNS listener services are active:

```powershell
Get-Service *oracle* | Select-Object Name, Status, DisplayName
```

Expected output:
```text
Status   Name                                DisplayName
------   ----                                -----------
Running  OracleOraDB21Home1TNSListener       OracleOraDB21Home1TNSListener
Running  OracleServiceXE                     OracleServiceXE
```

If either service is stopped, start it via PowerShell as Administrator:
```powershell
Start-Service OracleServiceXE
Start-Service OracleOraDB21Home1TNSListener
```

---

## 7. Clone the Repository

Clone the project repository to your local machine using Git:

```powershell
git clone https://github.com/ramsaitanguturi/CampusPulse-.git
cd CampusPulse
```

> [!NOTE]
> Replace `https://github.com/ramsaitanguturi/CampusPulse-.git` with your team's designated repository URL if using a shared fork or internal repository.

Verify that your current working directory is the repository root:
```powershell
Get-ChildItem
```
You should see `backend/`, `frontend/`, `.env.example`, `README.md`, and the academic specification markdown files.

---

## 8. Backend Setup

The backend engine requires an isolated Python virtual environment (`venv`) to ensure dependencies do not conflict with system-level packages.

### Step 1: Create Virtual Environment

Navigate into the `backend` folder and create the virtual environment:

```powershell
cd backend
python -m venv venv
```

### Step 2: Install Backend Dependencies

From inside the `backend` directory, install all required packages using the virtual environment's Python executable:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

> [!TIP]
> **Directory Context & Command Paths**:
> - **Inside `backend/` directory**: Run `.\venv\Scripts\python.exe -m pip install -r requirements.txt`.
> - **From repository root (`CampusPulse/`)**: Run `backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt`.
> - The path `..\backend\venv\Scripts\python.exe` is only used if your terminal is located in a sibling folder (such as `frontend/`). Always use the path that matches your current active folder.

### Step 3: Running Commands Without PowerShell Script Activation

Windows PowerShell may block running activation scripts (`venv\Scripts\Activate.ps1`) with the following security error:
```text
File ...\venv\Scripts\Activate.ps1 cannot be loaded because running scripts is disabled on this system.
```

**Recommended Solution**: You **do NOT need** to activate the virtual environment or modify global Windows security policies. You can invoke Python, Pip, Pytest, and Uvicorn directly using the executable binaries inside `venv\Scripts\`:

```powershell
# Run any Python script:
.\venv\Scripts\python.exe <script_path>

# Run Pytest:
.\venv\Scripts\python.exe -m pytest

# Run Uvicorn:
.\venv\Scripts\uvicorn.exe app.main:app
```

*(Optional)* If you prefer activating the virtual environment in PowerShell, update your user execution policy once:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\venv\Scripts\Activate.ps1
```

Return to the project root directory when finished:
```powershell
cd ..
```

---

## 9. Frontend Setup

The frontend is built with React 19, TypeScript, and Vite. It requires Node dependencies installed cleanly according to the committed lockfile.

### Step 1: Navigate to Frontend Directory

```powershell
cd frontend
```

### Step 2: Clean Install Dependencies (`npm ci`)

Run `npm ci` (or `npm.cmd ci`):

```powershell
npm.cmd ci
```

> [!IMPORTANT]
> **Why `npm ci` instead of `npm install`?**
> - `npm ci` (Clean Install) installs the **exact** dependency tree specified by `package-lock.json`.
> - It deletes any pre-existing `node_modules/` and performs a clean, deterministic install.
> - It guarantees that every team member runs with identical library versions, preventing "works on my machine" version divergence.
> - It does not modify `package.json` or `package-lock.json`.

Return to the project root directory when finished:
```powershell
cd ..
```

---

## 10. Oracle Database Configuration

Every team member needs access to an Oracle Database 21c instance. The team can choose between two operational setups:

```mermaid
graph TD
    subgraph "Option A: Individual Local Database"
        devA[Team Member A] --> localDBA[(Local Oracle 21c XE<br/>localhost:1521/XEPDB1)]
        devB[Team Member B] --> localDBB[(Local Oracle 21c XE<br/>localhost:1521/XEPDB1)]
    end
    subgraph "Option B: Shared Team Database"
        dev1[Team Member 1] --> sharedDB[(Shared Oracle 21c XE<br/>team-db-host:1521/XEPDB1)]
        dev2[Team Member 2] --> sharedDB
        dev3[Team Member 3] --> sharedDB
    end
```

### Option A: Individual Local Oracle Database

In this setup, each team member runs Oracle Database 21c XE directly on their own computer:
- **Isolation**: Each member has their own independent database instance. Changes or test data created by one member do not affect others.
- **Offline Access**: Development and testing can proceed without an internet connection or local network access.
- **User Provisioning**: Each member creates their own `campuspulse` user schema in their local `XEPDB1` pluggable database.
- **Connection Host**: The database host is configured as `localhost` (or `127.0.0.1`).

### Option B: Shared Team Oracle Database

In this setup, the team shares a single Oracle Database 21c instance hosted on a local network workstation, server, or cloud host:
- **Centralized Data**: All team members immediately see the same campus data, bookings, and live maintenance tickets.
- **DBA Provisioning**: The database administrator (DBA) creates dedicated database user accounts (e.g., `campuspulse` or distinct member accounts) and grants schema privileges.
- **Connection Host**: Members set the database host to the server's IP address (e.g., `192.168.1.150`) or hostname.
- **Shared Access Warning**: Concurrent schema drops or migrations affect the entire team. Do not reinitialize a shared database without coordinating with your teammates.
- **Security Warning**: **NEVER share administrative credentials (`SYS` or `SYSTEM`)**. The DBA must provision application-level users with limited privileges.

### Connection String Breakdown

CampusPulse connects via SQLAlchemy using the official `python-oracledb` driver in **Thin Mode**:

```env
DATABASE_URL=oracle+oracledb://USERNAME:PASSWORD@HOST:1521/?service_name=XEPDB1
```

| Component | Description | Example Value |
| :--- | :--- | :--- |
| `oracle+oracledb://` | SQLAlchemy dialect and DBAPI driver prefix. Runs in high-performance Thin Mode. | `oracle+oracledb://` |
| `USERNAME` | Oracle schema user. Must have `CONNECT` and `RESOURCE` privileges. | `campuspulse` |
| `PASSWORD` | Password for the schema user (URL-encoded if special characters exist). | `CampusPulse2026` |
| `HOST` | Hostname or IP of the Oracle server. Use `localhost` **only** if Oracle runs on your own PC. | `localhost` or `192.168.1.150` |
| `1521` | Standard Oracle TNS listener TCP port. | `1521` |
| `/?service_name=XEPDB1` | Oracle Pluggable Database (PDB) service name. Primary container is `XEPDB1`. | `/?service_name=XEPDB1` |

> [!WARNING]
> In Oracle 21c XE, user schemas reside inside the pluggable database `XEPDB1`, **NOT** the root container `CDB$ROOT`. Connecting without `?service_name=XEPDB1` will cause connection or permission failures.

### URL-Encoding Special Characters

If your database password contains characters with special meaning in URIs (`@`, `:`, `/`, `#`, `$`, `%`, `&`, `?`), they **must be URL-encoded (percent-encoded)**:

| Character | Encoded Representation |
| :---: | :---: |
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `/` | `%2F` |
| `:` | `%3A` |
| `%` | `%25` |
| `&` | `%26` |
| `?` | `%3F` |

*Example*: If your password is `Pass#2026@Pulse!`, the connection URL is:
```env
DATABASE_URL=oracle+oracledb://campuspulse:Pass%232026%40Pulse!@localhost:1521/?service_name=XEPDB1
```

> [!TIP]
> Alternatively, CampusPulse's configuration engine ([`backend/app/config.py`](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/app/config.py)) supports discrete connection fields, where URL-encoding is handled automatically:
> ```env
> DB_USER=campuspulse
> DB_PASSWORD=Pass#2026@Pulse!
> DB_HOST=localhost
> DB_PORT=1521
> DB_SERVICE_NAME=XEPDB1
> ```

---

## 11. Environment Variables Configuration

CampusPulse uses an environment file (`.env`) in the project root to configure database connectivity and CORS security policies.

### Step 1: Create Your Personal `.env` File

Copy the provided template [`.env.example`](file:///c:/Users/ramsa/Desktop/CampusPulse/.env.example) to `.env`:

```powershell
Copy-Item .env.example .env
```

### Step 2: Configure Your Settings

Open `.env` in your text editor and update the connection URL with your personal credentials:

```env
# =====================================================================
# CampusPulse — Local Environment Configuration (.env)
# =====================================================================

# Primary Database Connection (Replace with your actual password and host)
DATABASE_URL=oracle+oracledb://campuspulse:YOUR_PASSWORD@localhost:1521/?service_name=XEPDB1

# Permitted CORS Origins for Frontend API Communication
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000","http://127.0.0.1:3000"]
```

### Security & Git Rules for Environment Variables

> [!CAUTION]
> - **NEVER commit your `.env` file to GitHub.**
> - **NEVER share database passwords in commit messages, issues, or pull requests.**
> - Each team member must create their own independent `.env` file.
> - Verify that `.env` is covered by `.gitignore`. You can verify this by checking the root `.gitignore`:
>   ```powershell
>   Select-String -Path .gitignore -Pattern "\.env"
>   ```
>   Matches: `.env`, `*.env`, and `backend/.env`.

---

## 12. Database Initialization & Schema Provisioning

CampusPulse provides automated Python tooling and pure Oracle SQL scripts to provision schema objects, triggers, views, and seed data.

> [!IMPORTANT]
> **Use the Correct Schema Script**:
> - **Authoritative Oracle Script**: [`backend/scripts/oracle_schema.sql`](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/scripts/oracle_schema.sql) (Oracle 21c SQL/PL/SQL dialect).
> - **Do NOT use `backend/scripts/schema.sql`**: That file is a secondary PostgreSQL script and will fail if compiled on Oracle.

### Step 1: Provision the Oracle User (Local Database Only)

If you are setting up a fresh local Oracle 21c XE database, run the user provisioning script [`create_oracle_user.sql`](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/scripts/create_oracle_user.sql) using SQL\*Plus as `sysdba`:

```powershell
sqlplus / as sysdba @backend\scripts\create_oracle_user.sql
```

The script switches session container to `XEPDB1`, securely prompts for the user password without echoing to the screen (`ACCEPT ... HIDE`), creates the `campuspulse` user, and grants required enterprise privileges:
```sql
GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE TABLE, CREATE SEQUENCE TO campuspulse;
ALTER USER campuspulse QUOTA UNLIMITED ON USERS;
```

> [!WARNING]
> **Destructive Operation**: `create_oracle_user.sql` contains `DROP USER campuspulse CASCADE`. Only run this during initial computer setup or when performing an intentional complete schema reset. **Do not run this on a shared team database while others are working.**

### Step 2: Initialize Tables, Views, Triggers & Seed Data

Execute the automated initialization script [`backend/scripts/init_db.py`](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/scripts/init_db.py) using the virtual environment:

```powershell
backend\venv\Scripts\python.exe backend\scripts\init_db.py
```

#### What `init_db.py` Executes Automatically:
1. **Connectivity Check**: Pings Oracle via `SELECT 1 FROM dual`.
2. **Table DDL**: Creates all 6 relational 3NF/BCNF tables (`users`, `buildings`, `rooms`, `bookings`, `maintenance_tickets`, `events`) with primary keys, foreign keys, and check constraints.
3. **Compound Trigger**: Compiles `trg_no_overlapping_bookings` to enforce mutating-table-free concurrency control.
4. **Analytical Views**: Compiles `v_dashboard_summary` and `v_room_live_status`.
5. **Performance B-Tree Indexes**: Compiles 8 composite indexes on foreign keys and temporal interval columns.
6. **Idempotent Seeding**: Seeds 5 campus buildings, 25 rooms, 10 users, 12 bookings, 6 maintenance work orders, and 6 campus events. If data already exists, seeding is safely skipped.

#### Expected Output:
```text
=================================================================
 CampusPulse — Database Initialization & Verification 
=================================================================
[*] Target Dialect : Oracle Database 21c (python-oracledb)
[*] Target Endpoint: oracle+oracledb://campuspulse:***@localhost:1521/?service_name=XEPDB1

--- [Phase 1: Database Connectivity Check] ---
[SUCCESS] Database connection established.

--- [Phase 2: Relational Tables Creation] ---
[SUCCESS] Base tables and constraints created via metadata.

--- [Phase 3: Post-Schema Objects (Views, Triggers, Indexes)] ---
[*] Oracle views created (v_dashboard_summary, v_room_live_status).
[*] Oracle compound trigger compiled (trg_no_overlapping_bookings).
[*] Oracle performance indexes created.
[SUCCESS] All Oracle schema objects compiled and verified.

--- [Phase 4: Sample Data Seeding] ---
[*] Seeding 5 Campus Buildings...
[SUCCESS] Seed data committed successfully.
Summary: 5 buildings, 25 rooms, 10 users, 12 bookings, 6 tickets, 6 events.

=================================================================
 CampusPulse Database Initialization COMPLETE (Status: OK) 
=================================================================
```

### Step 3: Schema Integrity Audit

Verify that the database satisfies all 9 schema evaluation criteria by running [`backend/scripts/verify_db.py`](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/scripts/verify_db.py):

```powershell
backend\venv\Scripts\python.exe backend\scripts\verify_db.py
```

The script audits:
- Table existence in `USER_TABLES`.
- View compilation and validity in `USER_VIEWS` and `USER_OBJECTS`.
- Compound trigger compilation status (`ENABLED` and `VALID`) in `USER_TRIGGERS`.
- Constraint enforcement (Primary, Foreign, Check, Unique) in `USER_CONSTRAINTS`.
- Performance indexes in `USER_INDEXES`.
- Minimum required record counts across all 6 entities.
- Foreign key referential integrity (zero orphaned records).
- Execution test on `v_dashboard_summary`.

*Expected Result*: **`VERIFICATION RESULT: ALL CHECKS PASSED (EXIT CODE 0)`**

---

## 13. Running CampusPulse

To run the complete application, start the FastAPI backend and Vite frontend in two separate PowerShell terminal windows.

### Starting the Backend Server

Open **Terminal 1** in the project root:

```powershell
backend\venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000
```

*(Alternatively, if running from inside the `backend` directory)*:
```powershell
cd backend
.\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

#### Expected Backend Terminal Output:
```text
INFO:     Will watch for changes in: ['...\\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process using StatReload
[INFO] campuspulse.database: Database connected successfully. Dialect: Oracle SQL 21c (oracledb)
INFO:     Application startup complete.
```

### Starting the Frontend Client

Open **Terminal 2** in the project root:

```powershell
cd frontend
npm.cmd run dev
```

#### Expected Frontend Terminal Output:
```text
  VITE v8.3.5  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Service Endpoints & Communication Verification

| Service | URL | Purpose |
| :--- | :--- | :--- |
| **Frontend Control Center** | [http://localhost:5173/](http://localhost:5173/) | Cyberpunk UI, spatial map, and booking matrix |
| **Backend API Root** | [http://127.0.0.1:8000/](http://127.0.0.1:8000/) | Service identifier and system status |
| **Backend Health Check** | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) | Live database connection ping and telemetry |
| **Interactive Swagger Docs**| [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Interactive API exploration and testing |
| **Alternative ReDoc Docs** | [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc) | Structured OpenAPI documentation |

### How to Confirm Frontend and Backend Communicate Successfully:

1. Open [http://localhost:5173/](http://localhost:5173/) in your web browser.
2. Verify that the **System Status** badge in the top header indicates `System Online` with a green indicator.
3. Open Browser Developer Tools (`F12`) and select the **Network** tab.
4. Refresh the page: Observe requests to `/api/dashboard`, `/api/buildings`, and `/api/events` returning `HTTP 200 OK`.
5. Navigate to the **DBMS Studio** tab in the sidebar:
   - Select any query from the catalogue (e.g., `Query 01: Active Operations Summary`).
   - Click **Execute Query**.
   - Confirm that query results are returned in a table with a latency measurement badge (e.g., `12.4ms`), verifying live SQL round-trips to Oracle Database 21c.

---

## 14. Testing & Quality Verification Suite

CampusPulse includes a comprehensive automated test suite verifying database integrity, multi-threaded race conditions, Oracle PL/SQL triggers, and frontend code quality.

### Backend Test Suite

From the project root, run pytest using the virtual environment:

```powershell
backend\venv\Scripts\python.exe -m pytest -v
```

#### Oracle Integration Suite:
To execute Oracle-specific dictionary, compound trigger, and multi-session row-locking blocking tests:

```powershell
backend\venv\Scripts\python.exe -m pytest backend/tests/test_oracle_integration.py -v -rs
```

#### What Backend Tests Verify:
- **`backend/tests/test_api.py` (16 tests)**: API endpoints, healthcheck, dashboard stats, filter queries, `NOT EXISTS` room availability, event validation, maintenance state transitions.
- **`backend/tests/test_concurrency.py` (4 tests)**: Multi-threaded race conditions (4 threads, 2 simultaneous requests for the exact same room slot, parallel different-room bookings, adjacent back-to-back bookings) verifying that pessimistic row locks (`SELECT ... FOR UPDATE`) guarantee serializability and HTTP 409 conflict rejection.
- **`backend/tests/test_database_integrity.py` (12 tests)**: Foreign keys (`ORA-02291`), unique constraints, check constraints, offline room booking blocks, direct SQL compound trigger enforcement (`ORA-20001`), transaction atomicity & complete rollback verification.
- **`backend/tests/test_oracle_integration.py` (9 tests)**: Oracle dictionary metadata (`USER_TABLES`, `USER_TRIGGERS`, `USER_VIEWS`), real multi-session row locking blocking (`SELECT ... FOR UPDATE NOWAIT` raising `ORA-00054`), direct SQL concurrent overlapping inserts, and all DBMS Studio queries.
- **`backend/tests/test_sql_demonstrations.py` (4 tests)**: Automated verification that all 20 syllabus demonstration queries compile and execute cleanly on Oracle.

### Frontend Verification

Navigate to `frontend` and run verification commands:

```powershell
cd frontend

# 1. Clean reproducible dependency install
npm.cmd ci

# 2. TypeScript compilation & Vite production build
npm.cmd run build

# 3. Static code analysis and linting
npm.cmd run lint
```

#### What Each Frontend Command Verifies:
- **`npm ci`**: Validates that local node dependencies strictly match `package-lock.json` without unauthorized changes.
- **`npm run build`**: Runs `tsc -b` to verify strict TypeScript type checking across all components, interfaces, and API services, followed by `vite build` to guarantee bundle compilation without errors.
- **`npm run lint`**: Executes Oxlint across all 14 React source files to enforce code hygiene, React hook dependencies, and prevent unused variables.

### Automated Evaluation Modes

CampusPulse documentation distinguishes between **live Oracle Database 21c test results** and **independently reproducible offline test results**:

1. **Authoritative Oracle Database 21c Audit (45 Passing Tests)**:
   When executed against the authoritative live Oracle Database 21c XE container (`XEPDB1`), all 45 tests pass:
   ```text
   45 passed, 0 failed, 0 skipped in ~5.2 seconds (100% GREEN)
   ```
2. **Independently Reproducible Offline Suite (SQLite Mode — 27 Passing Tests)**:
   Evaluators or team members without an active Oracle installation can immediately verify core business logic, API endpoints, relational constraints, foreign key cascades, and dashboard views using the built-in SQLite fallback:
   ```powershell
   $env:DATABASE_URL="sqlite:///./campuspulse_test.db"
   backend\venv\Scripts\python.exe backend\scripts\init_db.py
   backend\venv\Scripts\python.exe -m pytest -v
   Remove-Item ./campuspulse_test.db
   ```
   *Result*: **27 passed, 18 skipped, 0 failed** (Oracle-specific trigger and row-locking tests are safely bypassed when Oracle is not configured).

---

## 15. GitHub Team Collaboration Workflow

To ensure smooth collaboration and prevent code conflicts, follow these standard team practices:

### Standard Team Workflow

#### 1. Fetch Latest Changes Before Starting Work
Always synchronize your local repository with the remote main branch before beginning any task:
```powershell
git checkout main
git pull origin main
```

#### 2. Create a Feature Branch
Do not commit directly to `main`. Create a descriptive feature branch:
```powershell
git checkout -b feature/room-filter-enhancement
# Or for bug fixes:
git checkout -b fix/booking-timezone-offset
```

#### 3. Make Changes and Verify Locally
Implement your changes, then verify that both backend and frontend pass their verification suites:
```powershell
# Verify backend:
backend\venv\Scripts\python.exe -m pytest -v

# Verify frontend:
cd frontend
npm.cmd run lint
npm.cmd run build
cd ..
```

#### 4. Stage and Commit Your Work
Stage only your intended source files with a clear, conventional commit message:
```powershell
git status
git add .
git commit -m "feat(bookings): add floor filter to spatial room selector"
```

#### 5. Push Feature Branch and Open a Pull Request
Push your branch to GitHub:
```powershell
git push origin feature/room-filter-enhancement
```
Then, open a **Pull Request (PR)** on GitHub targeting `main`.

### Branching & Pull Request Guidelines

- **Peer Review**: Have at least one other team member review and approve your PR before merging into `main`.
- **Merge Strategy**: Use "Squash and Merge" or "Rebase and Merge" to keep a clean linear Git history on `main`.
- **Keep Branches Updated**: If `main` advances while your branch is open, rebase or merge `main` into your feature branch:
  ```powershell
  git checkout feature/room-filter-enhancement
  git fetch origin
  git merge origin/main
  ```

### Files Excluded from Git

The repository [`.gitignore`](file:///c:/Users/ramsa/Desktop/CampusPulse/.gitignore) strictly prevents generated files, build artifacts, and private credentials from being committed:

```gitignore
# Python & Virtual Environments
backend/venv/
.venv/
venv/
__pycache__/
*.pyc
.pytest_cache/
*.db

# Secrets & Local Configurations
.env
*.env
backend/.env

# Node & Frontend Build Artifacts
frontend/node_modules/
frontend/dist/

# Logs & Archives
*.log
*.zip
.DS_Store
```

> [!CAUTION]
> Always run `git status` before `git add .` to ensure you are not inadvertently staging temporary test files, database dumps, or credentials.

---

## 16. Troubleshooting Guide

### 1. `ORA-01017: invalid username/password; logon denied`
- **Root Cause**: The username or password specified in `DATABASE_URL` or `.env` does not match the credentials in Oracle.
- **Remedy**:
  1. Test your credentials directly in SQL\*Plus:
     ```powershell
     sqlplus campuspulse@localhost:1521/XEPDB1
     ```
  2. If your password contains special characters (`@`, `#`, `$`, `/`), URL-encode them in `DATABASE_URL` (e.g., replace `@` with `%40`, `#` with `%23`).
  3. Alternatively, specify credentials using discrete `.env` variables (`DB_USER`, `DB_PASSWORD`), which handle escaping automatically.
  4. If you forgot the password, reset it in SQL\*Plus as `sysdba`:
     ```sql
     ALTER SESSION SET CONTAINER = XEPDB1;
     ALTER USER campuspulse IDENTIFIED BY "NewSecurePassword123";
     ```

### 2. `ORA-12514: TNS:listener does not currently know of service requested in connect descriptor`
- **Root Cause**: The TNS listener is active, but the pluggable database service (`XEPDB1`) is not currently registered or is not open.
- **Remedy**:
  1. Check the listener status in PowerShell:
     ```powershell
     lsnrctl status
     ```
  2. Open SQL\*Plus as sysdba:
     ```powershell
     sqlplus / as sysdba
     ```
  3. Check the pluggable database state and open it:
     ```sql
     SHOW PDBS;
     ALTER PLUGGABLE DATABASE XEPDB1 OPEN;
     ALTER SYSTEM REGISTER;
     EXIT;
     ```

### 3. `ORA-12541: TNS:no listener`
- **Root Cause**: The Oracle TNS Listener Windows service (`OracleOraDB21Home1TNSListener`) is stopped.
- **Remedy**:
  1. Open PowerShell as Administrator.
  2. Start the listener service:
     ```powershell
     Start-Service OracleOraDB21Home1TNSListener
     ```
  3. Verify with `Get-Service *oracle*`.

### 4. `SQLAlchemy Database Connection Errors` / Connection Refused
- **Root Cause**: Oracle database service is not running, incorrect port, or Windows Firewall is blocking traffic.
- **Remedy**:
  1. Ensure `OracleServiceXE` is running (`Start-Service OracleServiceXE`).
  2. Ping the listener via `tnsping localhost:1521/XEPDB1`.
  3. If connecting to a shared team database across a local network, ensure the host machine has an inbound Windows Firewall rule allowing TCP port `1521`.

### 5. Python Dependency Installation Errors (`pip install`)
- **Root Cause**: Outdated `pip`, incompatible Python version (e.g., Python 3.13 preview), or missing wheel binaries.
- **Remedy**:
  1. Verify your Python version is 3.10, 3.11, or 3.12: `python --version`.
  2. Upgrade `pip` inside the virtual environment:
     ```powershell
     .\venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
     ```
  3. Re-run dependency installation:
     ```powershell
     .\venv\Scripts\python.exe -m pip install -r requirements.txt
     ```

### 6. PowerShell Script Execution Policy Errors (`PSSecurityException`)
- **Root Cause**: Windows PowerShell disables running unsigned scripts (`.ps1`) by default (`File ... cannot be loaded because running scripts is disabled on this system`).
- **Remedy**:
  - **Option A (No policy changes needed)**: Run Python executables directly (`.\venv\Scripts\python.exe` and `npm.cmd`).
  - **Option B**: Update the execution policy for your user account:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```

### 7. Frontend `npm` Installation / Lockfile Errors
- **Root Cause**: Stale cache, corrupted `node_modules/`, or npm version mismatch.
- **Remedy**:
  1. Clean the npm cache:
     ```powershell
     npm.cmd cache clean --force
     ```
  2. Delete `node_modules` and re-run clean install:
     ```powershell
     Remove-Item -Recurse -Force node_modules
     npm.cmd ci
     ```

### 8. Frontend Cannot Communicate with Backend (`NetworkError` / Failed to Fetch)
- **Root Cause**: FastAPI backend is not running on port 8000, or CORS origin is not permitted.
- **Remedy**:
  1. Confirm the backend is running at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health).
  2. Verify that `CORS_ORIGINS` in `.env` includes `"http://localhost:5173"`.
  3. Check [`frontend/vite.config.ts`](file:///c:/Users/ramsa/Desktop/CampusPulse/frontend/vite.config.ts) to verify the proxy config:
     ```ts
     server: {
       port: 5173,
       proxy: {
         '/api': {
           target: 'http://localhost:8000',
           changeOrigin: true,
         }
       }
     }
     ```

### 9. Missing Environment Variables Error
- **Root Cause**: Backend fails on startup with `CRITICAL: No database configuration provided!`.
- **Remedy**:
  1. Ensure a `.env` file exists in the project root (`CampusPulse/.env`) or in `backend/.env`.
  2. Copy from template: `Copy-Item .env.example .env`.
  3. Verify that `DATABASE_URL` is uncommented and points to a valid connection string.

---

## 17. Key Application Screenshots to Capture for Submission

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

## 18. Project Directory Structure

```
CampusPulse/
├── DATABASE_DESIGN.md            <- Relational model, FDs, 1NF-BCNF proofs, ER diagram
├── SQL_CONCEPTS.md               <- 20 syllabus SQL query guides with sample outputs
├── ORACLE_DATABASE_GUIDE.md      <- Oracle 21c XE setup, PDB, user provisioning, pooling
├── TRANSACTION_AND_CONCURRENCY.md<- ACID proofs, row-locking, compound trigger mechanics
├── TESTING_REPORT.md             <- QA audit of all 45 automated tests (100% pass)
├── PROJECT_DEMONSTRATION.md      <- Step-by-step viva presentation script
├── README.md                     <- Primary project documentation & team collaboration guide
├── .env.example                  <- Environment configuration template
├── conftest.py                   <- Pytest bootstrap with Oracle connection auto-detection
├── pytest.ini                    <- Pytest configuration
├── backend/
│   ├── requirements.txt          <- Python backend dependencies (FastAPI, SQLAlchemy, oracledb)
│   ├── app/
│   │   ├── config.py             <- Pydantic Settings, CORS assembly & URL maskers
│   │   ├── database.py           <- SQLAlchemy engine & oracledb pool setup
│   │   ├── main.py               <- FastAPI application router registry & CORS
│   │   ├── models/entities.py    <- Declarative ORM models & table constraints
│   │   ├── routers/              <- Modular API endpoints (8 routers)
│   │   ├── schemas/schemas.py    <- Pydantic request/response schemas
│   │   └── services/campus_service.py <- Core business logic, row locks, ACID transactions
│   ├── scripts/
│   │   ├── oracle_schema.sql     <- Authoritative Oracle 21c DDL script
│   │   ├── sql_demonstrations.sql<- 20 syllabus SQL demonstration queries
│   │   ├── create_oracle_user.sql<- SQL script to provision user campuspulse in XEPDB1
│   │   ├── init_db.py            <- Database initialization & idempotent seeder
│   │   ├── verify_db.py          <- 9-point Oracle schema integrity auditor
│   │   ├── package_submission.py <- Clean academic submission ZIP packager
│   │   ├── drop_tables.sql       <- Cascade drop helper
│   │   └── schema.sql            <- PostgreSQL secondary script (do not use for Oracle)
│   └── tests/
│       ├── test_api.py           <- REST API integration tests (16 tests)
│       ├── test_concurrency.py   <- Multi-threaded row-locking stress tests (4 tests)
│       ├── test_database_integrity.py <- FK, Check, Unique, ACID rollback tests (12 tests)
│       ├── test_oracle_integration.py <- Oracle dictionary, trigger & concurrency tests (9 tests)
│       └── test_sql_demonstrations.py <- Automated syllabus query tests (4 tests)
└── frontend/
    ├── package.json              <- Vite, React 19, Tailwind CSS v4, Lucide
    ├── package-lock.json         <- Deterministic dependency lockfile for npm ci
    ├── vite.config.ts            <- Vite dev server & /api proxy to FastAPI
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
