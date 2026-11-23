# 08 — Testing, Verification & QA Audit

## 1. Testing Summary & Live Verification Results

The CampusPulse test suite was executed and audited against the active local environment.

| Evaluation Metric | Verification Status | Timestamp / Details |
|---|---|---|
| **Authoritative Oracle 21c Suite** | **45 Passed / 0 Failed (100% Green)** | Executed via pytest in 5.71s |
| **Offline SQLite Fallback Mode** | **27 Passed / 18 Skipped / 0 Failed** | Supported for offline grading machines |
| **Frontend Production Build** | **Compiled Cleanly (Exit Code 0)** | `tsc -b && vite build` built in 1.36s |
| **Schema Integrity Audit** | **All 9 Checks Passed (Exit Code 0)** | Verified via `backend/scripts/verify_db.py` |

---

## 2. Test Suite Breakdown (All 45 Test Cases)

### Suite 1: REST API Integration (`backend/tests/test_api.py` — 16 Tests)
- `test_health`: Validates `/health` returns `{"status": "healthy"}`.
- `test_root`: Verifies root metadata and documentation links.
- `test_dashboard_stats`: Confirms all aggregate counts match live database rows.
- `test_buildings_endpoint`: Validates building retrieval and room counts.
- `test_rooms_list_and_filters`: Tests room search by building, status, capacity, and keyword.
- `test_not_exists_availability_query`: Validates conflict-free room availability calculation.
- `test_booking_creation_and_conflict_rejection`: Verifies booking creation (201) and collision rejection (409).
- `test_back_to_back_bookings_accepted`: Confirms half-open interval $[s, e)$ back-to-back validity.
- `test_different_rooms_concurrent_bookings`: Tests parallel creation of bookings for distinct rooms.
- `test_invalid_booking_time_interval`: Asserts that `end_time <= start_time` raises HTTP 400.
- `test_maintenance_room_status_transitions`: Validates state machine (`OPEN` $\to$ `IN_PROGRESS` $\to$ `RESOLVED`).
- `test_event_validation_and_room_building_consistency`: Rejects events assigned to rooms not in that building.
- `test_analytics_queries`: Audits DBMS Studio SQL query execution.
- `test_analytics_unknown_query_404`: Verifies that invalid query identifiers return HTTP 404.
- `test_analytics_aggregation_no_multiplication`: Asserts no Cartesian row multiplication in multi-table aggregations.
- `test_dashboard_view_regression`: Regression test for `v_dashboard_summary` view queries.

### Suite 2: Multi-Threaded Concurrency (`backend/tests/test_concurrency.py` — 4 Tests)
- `test_concurrent_booking_conflict`: 4 parallel threads target the same room and slot; asserts exactly 1 succeeds (201) and 3 are rejected (409) with zero duplicate database rows.
- `test_concurrent_two_simultaneous_api_requests_same_room_and_time`: 2 simultaneous requests; exactly 1 succeeds, 1 rejected with 409.
- `test_concurrent_different_rooms_api_bookings`: 2 simultaneous requests for different rooms both succeed with 201.
- `test_concurrent_adjacent_back_to_back_api_bookings`: 2 adjacent requests for $[T_1, T_2)$ and $[T_2, T_3)$ both succeed with 201.

### Suite 3: Database Integrity & ACID Constraints (`backend/tests/test_database_integrity.py` — 12 Tests)
- `test_foreign_key_violation_orphaned_room`: Asserts FK rejection on invalid `building_id`.
- `test_foreign_key_violation_orphaned_booking`: Asserts FK rejection on invalid `room_id`.
- `test_unique_constraint_user_email`: Asserts duplicate email rejection.
- `test_unique_constraint_room_number_per_building`: Rejects duplicate room numbers within the same building.
- `test_check_constraint_room_capacity_positive`: Asserts `CHECK (capacity > 0)`.
- `test_check_constraint_user_role`: Asserts `CHECK (role IN ('STUDENT','FACULTY',...))`.
- `test_check_constraint_booking_times_valid`: Asserts `CHECK (end_time > start_time)`.
- `test_booking_maintenance_room_rejection`: Rejects booking attempts on rooms marked `MAINTENANCE`.
- `test_oracle_trigger_direct_sql_conflict_rejection`: Validates trigger rejection (`ORA-20001`) of raw SQL inserts.
- `test_transaction_atomicity_and_rollback`: Asserts complete rollback leaving 0 partial records on error.
- `test_views_correctness_and_consistency`: Verifies consistency between live views and table counts.
- `test_cancelled_booking_permits_new_booking`: Asserts that cancelling a booking restores slot availability.

### Suite 4: Oracle-Specific Integration (`backend/tests/test_oracle_integration.py` — 9 Tests)
- `test_oracle_schema_tables_and_metadata`: Verifies all 6 tables exist in `USER_TABLES`.
- `test_oracle_trigger_compilation_and_validity`: Asserts `TRG_NO_OVERLAPPING_BOOKINGS` is `ENABLED` and `VALID`.
- `test_oracle_views_compilation_and_validity`: Asserts views are `VALID` in `USER_OBJECTS`.
- `test_oracle_row_locking_select_for_update_blocks_concurrent_session`: Confirms real session blocking via `SELECT ... FOR UPDATE NOWAIT` (`ORA-00054`).
- `test_oracle_direct_sql_two_simultaneous_overlapping_inserts`: Verifies trigger-level serialization & rollback across independent Oracle sessions.
- `test_oracle_direct_sql_concurrent_different_rooms`: Direct SQL concurrent inserts on distinct rooms commit cleanly.
- `test_oracle_direct_sql_adjacent_back_to_back_bookings`: Direct SQL back-to-back inserts succeed.
- `test_oracle_direct_sql_concurrent_updates_to_booking_intervals`: Validates that updating existing bookings to overlap triggers `ORA-20001`.
- `test_oracle_all_studio_queries`: Executes all 5 DBMS Studio queries against Oracle 21c.

### Suite 5: SQL Syllabus Demonstrations (`backend/tests/test_sql_demonstrations.py` — 4 Tests)
- `test_sql_demo_basic_select_and_ordering`: Validates Selection, Projection, and hierarchical `ORDER BY`.
- `test_sql_demo_distinct_and_joins`: Validates `DISTINCT`, Inner Join, Left Join, Right Join, and 4-way Join.
- `test_sql_demo_aggregations_and_subqueries`: Validates `COUNT/SUM/AVG`, `GROUP BY/HAVING`, `IN`, Correlated Subqueries, and `NOT EXISTS`.
- `test_sql_demo_views_and_date_math`: Validates view queries and fractional date math.

---

## 3. How to Execute Tests During Evaluation

### Running Against Authoritative Live Oracle 21c:
```powershell
backend\venv\Scripts\python.exe -m pytest -v
```
*Expected Result*: **`45 passed, 1 warning in ~5.7s`**

### Running in Offline SQLite Fallback Mode (No Oracle):
```powershell
$env:DATABASE_URL="sqlite:///./campuspulse_test.db"
backend\venv\Scripts\python.exe backend\scripts\init_db.py
backend\venv\Scripts\python.exe -m pytest -v
Remove-Item ./campuspulse_test.db
```
*Expected Result*: **`27 passed, 18 skipped in ~2.5s`**
