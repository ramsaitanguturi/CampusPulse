# CampusPulse — Comprehensive Technical Testing & Verification Report
### Formal Quality Assurance and DBMS Compliance Audit

---

## 1. Test Environment Specification

| Component | Technical Details |
| :--- | :--- |
| **Operating System** | Windows 11 Enterprise / Pro (x64) |
| **Primary Relational Database** | **Oracle Database 21c Express Edition (XE) Release 21.3.0.0.0** |
| **Container / Pluggable DB** | `XEPDB1` |
| **Secondary Offline Database** | SQLite 3 (Offline / Fallback Unit Testing Mode) |
| **Python Runtime** | Python 3.12.10 |
| **Database Driver** | `python-oracledb` v26.0.1 (Thin Mode) / `sqlite3` |
| **ORM / Data Access** | SQLAlchemy 2.1.6 |
| **Web API Framework** | FastAPI 0.162.0 / Pydantic v2.14.1 |
| **Test Runner** | pytest 9.1.1, pluggy 1.7.0, anyio 4.15.1 |
| **Frontend Runtime** | React 19.3.1, TypeScript 6.0.3, Vite 8.3.5 |

---

## 2. Test Execution Summary

### Primary Test Run: Authoritative Oracle Database 21c Backend
```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.7.0 -- C:\Users\ramsa\Desktop\CampusPulse\backend\venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\ramsa\Desktop\CampusPulse
configfile: pytest.ini
plugins: anyio-4.15.1
collected 45 items

Passed:     45
Failed:      0
Skipped:     0
Not Run:     0
Total:      45
Execution Time: ~5.22 seconds
Status:     100% PASSING (GREEN)
==============================================================================
```

### Secondary Test Run: Offline Fallback SQLite Mode (`DATABASE_URL=sqlite:///...`)
```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.7.0 -- C:\Users\ramsa\Desktop\CampusPulse\backend\venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\Users\ramsa\Desktop\CampusPulse
configfile: pytest.ini
plugins: anyio-4.15.1
collected 45 items

Passed:     27
Failed:      0
Skipped:    18 (Oracle PL/SQL trigger, row-locking & SQL*Plus demo tests safely skipped)
Not Run:     0
Total:      45
Execution Time: ~3.07 seconds
Status:     PASSING (GREEN)
==============================================================================
```

---

## 3. Detailed Breakdown of Test Suites

### Suite 1: Web API & Business Logic Integration (`backend/tests/test_api.py`)
Verifies REST API contracts, status code mappings, and service operations:

| # | Test Function Name | Tested Functionality | Outcome (Oracle) | Outcome (SQLite) |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `test_health` | Verifies `/health` endpoint returns HTTP 200 `{"status": "healthy"}` | **PASSED** | **PASSED** |
| 2 | `test_root` | Verifies `/` root service metadata and documentation links | **PASSED** | **PASSED** |
| 3 | `test_dashboard_stats` | Verifies aggregate metrics across all campus buildings, rooms, and bookings | **PASSED** | **PASSED** |
| 4 | `test_buildings_endpoint` | Verifies `/api/buildings` returns all 5 seeded campus facilities with coordinates | **PASSED** | **PASSED** |
| 5 | `test_rooms_list_and_filters` | Tests room filtering by status, room type, capacity, and keyword search | **PASSED** | **PASSED** |
| 6 | `test_not_exists_availability_query` | Verifies SQL NOT EXISTS room availability query for specific time windows | **PASSED** | **PASSED** |
| 7 | `test_booking_creation_and_conflict_rejection` | Creates a booking, verifies conflict rejection (HTTP 409), and confirms cancellation | **PASSED** | **PASSED** |
| 8 | `test_back_to_back_bookings_accepted` | Verifies half-open interval rule: back-to-back bookings accepted without conflict | **PASSED** | **PASSED** |
| 9 | `test_different_rooms_concurrent_bookings` | Verifies parallel bookings in different rooms execute concurrently | **PASSED** | **PASSED** |
| 10 | `test_invalid_booking_time_interval` | Verifies rejection (HTTP 400) when `end_time <= start_time` | **PASSED** | **PASSED** |
| 11 | `test_maintenance_room_status_transitions` | Verifies room status transitions: `AVAILABLE` $\to$ `MAINTENANCE` $\to$ `AVAILABLE` | **PASSED** | **PASSED** |
| 12 | `test_event_validation_and_room_building_consistency` | Verifies room belongs to parent building before accepting event creation | **PASSED** | **PASSED** |
| 13 | `test_analytics_queries` | Verifies all 5 DBMS Showcase queries return valid tabular data and column metadata | **PASSED** | **PASSED** |
| 14 | `test_analytics_unknown_query_404` | Verifies HTTP 404 response when querying invalid query IDs | **PASSED** | **PASSED** |
| 15 | `test_analytics_aggregation_no_multiplication` | Verifies pre-aggregated subqueries eliminate duplicate ticket Cartesian inflation | **PASSED** | **PASSED** |
| 16 | `test_dashboard_view_regression` | Tests SQL View `v_dashboard_summary` via API for correct occupancy calculations | **PASSED** | **PASSED** |

