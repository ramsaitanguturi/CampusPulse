# 07 — Advanced Database Features: Concurrency & Triggers

## 1. Concurrency Control in CampusPulse

In a university environment, hundreds of students and faculty members frequently attempt to book popular rooms (e.g. Turing Auditorium) during the exact same minute. Without strict database concurrency control, the system would suffer from **lost updates, double bookings, and race conditions**.

CampusPulse deploys a **3-Tier Defense-in-Depth Concurrency Strategy**:

```
[Simultaneous User Requests: Client A & Client B]
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ Tier 1: Application-Level Mathematical Validation      │
│ - Validates end_time > start_time                      │
│ - Verifies room exists and is not under MAINTENANCE    │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ Tier 2: Pessimistic Row Lock (SELECT ... FOR UPDATE)   │
│ - SELECT * FROM rooms WHERE id = :room_id FOR UPDATE   │
│ - Client A acquires row lock on parent room record    │
│ - Client B BLOCKS in database queue waiting for lock   │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ Tier 3: Transaction Execution & Overlap Detection      │
│ - Client A queries confirmed bookings: No conflict     │
│ - Client A inserts booking and commits (releases lock) │
│ - Client B unblocks, re-evaluates query                │
│ - Client B now sees Client A's committed booking!      │
│ - Client B is rejected with HTTP 409 Conflict          │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ Safety Net: Oracle PL/SQL Compound Trigger             │
│ - Intercepts any direct SQL inserts bypassing API      │
│ - Acquires parent room lock in deterministic order     │
│ - Raises ORA-20001 on collision                        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`)

### Code Implementation (`backend/app/services/campus_service.py`):
```python
room_query = db.query(Room).filter(Room.id == data.room_id)
if not is_sqlite:
    room_query = room_query.with_for_update()
room = room_query.one_or_none()
```

### Why Lock the `ROOMS` Row Instead of the `BOOKINGS` Table?
1. **High Concurrency & Throughput**: Locking `Room #101` does **NOT** block users reserving `Room #205` or `Room #301`. Bookings in different rooms proceed concurrently with zero waiting.
2. **Preventing Phantom Reads**: In standard `READ COMMITTED` isolation, querying `bookings` cannot place locks on rows that have not yet been inserted. By locking the existing parent `Room` record, we serialize all concurrent transactions intending to create child bookings for that room.
3. **Deadlock Immunity**: Every transaction acquires locks in the exact same deterministic hierarchy:
   $$\text{Parent Room Lock} \to \text{Evaluate Bookings} \to \text{Insert Booking} \to \text{Commit}$$
   Because transactions lock only a single room at a time, cyclic wait-for conditions (deadlocks) cannot occur.

---

## 3. Half-Open Interval Semantics: $[start\_time, end\_time)$

CampusPulse models all reservations as half-open mathematical intervals $[s, e)$:
- A group occupies the room starting at $s$.
- A group vacates the room at $e$.

### Mathematical Non-Overlap Invariant:
Two bookings $B_1 = [s_1, e_1)$ and $B_2 = [s_2, e_2)$ do **NOT** overlap if:
$$(e_1 \le s_2) \lor (s_1 \ge e_2)$$

### Overlap Condition (Negation by De Morgan's Law):
$$\text{Overlap} \iff (e_1 > s_2) \land (s_1 < e_2)$$

### Key Advantage:
Back-to-back bookings (e.g. 10:00–11:00 and 11:00–12:00) are permitted without false-positive conflict rejections, maximizing room utilization.

---

## 4. Oracle PL/SQL Compound Trigger (`TRG_NO_OVERLAPPING_BOOKINGS`)

### Resolving the Mutating-Table Error (`ORA-04091`)
In standard Oracle PL/SQL, a row-level trigger (`FOR EACH ROW`) cannot query the table on which it is defined. Doing so immediately triggers `ORA-04091: table BOOKINGS is mutating`.

### The Compound Trigger Architecture:
An Oracle **COMPOUND TRIGGER** divides trigger execution into distinct phases:

1. **`BEFORE STATEMENT`**: Clears session collection variables (`g_bookings.DELETE`, `g_room_ids.DELETE`).
2. **`AFTER EACH ROW`**: Records `:NEW` booking attributes (`room_id`, `start_time`, `end_time`) and affected `room_id`s in memory **without querying the table**.
3. **`AFTER STATEMENT`**: 
   - **Step A (Deterministic Locking)**: Iterates through collected room IDs in ascending order via an associative array (`PLS_INTEGER`) and locks each room via `SELECT id FROM rooms WHERE id = v_curr_room_id FOR UPDATE`. This guarantees direct SQL serialization and prevents deadlocks.
   - **Step B (Overlap Validation)**: Queries `bookings` safely because statement execution is complete and the table is no longer mutating. If an overlap is detected, raises:
     ```sql
     RAISE_APPLICATION_ERROR(-20001, 'OracleSQL Conflict Error: Room ' || room_id || ' has an overlapping booking.');
     ```

---

## 5. Verified Concurrency Test Results

Automated multi-threaded and multi-session concurrency tests confirm these guarantees:

| Test Case | Scenario | Verification Result |
|---|---|---|
| `test_concurrent_booking_conflict` | 4 parallel threads targeting same room/slot | Exactly 1 success (201), 3 conflicts (409), 0 duplicate rows |
| `test_concurrent_two_simultaneous_api_requests_*` | 2 simultaneous API requests for same slot | Exactly 1 success (201), 1 conflict (409) |
| `test_concurrent_different_rooms_api_bookings` | 2 simultaneous requests for different rooms | Both succeed (201) with zero blocking |
| `test_concurrent_adjacent_back_to_back_api_bookings`| 2 adjacent intervals `[T1, T2)` and `[T2, T3)` | Both succeed (201) confirming half-open interval rule |
| `test_oracle_row_locking_select_for_update_blocks_*` | Multi-session row lock test with `NOWAIT` | Second session rejected with `ORA-00054` (resource busy) |
| `test_oracle_direct_sql_two_simultaneous_*` | Direct raw SQL concurrent inserts in Oracle | Exactly 1 commits; second raises `ORA-20001` via trigger |
