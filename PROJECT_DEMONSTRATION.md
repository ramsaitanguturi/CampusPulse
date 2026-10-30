# CampusPulse — DBMS Semester Project Professor Demonstration Guide
### Step-by-Step Script for Laboratory Evaluation & Academic Viva

---

## 1. Demonstration Overview

This guide provides a structured, chronological demonstration script to present **CampusPulse: Smart Campus Digital Twin** to your DBMS professor. It connects theoretical relational database concepts directly to live database tables, queries, triggers, transactions, and UI workflows on **Oracle Database 21c**.

### Total Demonstration Duration
**15 – 20 Minutes**

---

## 2. Pre-Demonstration Environment Preparation

Ensure Oracle 21c XE is running and the database is populated.

### Step 1: Open PowerShell and Verify Oracle Status
```powershell
Get-Service *oracle* | Select-Object Name, Status
```
*Expected Result*: `OracleServiceXE` and `OracleOraDB21Home1TNSListener` are `Running`.

### Step 2: Run Schema Verification
```powershell
backend\venv\Scripts\python.exe backend\scripts\verify_db.py
```
*Expected Result*: All 9 checks pass with exit code 0.

### Step 3: Start the Backend API (Terminal 1)
```powershell
backend\venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000
```
*Expected Result*:
```
[INFO] campuspulse.database: Database connected successfully. Dialect: Oracle SQL 21c (oracledb)
Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Step 4: Start the Frontend UI (Terminal 2)
```powershell
cd frontend
npm.cmd run dev
```
*Expected Result*:
```
VITE v8.3.5 ready in 250 ms
➜  Local:   http://localhost:5173/
```

Open your browser to: **`http://localhost:5173`** (or API interactive docs at **`http://127.0.0.1:8000/docs`**).

---

## 3. Phase 1: High-Level Architecture & 3NF Schema Presentation (3 Minutes)

### Narrative to Professor:
> *"Professor, CampusPulse is a smart campus digital twin built on top of Oracle Database 21c. Rather than simply using mock data or an in-memory database, the application models university physical infrastructure across six 3NF-normalized relations with integrity constraints, row-level concurrency locks, and PL/SQL triggers enforced directly at the DBMS engine layer."*

### What to Show:
1. Open `DATABASE_DESIGN.md` and show the **Mermaid ER Diagram**.
2. Explain the **6 core relations**:
   - `USERS`: Campus members (Students, Faculty, Admins, Staff) with `CHECK` constraints on roles and `UNIQUE` emails.
   - `BUILDINGS`: Campus structures with geographical/canvas coordinates (`map_x`, `map_y`) and operational statuses.
   - `ROOMS`: Lecture halls, labs, and auditoriums with composite uniqueness on `(building_id, room_number)` and `ON DELETE CASCADE`.
   - `BOOKINGS`: Half-open temporal reservation windows `[start_time, end_time)` with `CHECK (end_time > start_time)`.
   - `MAINTENANCE_TICKETS`: Work orders linked to rooms, which dynamically trigger status transitions.
   - `EVENTS`: Campus gatherings mapped to buildings and optional rooms.
3. Show the **3NF & BCNF Normalization Proof**:
   - Every relation has single-attribute surrogate keys or minimal composite keys.
   - No repeating groups (1NF).
   - No partial dependencies (2NF).
   - No transitive dependencies (3NF).
   - Every determinant is a candidate key (BCNF).

---

## 4. Phase 2: Live Digital Twin Control Center Walkthrough (4 Minutes)

Navigate to **`http://localhost:5173`** in your browser.

### 1. Dashboard View
- Point to the top status badge: `ORACLE SQL 21c • ORACLEDB`.
- Point to the real-time counters: Total Buildings (5), Total Rooms (25), Available Rooms, Active Bookings, Open Work Orders.
- Explain that these metrics are **not hardcoded**; they are calculated live via SQL aggregations and joins.

