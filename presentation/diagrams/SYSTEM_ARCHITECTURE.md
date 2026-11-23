# System Architecture Diagram

This document contains the visual architectural diagram of the CampusPulse 3-Tier Enterprise System.

---

```mermaid
flowchart TD
    subgraph Presentation_Tier["Presentation Tier (Client Browser)"]
        UI["React 19 SPA (Vite + Tailwind CSS v4)"]
        Map["SVG Vector Campus Digital Twin"]
        Dash["Operations Telemetry Dashboard (Recharts)"]
        Studio["DBMS Viva Query Studio"]
    end

    subgraph Application_Tier["Application Tier (FastAPI Engine)"]
        API["FastAPI 0.162+ REST API Engine"]
        Val["Pydantic v2 Schema Validation"]
        Routers["8 Modular Routers (/dashboard, /rooms, /bookings...)"]
        Service["CampusService (Business Logic & Lock Orchestration)"]
    end

    subgraph Data_Tier["Authoritative Data Tier (Oracle Database 21c)"]
        Pool["SQLAlchemy 2.0 Connection Pool (python-oracledb Thin Mode)"]
        DB[("Oracle Database 21c XE (XEPDB1)")]
        Tables["6 BCNF Relational Tables (USERS, ROOMS, BOOKINGS...)"]
        Locks["Pessimistic Row Locks (SELECT FOR UPDATE)"]
        Trigger["PL/SQL Compound Trigger (TRG_NO_OVERLAPPING_BOOKINGS)"]
        Views["Pre-Compiled Views (v_dashboard_summary)"]
        Indexes["8 Composite B-Tree Indexes"]
    end

    UI --> Map
    UI --> Dash
    UI --> Studio

    UI -- "REST API / JSON (HTTP 8000)" --> API
    API --> Val
    Val --> Routers
    Routers --> Service
    Service --> Pool
    Pool --> DB
    DB --> Tables
    DB --> Locks
    DB --> Trigger
    DB --> Views
    DB --> Indexes
```

---

## Architectural Description
1. **Presentation Tier**: Built in React 19 and TypeScript, running in the user's browser. It features a spatial digital twin rendered with pure SVG, reactive data visualization via Recharts, and an embedded SQL execution workbench.
2. **Application Tier**: Built on FastAPI, running on Python 3.12. Incoming HTTP requests are validated using strict Pydantic schemas before reaching the service layer. `CampusService` orchestrates ACID transaction boundaries, interval calculations, and row-level locking.
3. **Data Tier**: Powered by Oracle Database 21c XE running pluggable database `XEPDB1`. All transactions are handled through `python-oracledb` in Thin Mode with automated connection pooling and pre-ping verification. Integrity is guaranteed through schema constraints and a kernel-level compound trigger.