---

### Suite 2: High-Concurrency Stress Test (`backend/tests/test_concurrency.py`)
Simulates race conditions and simultaneous booking requests:

| # | Test Function Name | Tested Functionality | Outcome (Oracle) | Outcome (SQLite) |
| :--- | :--- | :--- | :--- | :--- |
| 17 | `test_concurrent_booking_conflict` | 4 concurrent threads attempt to reserve the exact same room for the exact same slot. Verifies **Pessimistic Row Locking (`SELECT FOR UPDATE`)** serializes transactions: exactly 1 succeeds (HTTP 201) and exactly 3 are rejected with HTTP 409 Conflict. | **PASSED** | **SKIPPED** |
| 18 | `test_concurrent_two_simultaneous_api_requests_same_room_and_time` | 2 simultaneous API requests for the exact same room and time. Exactly 1 commits, 1 rejected with HTTP 409 Conflict; zero partial data persisted. | **PASSED** | **SKIPPED** |
| 19 | `test_concurrent_different_rooms_api_bookings` | 2 simultaneous API requests for two different rooms. Both succeed concurrently with HTTP 201. | **PASSED** | **SKIPPED** |
| 20 | `test_concurrent_adjacent_back_to_back_api_bookings` | 2 simultaneous API requests for adjacent time intervals on the same room. Both succeed concurrently with HTTP 201 under half-open semantics. | **PASSED** | **SKIPPED** |

---

### Suite 3: Database Integrity, Constraints & ACID Tests (`backend/tests/test_database_integrity.py`)
Audits schema constraints, direct trigger enforcement, and transaction rollbacks:

| # | Test Function Name | Tested Functionality | Outcome (Oracle) | Outcome (SQLite) |
| :--- | :--- | :--- | :--- | :--- |
| 21 | `test_foreign_key_violation_orphaned_room` | Inserting a room with non-existent `building_id` raises `IntegrityError` (`ORA-02291` on Oracle, `FOREIGN KEY constraint failed` on SQLite via `PRAGMA foreign_keys = ON`). | **PASSED** | **PASSED** |
| 22 | `test_foreign_key_violation_orphaned_booking` | Inserting a booking with non-existent `user_id` or `room_id` raises `IntegrityError`. | **PASSED** | **PASSED** |
| 23 | `test_unique_constraint_user_email` | Inserting a duplicate email raises `IntegrityError` (`ORA-00001` / `UNIQUE constraint failed`). | **PASSED** | **PASSED** |
| 24 | `test_unique_constraint_room_number_per_building` | Inserting duplicate `(building_id, room_number)` raises `IntegrityError`. | **PASSED** | **PASSED** |
| 25 | `test_check_constraint_room_capacity_positive` | Inserting negative capacity raises `IntegrityError` (`ORA-02290` / `CHECK constraint failed`). | **PASSED** | **PASSED** |
| 26 | `test_check_constraint_user_role` | Inserting unauthorized role raises `IntegrityError` (`chk_user_role`). | **PASSED** | **PASSED** |
| 27 | `test_check_constraint_booking_times_valid` | Booking with `end_time <= start_time` raises `IntegrityError` (`chk_booking_times_valid`). | **PASSED** | **PASSED** |
| 28 | `test_booking_maintenance_room_rejection` | Booking an offline room marked `MAINTENANCE` is rejected with descriptive error. | **PASSED** | **PASSED** |
| 29 | `test_oracle_trigger_direct_sql_conflict_rejection` | Direct SQL inserts bypassing API are intercepted by compound trigger and raise `ORA-20001`. | **PASSED** | **SKIPPED** |
| 30 | `test_transaction_atomicity_and_rollback` | Multi-step transaction failing midway executes `ROLLBACK`; asserts zero partial rows leaked. | **PASSED** | **PASSED** |
| 31 | `test_views_correctness_and_consistency` | Mathematical audit of `v_dashboard_summary`: `total = available + occupied + maintenance`. | **PASSED** | **PASSED** |
| 32 | `test_cancelled_booking_permits_new_booking` | Verifies cancelling a booking immediately frees the time window for subsequent reservations. | **PASSED** | **PASSED** |

