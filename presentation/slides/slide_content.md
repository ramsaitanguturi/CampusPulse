# Slide Content — Complete Slide Deck

---

### SLIDE 1: Title & Project Identity
**Title**: CampusPulse — Smart Campus Digital Twin & Facility Operations Control Center
**Subtitle**: Enterprise Relational DBMS Semester Project on Oracle Database 21c
**Presenter**: Student Name / Team Details
**Institution**: Department of Computer Science & Engineering
- Authoritative Backend: Oracle Database 21c (21.3+ XE / Free)
- Application Architecture: FastAPI + SQLAlchemy 2.0 + React 19 + TypeScript
- Evaluation Focus: Normalization (BCNF), ACID Transactions, Pessimistic Row-Level Locking, PL/SQL Compound Triggers & Advanced SQL

---

### SLIDE 2: Problem Statement & Operational Challenges
**Title**: Operational Challenges in University Infrastructure
- **High Facility Contention**: Hundreds of students and faculty simultaneously competing for classrooms, computer labs, and auditoriums.
- **The Double-Booking Menace**: Concurrent scheduling requests without strict database locking lead to double bookings and corrupted schedules.
- **Maintenance Disconnect**: Classrooms under repair continue accepting reservations when facility ticketing is disconnected from room availability.
- **Spatial Blindness**: Facility managers lack a visual digital twin showing real-time room occupancy and floor layouts.
- **Analytical Pitfalls**: Naive SQL joins between one-to-many relationships cause Cartesian product multiplication and inaccurate reports.

---

### SLIDE 3: Project Objectives & Scope
**Title**: Engineering Objectives
- **Authoritative DBMS Storage**: Deploy a fully normalized relational schema on **Oracle Database 21c** with native integrity constraints.
- **Mathematical Interval Scheduling**: Implement half-open temporal intervals $[start\_time, end\_time)$ permitting back-to-back bookings.
- **3-Tier Concurrency Protection**: Prevent race conditions via application validation, `SELECT ... FOR UPDATE` row locks, and Oracle PL/SQL Compound Triggers.
- **Dynamic Maintenance State Machine**: Automatically restrict room booking when critical work orders are active and restore availability upon ticket resolution.
- **Interactive Spatial Twin & DBMS Studio**: Build an SVG campus map digital twin and an embedded SQL execution console with live latency tracking.

---

### SLIDE 4: Complete System Architecture
**Title**: 3-Tier Enterprise System Architecture
- **Presentation Tier (React 19 + TypeScript)**: Cyberpunk dark-mode interface, SVG campus map, telemetry cards, and DBMS Viva Workbench.
- **Application Tier (FastAPI + SQLAlchemy 2.0)**: Modular routers, Pydantic v2 validation, transaction boundaries, and lock orchestration.
- **Authoritative Data Tier (Oracle Database 21c)**: 6 normalized relations, row-level locks, PL/SQL compound triggers, analytical views, and B-Tree indexes.
- **Driver Integration**: `python-oracledb` 26.0+ operating in pure Python **Thin Mode** with connection pooling (`pool_size=10, max_overflow=20`).

---

### SLIDE 5: Technology Stack & Justification
**Title**: Technology Stack & Architectural Fit
- **Oracle Database 21c**: Industrial ACID transaction engine, robust row-level locking, and native PL/SQL procedural extensions.
- **FastAPI (Python 3.12)**: High-speed asynchronous REST API with automatic OpenAPI documentation (`/docs`) and strict Pydantic validation.
- **SQLAlchemy 2.0**: Declarative ORM providing explicit transaction boundaries and fine-grained locking primitives (`with_for_update()`).
- **React 19 + Vite**: High-performance client-side rendering with instant HMR and type-safe components.
- **Tailwind CSS v4**: Cohesive dark control center styling with neon telemetry accents.

---

