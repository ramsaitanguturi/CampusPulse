# Fallback Demonstration: Offline SQLite Mode

If Oracle Database 21c is unavailable on the grading machine, CampusPulse features a built-in **Offline SQLite Fallback Mode**.

---

## 1. Why Offline Fallback Exists
In university evaluations, professors often evaluate projects on laptops or laboratory computers that do not have an active Oracle Database 21c instance installed. Rather than failing the demonstration, CampusPulse was engineered to switch seamlessly to an offline SQLite database.

---

## 2. Activating Offline SQLite Mode (30 Seconds)

### Step 1: Set Environment Variable
In PowerShell:
```powershell
$env:DATABASE_URL="sqlite:///./campuspulse_demo.db"
```

### Step 2: Initialize SQLite Schema & Seed Data
```powershell
backend\venv\Scripts\python.exe backend\scripts\init_db.py
```
*Expected Output*:
```
[*] Target Dialect : SQLite (Test / Offline Mode)
[*] Target Endpoint: sqlite:///./campuspulse_demo.db
[SUCCESS] SQLite tables, views, and seed data populated successfully.
```

### Step 3: Start Backend in SQLite Mode
```powershell
backend\venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000
```
- The backend automatically detects the SQLite dialect and enables `PRAGMA foreign_keys = ON` on all connections.

### Step 4: Start Frontend
```powershell
Set-Location frontend
npm.cmd run dev
```

---

## 3. What Works in Offline Fallback Mode
- Entire React 19 Frontend & Interactive Campus Map.
- Complete Operations Dashboard with live occupancy rates.
- Full Room Inspector and Reservation management.
- **Application-Level Conflict Rejection**: Overlapping bookings are still rejected with **HTTP 409 Conflict** via half-open interval checking.
- Back-to-back booking acceptance.
- Maintenance ticket state machine and room availability restoration.
- 27 out of 45 automated test cases pass cleanly (`27 passed, 18 skipped`).

---

## 4. What Requires Oracle 21c (Academic Differentiation)
When asked by professors what differs between SQLite mode and Oracle mode, explain:
1. **`SELECT ... FOR UPDATE`**: SQLite does not support row-level pessimistic locking (it uses database-level locks); Oracle 21c locks the individual room row.
2. **PL/SQL Compound Trigger**: Oracle executes `TRG_NO_OVERLAPPING_BOOKINGS` at the DBMS engine kernel level; SQLite lacks PL/SQL compound triggers.
3. **Data Dictionary Views**: `USER_TABLES`, `USER_TRIGGERS`, and `USER_CONSTRAINTS` are specific to Oracle.