---

### Suite 4: Oracle Database Integration (`backend/tests/test_oracle_integration.py`)
Validates Oracle data dictionary objects, triggers, and query compilation:

| # | Test Function Name | Tested Functionality | Outcome (Oracle) | Outcome (SQLite) |
| :--- | :--- | :--- | :--- | :--- |
| 33 | `test_oracle_schema_tables_and_metadata` | Audits Oracle `USER_TABLES` metadata for all 6 entities. | **PASSED** | **SKIPPED** |
| 34 | `test_oracle_trigger_compilation_and_validity` | Verifies `trg_no_overlapping_bookings` is `ENABLED` in `USER_TRIGGERS` & `VALID` in `USER_OBJECTS`. | **PASSED** | **SKIPPED** |
| 35 | `test_oracle_views_compilation_and_validity` | Verifies views `v_dashboard_summary` & `v_room_live_status` are `VALID` in `USER_OBJECTS`. | **PASSED** | **SKIPPED** |
| 36 | `test_oracle_row_locking_select_for_update_blocks_concurrent_session` | Verifies real cross-session pessimistic row locking: Session 1 holds lock via `SELECT FOR UPDATE`, Session 2 attempting `SELECT FOR UPDATE NOWAIT` is rejected with `ORA-00054`. | **PASSED** | **SKIPPED** |
| 37 | `test_oracle_direct_sql_two_simultaneous_overlapping_inserts` | Two independent database sessions execute simultaneous direct SQL inserts for the same room and overlapping times. The compound trigger locks parent room, serializing them; exactly 1 commits, 1 raises `ORA-20001` and rolls back. | **PASSED** | **SKIPPED** |
| 38 | `test_oracle_direct_sql_concurrent_different_rooms` | Two independent Oracle sessions concurrently insert bookings for different rooms. Both commit concurrently without blocking. | **PASSED** | **SKIPPED** |
| 39 | `test_oracle_direct_sql_adjacent_back_to_back_bookings` | Direct SQL back-to-back bookings `[T1, T2)` and `[T2, T3)` on the same room. Both commit successfully under half-open interval semantics. | **PASSED** | **SKIPPED** |
| 40 | `test_oracle_direct_sql_concurrent_updates_to_booking_intervals` | Direct SQL concurrent UPDATE modifying booking interval to overlap an existing confirmed booking. Intercepted by compound trigger with `ORA-20001`, rolled back cleanly. | **PASSED** | **SKIPPED** |
| 41 | `test_oracle_all_studio_queries` | Verifies all 5 DBMS Studio queries execute without errors on Oracle SQL 21c. | **PASSED** | **SKIPPED** |

---

### Suite 5: SQL Syllabus Demonstration Verification (`backend/tests/test_sql_demonstrations.py`)
Validates execution of the 20 demonstration queries:

| # | Test Function Name | Tested Functionality | Outcome (Oracle) | Outcome (SQLite) |
| :--- | :--- | :--- | :--- | :--- |
| 42 | `test_sql_demo_basic_select_and_ordering` | Verifies `SELECT`, `WHERE`, and multi-level `ORDER BY`. | **PASSED** | **SKIPPED** |
| 43 | `test_sql_demo_distinct_and_joins` | Verifies `DISTINCT`, `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, and 4-Way Join. | **PASSED** | **SKIPPED** |
| 44 | `test_sql_demo_aggregations_and_subqueries` | Verifies `COUNT`/`SUM`/`AVG`/`MIN`/`MAX`, `GROUP BY ... HAVING`, and `NOT EXISTS`. | **PASSED** | **SKIPPED** |
| 45 | `test_sql_demo_views_and_date_math` | Verifies view querying, date arithmetic (`ROUND`), and parametric search. | **PASSED** | **SKIPPED** |

---

## 4. Real Oracle 21c Multi-Session Concurrency & Compound Trigger Audit

Executed directly against Oracle Database 21c (`XEPDB1`) using independent Oracle sessions:

```
======================================================================
CAMPUSPULSE ORACLE DATABASE 21c DIRECT VERIFICATION
======================================================================