### SLIDE 6: Relational Schema & The 6 Entities
**Title**: The 6 Normalized Core Relations
1. **`USERS`**: University stakeholders (Students, Faculty, Staff, Admins) with role domain checks and unique institutional emails.
2. **`BUILDINGS`**: Campus physical structures with canvas coordinates (`map_x`, `map_y`) and operational statuses.
3. **`ROOMS`**: Lecture halls, labs, auditoriums with composite uniqueness on `(building_id, room_number)` and positive capacities.
4. **`BOOKINGS`**: Half-open reservation intervals $[s, e)$ with status tracking (`CONFIRMED`, `CANCELLED`, `COMPLETED`).
5. **`MAINTENANCE_TICKETS`**: Facility work orders dynamically controlling room availability based on priority.
6. **`EVENTS`**: Campus-wide academic and cultural gatherings mapped to buildings and optional lecture halls.

---

### SLIDE 7: Entity-Relationship (ER) Model & Cardinalities
**Title**: Entity-Relationship Cardinalities & Referential Integrity
- **One-to-Many Relationships**:
  - `BUILDINGS (1) -> (N) ROOMS` (`ON DELETE CASCADE`)
  - `ROOMS (1) -> (N) BOOKINGS` (`ON DELETE CASCADE`)
  - `USERS (1) -> (N) BOOKINGS` (`ON DELETE CASCADE`)
  - `ROOMS (1) -> (N) MAINTENANCE_TICKETS` (`ON DELETE CASCADE`)
  - `BUILDINGS (1) -> (N) EVENTS` (`ON DELETE CASCADE`)
- **Preservation & Nullable Foreign Keys**:
  - `USERS (1) -> (N) MAINTENANCE_TICKETS` (`ON DELETE SET NULL`) — Preserves facility repair history if reporting employee departs.
  - `ROOMS (1) -> (0..N) EVENTS` (`ON DELETE SET NULL`) — Complex events remain valid even if a specific room is unavailable.

---

### SLIDE 8: Formal Normalization Proofs (1NF to BCNF)
**Title**: Normalization Proofs: Guaranteed 3NF & BCNF
- **1NF (Atomicity)**: All attributes are scalar; equipment is partitioned into discrete boolean columns (`has_projector`, `has_ac`); bookings are separate tuples.
- **2NF (No Partial Dependencies)**: Single-attribute surrogate keys (`id`) eliminate partial dependencies; in `ROOMS`, non-key attributes depend on both `building_id` and `room_number`.
- **3NF (No Transitive Dependencies)**: In `BUILDINGS`, $\{id\} \to code \to name$. Since $code$ is an alternate unique candidate key, it is a superkey, satisfying 3NF.
- **BCNF (Superkey Determinants)**: Across all 6 relations, every determinant in all active functional dependencies is a candidate key.

---

### SLIDE 9: Integrity Constraints & Business Invariants
**Title**: Multi-Layered Schema Constraints
- **Primary & Surrogate Keys**: Auto-incrementing identity columns (`GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`).
- **Natural Business Keys**:
  - `uq_users_email`: Unique institutional email address.
  - `uq_buildings_code`: Unique building acronym (e.g., `TURING`, `ENG`).
  - `uq_building_room_number`: Room numbers unique within each building.
- **Domain CHECK Constraints**:
  - `chk_booking_times_valid`: `end_time > start_time`.
  - `chk_room_capacity_positive`: `capacity > 0`.
  - `chk_user_role`: `role IN ('STUDENT', 'FACULTY', 'ADMIN', 'STAFF')`.
  - `chk_ticket_priority`: `priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`.

---

### SLIDE 10: The 20 SQL Syllabus Concepts
**Title**: Complete Coverage of Academic DBMS Syllabus
- **Data Query Language**: Selection, Projection, Multi-key Hierarchical Sorting, `DISTINCT` duplicate elimination.
- **Relational Joins**: Inner Equi-Joins, Left Outer Joins, Right Outer Joins, 4-Way Multi-Table Joins.
- **Aggregations & Grouping**: `COUNT, SUM, AVG, MIN, MAX`, `GROUP BY` with post-aggregation `HAVING`.
- **Advanced Subqueries**: Non-correlated `IN` subqueries, Correlated subqueries, Semi-joins via `NOT EXISTS`.
- **Data Modification & Control**: DML transactions, `SAVEPOINT` and `ROLLBACK`, Pre-compiled Views, Index Optimization (`EXPLAIN PLAN`).