### 2. Interactive Campus Map (Spatial Twin)
- Click on **Campus Map** in the left sidebar.
- Click on the **Turing Computing & AI Hub** (`TURING`).
- The right panel instantly displays all rooms on Floor 1, Floor 2, and Floor 3.
- Click on **Room 101 (Turing Auditorium)**:
  - Show the room specifications (Capacity: 180 seats, Room Type: AUDITORIUM, Equipment: Projector, AC).
  - Show the upcoming booking schedule queried live from Oracle.

---

## 5. Phase 3: The Critical Feature — Concurrency Control & Booking Conflict Prevention (4 Minutes)

### Narrative to Professor:
> *"Now I will demonstrate the most important database feature: conflict-free temporal room scheduling under concurrent access. We enforce half-open interval semantics $[s, e)$ using a three-tier defense: application validation, pessimistic row-level locking with `SELECT ... FOR UPDATE`, and an Oracle PL/SQL Compound Trigger."*

### Step 1: Demonstrate Normal Booking
1. Navigate to **Bookings** in the sidebar.
2. Click **+ New Reservation**.
3. Select:
   - Room: `101 (Engineering & Robotics Complex)`
   - User: `Dr. Evelyn Reed`
   - Title: `DBMS Professor Evaluation Session`
   - Date: Tomorrow's date
   - Time: `10:00` to `12:00`
4. Click **Confirm Reservation**.
5. The booking appears in the table with status `CONFIRMED`.

### Step 2: Demonstrate Overlapping Conflict Rejection
1. Click **+ New Reservation** again.
2. Select the **same room** (`101 (Engineering)`).
3. Select a **different user** (`Prof. Marcus Vance`).
4. Select an **overlapping time window**:
   - Same Date
   - Time: `11:00` to `13:00` (overlaps from 11:00 to 12:00!)
5. Click **Confirm Reservation**.
6. **Expected UI Result**:
   - The reservation is **REJECTED** with a prominent red alert:
     > *"Booking conflict: Room 101 is already booked for 'DBMS Professor Evaluation Session' by Dr. Evelyn Reed from 10:00 to 12:00."*
   - Returns **HTTP 409 Conflict**.
   - Zero duplicate rows are written to Oracle.

### Step 3: Demonstrate Half-Open Interval Back-to-Back Booking
1. Now change the start time to `12:00` and end time to `14:00` (ends exactly when the prior ends).
2. Click **Confirm Reservation**.
3. **Expected UI Result**:
   - Succeeded! The reservation is confirmed because under $[s, e)$, $(12:00 \le 12:00)$ is valid.

### Step 4: Demonstrate Cancellation Restoring Availability
1. Find `DBMS Professor Evaluation Session` (10:00 - 12:00).
2. Click **Cancel Booking**.
3. Status changes to `CANCELLED`.
4. Now immediately book `10:00` to `12:00` again.
5. It succeeds immediately because cancelled bookings do not block availability.

---

## 6. Phase 4: Oracle PL/SQL Compound Trigger & Engine-Level Proof (3 Minutes)

### Narrative to Professor:
> *"Professor, even if someone bypasses our web application entirely and executes a raw SQL INSERT into Oracle, the database kernel will still reject overlapping bookings via our PL/SQL Compound Trigger. Furthermore, standard triggers throw `ORA-04091 mutating-table` error when querying the table being inserted into. We solved this using a COMPOUND TRIGGER."*

### Demonstration in SQL\*Plus:
Open PowerShell and run SQL\*Plus:
```powershell
sqlplus campuspulse/campuspulse123@localhost:1521/XEPDB1
```

Run Query 17 from `sql_demonstrations.sql`:
```sql
DECLARE
    v_room_id NUMBER;
    v_user_id NUMBER;
    v_now TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP + INTERVAL '90' DAY;
BEGIN
    SELECT MIN(id) INTO v_room_id FROM rooms WHERE status = 'AVAILABLE';
    SELECT MIN(id) INTO v_user_id FROM users;

    -- Insert Booking A
    INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status)
    VALUES (v_room_id, v_user_id, 'Viva Booking A', v_now, v_now + INTERVAL '2' HOUR, 'CONFIRMED');

    -- Insert Overlapping Booking B (11:00 to 13:00)
    INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status)
    VALUES (v_room_id, v_user_id, 'Viva Conflict B', v_now + INTERVAL '1' HOUR, v_now + INTERVAL '3' HOUR, 'CONFIRMED');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Caught by Oracle Trigger: ' || SQLERRM);
        ROLLBACK;
END;
/
```