[TASK 1] Oracle 21c Instance Verification:
  - Banner:       Oracle Database 21c Express Edition Release 21.0.0.0.0 - Production Version 21.3.0.0.0
  - Database:     XEPDB1
  - PDB / CON:    XEPDB1
  - Session User: CAMPUSPULSE
  - User Tables:  BOOKINGS, BUILDINGS, EVENTS, MAINTENANCE_TICKETS, ROOMS, USERS

[TASK 3] Compound Trigger Compilation and Validity:
  - Trigger Name:     TRG_NO_OVERLAPPING_BOOKINGS
  - Trigger Type:     COMPOUND
  - Trigger Event:    INSERT OR UPDATE
  - Trigger Status:   ENABLED
  - Object Status:    VALID
  - Compilation:      CLEAN (0 errors in USER_ERRORS)

[TASKS 4 & 5] Concurrent Overlapping Bookings with Independent Sessions:
  - Session-1 (Oracle SID 249): Attempting INSERT 'DirectSQL Test Overlap A' on Room 1...
  - Session-1 (Oracle SID 249): INSERT succeeded. Holding locks for 1.0s...
  - Session-2 (Oracle SID 983): Attempting INSERT 'DirectSQL Test Overlap B' on Room 1...
  - Session-1 (Oracle SID 249): Successfully COMMITTED.
  - Session-2 (Oracle SID 983): REJECTED & ROLLED BACK:
       -> ORA-20001: OracleSQL Conflict Error: Room 1 has an overlapping booking during the requested time window.
       -> ORA-06512: at "CAMPUSPULSE.TRG_NO_OVERLAPPING_BOOKINGS", line 75
  - Total Independent Sessions: 2
  - Total Commits:              1 (Expected: exactly 1)
  - Total Rollbacks:            1 (Expected: exactly 1)
  - Persisted Rows in DB:       1 (Zero partial data leaked)

[TASK 6] Different-Room and Adjacent (Back-to-Back) Bookings:
  - Different-Room Test: Session A (Room 1) = SUCCESS, Session B (Room 3) = SUCCESS
  - Adjacent Bookings Test: Slot 1 [06:13-08:13) = SUCCESS, Slot 2 [08:13-10:13) = SUCCESS

[TASK 7] Trigger Behavior for INSERT and UPDATE:
  - INSERT 1 (Non-conflicting): COMMITTED.
  - INSERT 2 (Overlapping): REJECTED by compound trigger with ORA-20001.
  - INSERT 3 (Distinct slot): COMMITTED.
  - UPDATE 3 (Moving into Booking 1 window): REJECTED by compound trigger with ORA-20001.
  - UPDATE Rollback Verification: Booking 3 start_time remained unmodified after rollback.
======================================================================
```

---

## 5. Frontend Build & Quality Verification

```powershell
cd frontend
npm ci
npm run build
```

### Actual Command Output
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 2518 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.32 kB │ gzip:   0.74 kB
dist/assets/index-RqpDRpDA.css   44.22 kB │ gzip:   7.97 kB
dist/assets/index-Bc-exCWh.js   714.65 kB │ gzip: 201.33 kB
✓ built in 1.07s (0 TypeScript errors)
```

---

## 6. Verification Commands for Viva & Grading

To reproduce this testing report from a clean environment:

```powershell
# 1. Run all 45 backend and Oracle tests
backend\venv\Scripts\python.exe -m pytest -v

# 2. Run the 9-point Oracle Schema Integrity check
backend\venv\Scripts\python.exe backend\scripts\verify_db.py

# 3. Execute the 20 SQL Demonstrations via SQL*Plus
sqlplus campuspulse/campuspulse123@localhost:1521/XEPDB1 @backend\scripts\sql_demonstrations.sql

# 4. Verify Frontend TypeScript & Production Build
cd frontend; npm.cmd ci; npm.cmd run build
```

### Reproducing Offline Unit Tests (if Oracle is unavailable)
```powershell
$env:DATABASE_URL="sqlite:///./campuspulse_test.db"
backend\venv\Scripts\python.exe backend\scripts\init_db.py
backend\venv\Scripts\python.exe -m pytest -v
# Yields: 27 passed, 18 skipped, 0 failed
```