---

### SLIDE 11: Advanced SQL Implementation Highlights
**Title**: Non-Inflating Aggregations & Availability Search
- **Solving the Join Row-Multiplication Flaw**:
  - Naive join of `BUILDINGS` $\to$ `ROOMS` $\to$ `MAINTENANCE_TICKETS` multiplies building capacity by ticket count!
  - **CampusPulse Solution**: Independent pre-aggregated subqueries (`r_agg` and `t_agg`) joined on `building_id`.
- **Subquery with NOT EXISTS (Available Now)**:
  - Finds rooms where `NOT EXISTS` any active confirmed booking during the requested window.
  - Short-circuit evaluation provides superior performance compared to `NOT IN`.

---

### SLIDE 12: Pre-Compiled Relational Views
**Title**: Database Views for Real-Time Telemetry
- **View 1: `v_dashboard_summary`**:
  - Pre-computes total rooms, available rooms, occupied rooms, maintenance rooms, and occupancy rate per building.
  - Offloads real-time analytical calculations from Python to the Oracle database engine.
- **View 2: `v_room_live_status`**:
  - Joins room attributes with currently active booking (if any) and active open work order (if any).
  - Supplies instant real-time status to the spatial digital twin.

---

### SLIDE 13: Transaction Management & ACID Guarantees
**Title**: Practical ACID Guarantees in CampusPulse
- **Atomicity**: Failed bookings or constraint violations trigger `db.rollback()`; verified in automated test `test_transaction_atomicity_and_rollback`.
- **Consistency**: The database transitions only between valid states enforcing all declared `CHECK`, `FK`, and trigger invariants.
- **Isolation**: Pessimistic row locking (`SELECT ... FOR UPDATE`) prevents concurrent race conditions and non-repeatable reads.
- **Durability**: All committed transactions are flushed to Oracle Redo Logs and Datafiles, persisting across server restarts.

---

### SLIDE 14: Half-Open Interval Scheduling: $[start, end)$
**Title**: Mathematical Half-Open Interval Scheduling
- **Model**: Every booking occupies $[start\_time, end\_time)$.
- **Mathematical Non-Overlap Condition**:
  $$(e_1 \le s_2) \lor (s_1 \ge e_2)$$