### Expected Output:
```
Caught by Oracle Trigger: ORA-20001: OracleSQL Conflict Error: Room 1 has an overlapping booking during the requested time window.
```

Explain:
- **`BEFORE STATEMENT`**: Clears the session collection.
- **`AFTER EACH ROW`**: Collects the `:NEW` row in memory without querying the mutating table.
- **`AFTER STATEMENT`**: Queries `bookings` when the table is no longer mutating.

---

## 7. Phase 5: DBMS Viva Query Studio Demonstration (3 Minutes)

Navigate back to the browser and click on **DBMS Studio** in the left sidebar.

### Demonstrate the 5 Live Showcase Queries:

1. **Multi-Table 4-Way Join (`multi_table_join`)**:
   - Shows `INNER JOIN` across `BOOKINGS`, `ROOMS`, `BUILDINGS`, and `USERS` with `ORDER BY start_time DESC` and `FETCH FIRST 10 ROWS ONLY`.
   - Point out real-time query latency measurement (`LATENCY: ~1.2 ms`).
2. **Aggregation & Pre-Aggregated Subqueries (`aggregation_groupby`)**:
   - Shows building capacity calculations and open ticket counts.
   - **Crucial DBMS Point**: Explain to the professor why we use pre-aggregated subqueries (`r_agg` and `t_agg`) joined on `building_id` — this prevents Cartesian row multiplication that would falsely multiply capacity by the number of tickets!
3. **Room Availability with NOT EXISTS (`not_exists_availability`)**:
   - Demonstrates correlated semi-join `NOT EXISTS` checking for zero active confirmed bookings.
4. **Correlated Subquery (`correlated_subquery`)**:
   - Demonstrates finding rooms whose capacity is strictly greater than the average capacity of rooms in that specific building.
5. **Database Views (`view_query`)**:
   - Queries `v_dashboard_summary` showing pre-compiled occupancy rates.

---

## 8. Phase 6: Automated Test Suite Execution (2 Minutes)

Show the professor that our implementation is mathematically proven and regression-tested:

Open Terminal and run:
```powershell
backend\venv\Scripts\python.exe -m pytest -v
```

### Show the Output:
- **45 tests collected, 45 passed, 0 skipped, 0 failed in ~5 seconds!**
- Point out:
  - `test_concurrent_booking_conflict` & `test_concurrent_two_simultaneous_api_requests_*`: Parallel threads verified with row locks.
  - `test_foreign_key_violation_*`: Referential integrity constraints verified on both Oracle (`ORA-02291`) and SQLite (`PRAGMA foreign_keys = ON`).
  - `test_unique_constraint_*`: Unique constraints verified.
  - `test_check_constraint_*`: Domain CHECK constraints verified.
  - `test_oracle_direct_sql_two_simultaneous_overlapping_inserts`: Direct SQL concurrency safety and compound trigger verified across independent Oracle sessions.
  - `test_oracle_row_locking_select_for_update_blocks_concurrent_session`: Cross-session blocking with `SELECT ... FOR UPDATE NOWAIT` verified (`ORA-00054`).
  - `test_transaction_atomicity_and_rollback`: Complete rollback of failed transactions verified.

---

## 9. Conclusion of Viva

Conclude by summarizing:
> *"In conclusion, CampusPulse is a fully realized relational database system. It satisfies 3NF and BCNF, enforces referential integrity with cascading actions, prevents overlapping reservations using row-level locks and PL/SQL compound triggers, guarantees all four ACID properties, and provides real-time analytics on a live Oracle Database 21c instance."*

