# Expected Outputs Reference Guide

This document catalogs the exact expected terminal outputs, HTTP responses, and database outputs for every demonstration step.

---

## 1. Schema Integrity Verification (`verify_db.py`)
```
======================================================================
 CampusPulse — Oracle Database Schema & Integrity Verification 
======================================================================
Target Database: oracle+oracledb://campuspulse:***@localhost:1521/?service_name=XEPDB1
Dialect Detected: Oracle Database (oracledb)

[Check 1/9] Verifying Database Connectivity...
  -> PASS: Database ping responded successfully.

[Check 2/9] Checking Required Relational Tables...
  -> PASS: Table 'USERS' exists.
  -> PASS: Table 'BUILDINGS' exists.
  -> PASS: Table 'ROOMS' exists.
  -> PASS: Table 'BOOKINGS' exists.
  -> PASS: Table 'MAINTENANCE_TICKETS' exists.
  -> PASS: Table 'EVENTS' exists.

[Check 3/9] Checking Dashboard and Analytics Views...
  -> PASS: View 'V_DASHBOARD_SUMMARY' exists and is VALID.
  -> PASS: View 'V_ROOM_LIVE_STATUS' exists and is VALID.

[Check 4/9] Checking Conflict-Prevention Triggers...
  -> PASS: Trigger 'TRG_NO_OVERLAPPING_BOOKINGS' is ENABLED and VALID.

[Check 5/9] Verifying Table Constraints & Integrity Rules...
  -> Constraints found: 6 Primary Keys, 5 Foreign Keys, 10 Check Constraints, 3 Unique Constraints.
  -> PASS: Key integrity constraints are active and enforced.

[Check 6/9] Verifying Performance Indexes...
  -> PASS: Index 'IDX_ROOMS_BLD_STATUS' verified.
  -> PASS: Index 'IDX_BK_ROOM_TIME' verified.
  -> PASS: Index 'IDX_MT_STATUS_PRI' verified.

[Check 7/9] Verifying Seed Data Record Quantities...
  -> Buildings: 5 (Minimum required: 4)
  -> Rooms    : 25 (Minimum required: 20)
  -> Users    : 8 (Minimum required: 8)
  -> Bookings : 16 (Minimum required: 10)
  -> Tickets  : 6 (Minimum required: 5)
  -> Events   : 6 (Minimum required: 5)
  -> PASS: Seed data record counts satisfy all evaluation criteria.

[Check 8/9] Verifying Referential Integrity...
  -> PASS: Zero orphaned foreign keys detected across all relations.

[Check 9/9] Querying v_dashboard_summary...
  -> PASS: v_dashboard_summary returned 5 building summary rows.

======================================================================
 VERIFICATION RESULT: ALL CHECKS PASSED (EXIT CODE 0) 
======================================================================
```

---

## 2. API Responses for Concurrency & Conflict Rejection

### Successful Booking Response (HTTP 201 Created)
```json
{
  "id": 17,
  "room_id": 1,
  "room_number": "101",
  "building_name": "Engineering & Robotics Complex",
  "building_code": "ENG",
  "user_id": 1,
  "user_name": "Dr. Evelyn Reed",
  "user_email": "evelyn.reed@univ.edu",
  "title": "DBMS Professor Evaluation Session",
  "start_time": "2026-11-24T10:00:00Z",
  "end_time": "2026-11-24T12:00:00Z",
  "status": "CONFIRMED",
  "created_at": "2026-11-23T20:30:00Z"
}
```

### Overlapping Booking Response (HTTP 409 Conflict)
```json
{
  "detail": {
    "message": "Booking conflict: Room 101 is already booked for 'DBMS Professor Evaluation Session' by Dr. Evelyn Reed from 2026-11-24 10:00 to 12:00.",
    "conflicting_booking": {
      "id": 17,
      "title": "DBMS Professor Evaluation Session",
      "user_name": "Dr. Evelyn Reed",
      "start_time": "2026-11-24T10:00:00Z",
      "end_time": "2026-11-24T12:00:00Z"
    }
  }
}
```

---

## 3. SQL\*Plus Direct Trigger Conflict Output
```
SQL> DECLARE ... END;
/
Caught by Trigger: ORA-20001: OracleSQL Conflict Error: Room 1 has an overlapping booking during the requested time window.
ORA-06512: at "CAMPUSPULSE.TRG_NO_OVERLAPPING_BOOKINGS", line 63
```

---

## 4. Pytest Test Suite Run Output
```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.7.0
rootdir: C:\Users\ramsa\Desktop\CampusPulse
configfile: pytest.ini
collected 45 items

backend/tests/test_api.py ................                               [ 35%]
backend/tests/test_concurrency.py ....                                   [ 44%]
backend/tests/test_database_integrity.py ............                    [ 71%]
backend/tests/test_oracle_integration.py .........                       [ 91%]
backend/tests/test_sql_demonstrations.py ....                            [100%]

======================== 45 passed, 1 warning in 5.71s ========================
```
