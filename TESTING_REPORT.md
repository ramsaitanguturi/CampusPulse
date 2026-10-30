# CampusPulse — Comprehensive Technical Testing & Verification Report
### Formal Quality Assurance and DBMS Compliance Audit

---

## 1. Test Environment Specification

| Component | Technical Details |
| :--- | :--- |
| **Operating System** | Windows 11 Enterprise / Pro (x64) |
| **Relational Database** | **Oracle Database 21c Express Edition (XE) Release 21.3.0.0.0** |
| **Container / Pluggable DB** | `XEPDB1` |
| **Python Runtime** | Python 3.12.10 |
| **Database Driver** | `python-oracledb` v26.0.1 (Thin Mode) |
| **ORM / Data Access** | SQLAlchemy 2.1.6 |
| **Web API Framework** | FastAPI 0.162.0 / Pydantic v2.14.1 |
| **Test Runner** | pytest 9.1.1, pluggy 1.7.0, anyio 4.15.1 |
| **Frontend Runtime** | React 19.3.1, TypeScript 6.0.3, Vite 8.3.5 |

---

## 2. Test Execution Summary

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.7.0
rootdir: C:\Users\ramsa\Desktop\CampusPulse
collected 38 items

Passed:    38
Failed:     0
Skipped:    0
Not-Run:    0
Total:     38
Execution Time: ~2.96 seconds
Status:    100% PASSING (GREEN)
==============================================================================
```

---

## 3. Detailed Breakdown of Test Suites

### Suite 1: Web API & Business Logic Integration (`backend/tests/test_api.py`)
Verifies REST API contracts, status code mappings, and service operations:

| # | Test Function Name | Tested Functionality | Outcome |
| :--- | :--- | :--- | :--- |
| 1 | `test_health` | Verifies `/health` endpoint returns HTTP 200 `{"status": "healthy"}` | **PASSED** |
| 2 | `test_root` | Verifies `/` root service metadata and documentation links | **PASSED** |
| 3 | `test_dashboard_stats` | Verifies aggregate metrics across all campus buildings, rooms, and bookings | **PASSED** |
| 4 | `test_buildings_endpoint` | Verifies `/api/buildings` returns all 5 seeded campus facilities with coordinates | **PASSED** |
| 5 | `test_rooms_list_and_filters` | Tests room filtering by status, room type, capacity, and keyword search | **PASSED** |
| 6 | `test_not_exists_availability_query` | Verifies SQL NOT EXISTS room availability query for specific time windows | **PASSED** |
| 7 | `test_booking_creation_and_conflict_rejection` | Creates a booking, verifies conflict rejection (HTTP 409), and confirms cancellation | **PASSED** |
| 8 | `test_back_to_back_bookings_accepted` | Verifies half-open interval rule: back-to-back bookings accepted without conflict | **PASSED** |
| 9 | `test_different_rooms_concurrent_bookings` | Verifies parallel bookings in different rooms execute concurrently | **PASSED** |
| 10 | `test_invalid_booking_time_interval` | Verifies rejection (HTTP 400) when `end_time <= start_time` | **PASSED** |
| 11 | `test_maintenance_room_status_transitions` | Verifies room status transitions: `AVAILABLE` $\to$ `MAINTENANCE` $\to$ `AVAILABLE` | **PASSED** |
| 12 | `test_event_validation_and_room_building_consistency` | Verifies room belongs to parent building before accepting event creation | **PASSED** |
| 13 | `test_analytics_queries` | Verifies all 5 DBMS Showcase queries return valid tabular data and column metadata | **PASSED** |
| 14 | `test_analytics_unknown_query_404` | Verifies HTTP 404 response when querying invalid query IDs | **PASSED** |
| 15 | `test_analytics_aggregation_no_multiplication` | Verifies pre-aggregated subqueries eliminate duplicate ticket Cartesian inflation | **PASSED** |
| 16 | `test_dashboard_view_regression` | Tests SQL View `v_dashboard_summary` via API for correct occupancy calculations | **PASSED** |

---

### Suite 2: High-Concurrency Stress Test (`backend/tests/test_concurrency.py`)
Simulates race conditions and simultaneous booking requests:

| # | Test Function Name | Tested Functionality | Outcome |
| :--- | :--- | :--- | :--- |
| 17 | `test_concurrent_booking_conflict` | 4 concurrent threads attempt to reserve the exact same room for the exact same slot. Verifies **Pessimistic Row Locking (`SELECT FOR UPDATE`)** serializes transactions: exactly 1 succeeds (HTTP 201) and exactly 3 are rejected with HTTP 409 Conflict. | **PASSED** |

---

### Suite 3: Database Integrity, Constraints & ACID Tests (`backend/tests/test_database_integrity.py`)
Audits schema constraints, direct trigger enforcement, and transaction rollbacks:

| # | Test Function Name | Tested Functionality | Outcome |
| :--- | :--- | :--- | :--- |
| 18 | `test_foreign_key_violation_orphaned_room` | Inserting a room with non-existent `building_id` raises `IntegrityError` (`ORA-02291`) | **PASSED** |
| 19 | `test_foreign_key_violation_orphaned_booking` | Inserting a booking with non-existent `user_id` or `room_id` raises `IntegrityError` | **PASSED** |
| 20 | `test_unique_constraint_user_email` | Inserting a duplicate email raises `IntegrityError` (`ORA-00001`) | **PASSED** |
| 21 | `test_unique_constraint_room_number_per_building` | Inserting duplicate `(building_id, room_number)` raises `IntegrityError` | **PASSED** |
| 22 | `test_check_constraint_room_capacity_positive` | Inserting negative capacity raises `IntegrityError` (`ORA-02290`) | **PASSED** |
| 23 | `test_check_constraint_user_role` | Inserting unauthorized role raises `IntegrityError` (`chk_user_role`) | **PASSED** |
| 24 | `test_check_constraint_booking_times_valid` | Booking with `end_time <= start_time` raises `IntegrityError` (`chk_booking_times_valid`)| **PASSED** |
| 25 | `test_booking_maintenance_room_rejection` | Booking an offline room marked `MAINTENANCE` is rejected with descriptive error | **PASSED** |
| 26 | `test_oracle_trigger_direct_sql_conflict_rejection` | Direct SQL inserts bypassing API are intercepted by compound trigger and raise `ORA-20001` | **PASSED** |
| 27 | `test_transaction_atomicity_and_rollback` | Multi-step transaction failing midway executes `ROLLBACK`; asserts zero partial rows leaked | **PASSED** |
| 28 | `test_views_correctness_and_consistency` | Mathematical audit of `v_dashboard_summary`: `total = available + occupied + maintenance` | **PASSED** |
| 29 | `test_cancelled_booking_permits_new_booking` | Verifies cancelling a booking immediately frees the time window for subsequent reservations | **PASSED** |

---

### Suite 4: Oracle Database Integration (`backend/tests/test_oracle_integration.py`)
Validates Oracle data dictionary objects, triggers, and query compilation:

| # | Test Function Name | Tested Functionality | Outcome |
| :--- | :--- | :--- | :--- |
| 30 | `test_oracle_schema_tables_and_metadata` | Audits Oracle `USER_TABLES` metadata for all 6 entities | **PASSED** |
| 31 | `test_oracle_trigger_compilation_and_validity` | Verifies `trg_no_overlapping_bookings` is `ENABLED` in `USER_TRIGGERS` & `VALID` in `USER_OBJECTS` | **PASSED** |
| 32 | `test_oracle_views_compilation_and_validity` | Verifies views `v_dashboard_summary` & `v_room_live_status` are `VALID` in `USER_OBJECTS` | **PASSED** |
| 33 | `test_oracle_row_locking_select_for_update` | Verifies `SELECT ... FOR UPDATE` row locks execute cleanly on Oracle | **PASSED** |
| 34 | `test_oracle_all_studio_queries` | Verifies all 5 DBMS Studio queries execute without errors on Oracle SQL 21c | **PASSED** |

---

### Suite 5: SQL Syllabus Demonstration Verification (`backend/tests/test_sql_demonstrations.py`)
Validates execution of the 20 demonstration queries:

| # | Test Function Name | Tested Functionality | Outcome |
| :--- | :--- | :--- | :--- |
| 35 | `test_sql_demo_basic_select_and_ordering` | Verifies `SELECT`, `WHERE`, and multi-level `ORDER BY` | **PASSED** |
| 36 | `test_sql_demo_distinct_and_joins` | Verifies `DISTINCT`, `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, and 4-Way Join | **PASSED** |
| 37 | `test_sql_demo_aggregations_and_subqueries` | Verifies `COUNT`/`SUM`/`AVG`/`MIN`/`MAX`, `GROUP BY ... HAVING`, and `NOT EXISTS` | **PASSED** |
| 38 | `test_sql_demo_views_and_date_math` | Verifies view querying, date arithmetic (`ROUND`), and parametric search | **PASSED** |

---

## 4. Frontend Build & Quality Verification

```powershell
cd frontend
npm.cmd run build
```

### Result
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
✓ built in 1.24s (0 TypeScript errors)
```

---

## 5. Verification Commands for Viva & Grading

To reproduce this testing report from a clean environment:

```powershell
# 1. Run all 38 backend and Oracle tests
backend\venv\Scripts\pytest -v

# 2. Run the 9-point Oracle Schema Integrity check
backend\venv\Scripts\python.exe backend\scripts\verify_db.py

# 3. Execute the 20 SQL Demonstrations via SQL*Plus
sqlplus campuspulse/campuspulse123@localhost:1521/XEPDB1 @backend\scripts\sql_demonstrations.sql

# 4. Verify Frontend TypeScript & Production Build
cd frontend; npm.cmd run build
```

