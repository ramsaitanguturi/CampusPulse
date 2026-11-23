# Claims Verification Audit

This document audits all major claims made in project documentation, ensuring complete academic accuracy and distinguishing code-verified facts from unsupported assumptions.

---

## 1. Verified Core Claims (Backed by Code & Passing Tests)

### Claim 1: "The database satisfies 3NF and BCNF across all relations."
- **Status**: **VERIFIED**
- **Evidence**: In [DATABASE_DESIGN.md](file:///c:/Users/ramsa/Desktop/CampusPulse/DATABASE_DESIGN.md) and [03_DATABASE_DESIGN.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/03_DATABASE_DESIGN.md), all functional dependencies are determined strictly by candidate keys (`{id}`, `{email}`, `{code}`, `{building_id, room_number}`). Since every determinant is a superkey, BCNF is mathematically proven.

### Claim 2: "Concurrent booking requests targeting the same room are serialized via row-level locking."
- **Status**: **VERIFIED**
- **Evidence**: `CampusService.create_booking` executes `db.query(Room).filter(...).with_for_update()`. Passing test `test_concurrent_booking_conflict` simulates 4 parallel threads targeting the same slot: exactly 1 succeeds (HTTP 201), 3 are rejected (HTTP 409), and 0 duplicate rows are created.

### Claim 3: "Direct SQL inserts are protected from double bookings by an Oracle compound trigger without mutating-table errors."
- **Status**: **VERIFIED**
- **Evidence**: `TRG_NO_OVERLAPPING_BOOKINGS` in `backend/scripts/oracle_schema.sql` collects rows in `AFTER EACH ROW` and validates in `AFTER STATEMENT`. Passing test `test_oracle_direct_sql_two_simultaneous_overlapping_inserts` executes raw concurrent SQL statements in independent sessions, confirming that the conflicting insert is aborted with `ORA-20001`.

### Claim 4: "Back-to-back bookings are permitted without false-positive collision."
- **Status**: **VERIFIED**
- **Evidence**: Passing tests `test_back_to_back_bookings_accepted` and `test_oracle_direct_sql_adjacent_back_to_back_bookings` verify that bookings ending at 11:00 and starting at 11:00 are accepted concurrently.

### Claim 5: "Offline SQLite fallback mode enables complete functional verification without Oracle."
- **Status**: **VERIFIED**
- **Evidence**: When `DATABASE_URL` is set to an SQLite file, `init_db.py` creates SQLite-compatible views and seeds data. Passing pytest in offline mode runs 27 tests successfully (skipping 18 Oracle-specific tests).

---

## 2. Refined & Clarified Claims (Preventing Examiner Traps)

### Clarification 1: Concurrency Scope
- **Caution**: Do not claim that "all room booking is non-blocking".
- **Exact Fact**: Bookings for **different rooms** execute concurrently with zero waiting. Bookings for the **same physical room** are serialized one after another by design, guaranteeing zero race conditions.

### Clarification 2: Deadlock Scope
- **Caution**: Do not claim that "deadlocks are impossible in every conceivable database operation".
- **Exact Fact**: Single-room booking transactions cannot deadlock because they lock only one resource. The compound trigger eliminates deadlocks for multi-room statements by sorting room IDs in ascending order. If an administrator manually issues un-ordered multi-table cross-locks outside the application, standard Oracle deadlock detection would apply.

### Clarification 3: Authentication Scope
- **Caution**: Do not claim that "CampusPulse has enterprise role-based authorization".
- **Exact Fact**: The project models stakeholder roles (`STUDENT`, `FACULTY`, `ADMIN`, `STAFF`) via database `CHECK` constraints, but relies on selection from registered users rather than JWT password authentication, maintaining focus on DBMS relational modeling.
