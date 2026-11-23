# Live Demonstration Guide: CampusPulse

This guide provides the complete, chronological demonstration sequence to showcase CampusPulse to your university DBMS evaluation panel.

---

## Pre-Demonstration Checklist (2 Minutes Before Demo)

### 1. Verify Oracle Database 21c Service Status
In PowerShell:
```powershell
Get-Service *oracle* | Select-Object Name, Status
```
*Expected Status*: `OracleServiceXE` and `OracleOraDB21Home1TNSListener` are `Running`.

### 2. Run Automated Schema Verification
```powershell
backend\venv\Scripts\python.exe backend\scripts\verify_db.py
```
*Expected Output*: `VERIFICATION RESULT: ALL CHECKS PASSED (EXIT CODE 0)`.

---

## Starting the System (2 Terminals)

### Terminal 1: Start FastAPI Backend
```powershell
backend\venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000
```
- API Healthcheck: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- Interactive Swagger Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Terminal 2: Start React Frontend
```powershell
Set-Location frontend
npm.cmd run dev
```
- Open Browser to: **[http://localhost:5173](http://localhost:5173)**

---

## The 6-Phase Live Demonstration Sequence

### Phase 1: Operations Dashboard (1 Minute)
1. Point to the top status badge in the navbar: `ORACLE SQL 21c • ORACLEDB`.
2. Review the top telemetry cards: Total Buildings (5), Total Rooms (25), Available Rooms, Active Bookings, Open Tickets.
3. Show the **Booking Volume Trends** area chart (daily confirmed bookings).
4. Show the **Building Occupancy** bar chart (computed via `v_dashboard_summary`).
5. **Key Talking Point**: *"Professor, these metrics are not hardcoded; they are computed dynamically via multi-table SQL aggregations across our Oracle database."*

### Phase 2: Spatial Digital Twin & Campus Map (1 Minute)
1. Click **Campus Map** in the sidebar.
2. Click on the **Turing Computing & AI Hub** building polygon.
3. The right panel displays all rooms on Floor 1, Floor 2, and Floor 3.
4. Click on **Room 101 (Turing Auditorium)**:
   - Note specifications: Capacity 180 seats, Room Type: AUDITORIUM, Equipment: Projector, AC.
   - Show upcoming bookings queried live from Oracle.
5. Click **Reserve Room** to prepopulate the booking modal.

### Phase 3: The Critical Concurrency & Conflict Demonstration (2 Minutes)
1. Navigate to **Bookings** in the sidebar and click **+ New Reservation**.
2. **Step A (Successful Booking A)**:
   - Room: `101 (Engineering & Robotics Complex)`
   - User: `Dr. Evelyn Reed`
   - Title: `DBMS Professor Evaluation Session`
   - Date: Tomorrow's date
   - Time: `10:00` to `12:00`
   - Click **Confirm Reservation** $\to$ Confirmed (HTTP 201), appears in schedule table.
3. **Step B (Overlapping Conflict Rejection)**:
   - Click **+ New Reservation** again.
   - Room: Same room (`101`)
   - User: `Prof. Marcus Vance`
   - Title: `Advanced AI Lab Session`
   - Time: `11:00` to `13:00` (overlaps from 11:00 to 12:00!)
   - Click **Confirm Reservation**.
   - **Result**: Prominent red alert banner appears:
     > *"Booking conflict: Room 101 is already booked for 'DBMS Professor Evaluation Session' by Dr. Evelyn Reed from 10:00 to 12:00."*
   - Returns **HTTP 409 Conflict**. Zero duplicate rows written to Oracle.
4. **Step C (Valid Back-to-Back Booking)**:
   - Change start time to `12:00` and end time to `14:00`.
   - Click **Confirm Reservation** $\to$ Succeeded!
   - **Key Talking Point**: *"Under our half-open interval $[s, e)$, $(12:00 \le 12:00)$ is valid, so back-to-back bookings are accepted."*
5. **Step D (Cancellation & Availability Restoration)**:
   - In the table, find `DBMS Professor Evaluation Session` (10:00–12:00).
   - Click **Cancel Booking** $\to$ Status changes to `CANCELLED`.
   - Re-book `10:00` to `12:00` $\to$ Succeeded immediately!

### Phase 4: Facility Maintenance Workflows (1 Minute)
1. Navigate to **Maintenance** in the sidebar.
2. Click **+ Report Incident**:
   - Room: `101 (Turing)` | Priority: `CRITICAL` | Title: `AC Unit Refrigerant Leak`
   - Click **Submit Work Order**.
   - Note: Because priority was `CRITICAL`, Room 101 is automatically transitioned to `MAINTENANCE`.
3. Try booking Room 101 in the Bookings tab $\to$ Rejection alert: *"Room 101 is currently offline for MAINTENANCE."*
4. Return to Maintenance, click **In Progress**, then **Resolve Ticket**.
5. Room 101 automatically transitions back to `AVAILABLE`.

### Phase 5: DBMS Studio Live SQL Execution (1.5 Minutes)
1. Click **DBMS Studio** in the sidebar.
2. Select **Multi-Table 4-Way Join**:
   - Shows ANSI `INNER JOIN` across Bookings, Rooms, Buildings, and Users with `FETCH FIRST 10 ROWS ONLY`.
   - Highlight latency: `LATENCY: ~1.2 ms`.
3. Select **Building Room Capacity & Active Tickets Summary**:
   - **Crucial DBMS Defense**: Explain why pre-aggregated subqueries (`r_agg` and `t_agg`) are used instead of naive joins — preventing Cartesian row multiplication!
4. Select **Subquery with NOT EXISTS (Room Availability)**:
   - Explain correlated semi-join short-circuit evaluation.

### Phase 6: Automated Test Suite Proof (30 Seconds)
1. Open PowerShell and run:
   ```powershell
   backend\venv\Scripts\python.exe -m pytest -v
   ```
2. Point out: **45 passed, 0 failed in ~5.7s**.
3. Highlight `test_concurrent_booking_conflict` and `test_oracle_direct_sql_two_simultaneous_overlapping_inserts`.
