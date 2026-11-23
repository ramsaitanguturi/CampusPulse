# 01 — Project Overview: CampusPulse

## 1. Project Title & Identity
- **Project Name**: CampusPulse — Smart Campus Digital Twin & Facility Operations Control Center
- **Academic Domain**: Relational Database Management Systems (DBMS), Advanced SQL, and Transaction Engineering
- **Authoritative DBMS**: Oracle Database 21c (21.3+ XE / Free)
- **Application Stack**: FastAPI (Python 3.12), SQLAlchemy 2.0, React 19, TypeScript, Vite, Tailwind CSS v4

---

## 2. Problem Statement
Modern university campuses feature high-density shared facilities: lecture halls, computer laboratories, multi-purpose auditoriums, and seminar pods. Managing these assets faces several critical DBMS challenges:
1. **Double Bookings & Scheduling Conflicts**: Concurrent requests from different departments often result in overlapping reservations when concurrency control is missing or naive.
2. **Lack of Transaction Isolation**: Simultaneous user operations cause race conditions, lost updates, and phantom bookings.
3. **Spatial Data Disconnect**: Facility managers lack visual spatial context (building floor plans, coordinates, room capacities, and equipment telemetry).
4. **Maintenance Incoherence**: Offline rooms under repair continue to accept reservations unless facility work orders dynamically lock scheduling.
5. **Slow Analytical Reporting**: Aggregations across multi-table relationships often trigger row-multiplication (Cartesian products) or severe table scan latencies.

---

## 3. Motivation
Rather than building a trivial CRUD application with mock data or an in-memory database, CampusPulse was engineered as an **enterprise-grade relational DBMS evaluation project**. It directly demonstrates how core database textbook principles (ACID transactions, BCNF normalization, pessimistic row-level locking, subqueries, and database triggers) solve real-world operational problems on an industrial database engine (Oracle Database 21c).

---

## 4. Key Project Objectives
1. **Relational Rigor**: Implement a 6-entity relational model satisfying 3NF and BCNF with strict foreign key constraints and domain `CHECK` rules.
2. **Conflict-Free Temporal Scheduling**: Model room reservations as half-open mathematical intervals $[start\_time, end\_time)$ preventing collisions while permitting back-to-back bookings.
3. **Multi-Tier Concurrency Control**: Enforce serialization via application-level validation, SQLAlchemy row-level locks (`SELECT ... FOR UPDATE`), and an engine-level Oracle PL/SQL Compound Trigger.
4. **Maintenance-Driven State Machine**: Dynamically synchronize physical room statuses (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`) with reported facility tickets.
5. **Interactive Spatial Twin**: Provide an SVG-based interactive campus map paired with real-time telemetry metrics and a dedicated DBMS Query Studio.
6. **Automated Verification**: Deliver 100% passing automated test coverage across API routes, database integrity, cross-session concurrency, and SQL syllabus queries.

---

## 5. Scope & Functional Boundaries

### In Scope
- Modeling 6 primary relations: `USERS`, `BUILDINGS`, `ROOMS`, `BOOKINGS`, `MAINTENANCE_TICKETS`, `EVENTS`.
- Real-time room availability calculation using SQL `NOT EXISTS` subqueries.
- Pessimistic row locking on target rooms during booking transactions.
- Kernel-level trigger rejection (`ORA-20001`) of conflicting raw SQL inserts.
- Non-inflating multi-table aggregations via pre-aggregated subqueries.
- Pre-compiled analytical views (`v_dashboard_summary`, `v_room_live_status`).
- Dedicated DBMS Studio in the frontend for live SQL execution with millisecond latency metrics.

### Explicitly Out of Scope (Architectural Boundaries)
- User authentication & JWT password hashing (CampusPulse focuses on DBMS relational modeling; user identities are selected from registered university stakeholders).
- Mobile native application (designed as a responsive desktop Operations Control Center).
- Payment gateways or billing systems (internal university resource allocation).