- **Overlap Predicate (Negation via De Morgan's Laws)**:
  $$\text{Overlap} \iff (e_1 > s_2) \land (s_1 < e_2)$$
- **Key Advantage**: Adjacent back-to-back bookings (e.g. 10:00–11:00 and 11:00–12:00) are accepted without false-positive collisions.

---

### SLIDE 15: Concurrency Control & Pessimistic Row Locking
**Title**: Concurrency Control via `SELECT ... FOR UPDATE`
- **Mechanism**:
  - Incoming booking transaction locks parent room row: `SELECT * FROM rooms WHERE id = :id FOR UPDATE`.
  - Serializes concurrent attempts targeting the same room; subsequent transactions queue in database lock queues.
  - Winner commits and releases lock; queued transaction unblocks, re-evaluates conflict query, detects existing booking, and is rejected with **HTTP 409 Conflict**.
- **Key Benefits**:
  - Granular: Different rooms book concurrently with zero waiting.
  - Eliminates Phantom Reads: Locks the parent record before the child booking exists.
  - Deadlock-Free: Transactions lock only a single room in deterministic sequence.

---

### SLIDE 16: Oracle PL/SQL Compound Trigger
**Title**: Mutating-Table Immunity via Compound Trigger
- **The Problem**: Standard Oracle triggers throw `ORA-04091: table BOOKINGS is mutating` when querying the table being inserted into.
- **The Solution**: Oracle `COMPOUND TRIGGER` (`TRG_NO_OVERLAPPING_BOOKINGS`):
  1. `BEFORE STATEMENT`: Clears session in-memory collections.
  2. `AFTER EACH ROW`: Buffers `:NEW` timestamps and room IDs in memory without querying the mutating table.
  3. `AFTER STATEMENT`:
     - Acquires parent room locks in deterministic sorted order via associative array (`PLS_INTEGER`) to serialize direct SQL transactions and prevent deadlocks.
     - Queries `bookings` safely (mutation complete); raises `RAISE_APPLICATION_ERROR(-20001, ...)` on overlap.

---

### SLIDE 17: Live Application & SQL Demonstration Plan
**Title**: Demonstration Sequence for Laboratory Evaluation
1. **System Health & Connectivity**: Verify Oracle 21c listener and FastAPI backend status.
2. **Operations Dashboard**: Inspect real-time occupancy metrics and booking trend charts.
3. **Interactive Campus Map**: Navigate vector SVG map, inspect Turing Hub and Room 101.
4. **The Critical Concurrency Demo**:
   - Create Booking A (10:00–12:00).
   - Attempt overlapping Booking B (11:00–13:00) $\to$ **Rejected with HTTP 409**.
   - Create adjacent back-to-back Booking C (12:00–14:00) $\to$ **Accepted**.
   - Cancel Booking A $\to$ Availability restored immediately.
5. **DBMS Studio**: Live execution of 4-way join and non-inflating aggregations with latency display.
6. **SQL*Plus Trigger Defense**: Direct SQL insert demonstrating trigger-level rejection (`ORA-20001`).

---

### SLIDE 18: Testing & Verification Audit
**Title**: Comprehensive Automated Test Suite Audit
- **45 Automated Tests Collected & Verified (100% Pass Rate)**:
  - `test_api.py` (16 tests): API endpoints, queries, filters, state transitions.
  - `test_concurrency.py` (4 tests): Multi-threaded race conditions (4 threads, 2 simultaneous requests, adjacent bookings).
  - `test_database_integrity.py` (12 tests): Foreign keys, unique/check constraints, atomic rollback.
  - `test_oracle_integration.py` (9 tests): `USER_TABLES`, `SELECT FOR UPDATE` blocking (`ORA-00054`), direct SQL trigger enforcement.
  - `test_sql_demonstrations.py` (4 tests): Automated execution of 20 syllabus queries.
- **Dual Testing Mode**: 45 passed on live Oracle 21c; 27 passed in offline SQLite fallback mode.

---

### SLIDE 19: Architectural Trade-offs & Future Scope
**Title**: Honest Limitations & Future Enhancements
- **Locking Granularity**: Locking parent room row serializes all requests for that room; optimal for real-time safety, but multiple non-overlapping slots wait sequentially.
- **Authentication Scope**: Deliberately simplified to registered stakeholder dropdown to maintain evaluation focus on database systems engineering.
- **Hard vs Soft Deletes**: `ON DELETE CASCADE` used for academic purity; enterprise systems would employ soft deletes (`is_deleted`) to preserve historical analytics.
- **Future Scope**: Integration with campus IoT hardware sensors for automatic room state transitions and recurring schedule expansion.

---

### SLIDE 20: Conclusion & Viva Readiness
**Title**: Conclusion & Evaluation Defense
- **Summary**: CampusPulse successfully demonstrates an enterprise-grade smart campus operations platform anchored on Oracle Database 21c.
- **Key Takeaway**: Delivers mathematical interval scheduling, BCNF normalization, pessimistic row-level locking, and compound trigger enforcement with 100% verified test coverage.
- **Readiness**: All source files, schemas, queries, and automated tests are fully prepared for viva cross-examination.
- **Thank You**: We invite your questions and welcome the live demonstration!
