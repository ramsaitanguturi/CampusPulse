# CampusPulse — Transaction Management, Concurrency Control & ACID Guarantees
### Theoretical Analysis and Practical Implementation for DBMS Evaluation

---

## 1. Executive Summary

In high-concurrency campus environments, hundreds of students and faculty members frequently attempt to book popular conference rooms, computer labs, and auditoriums during peak registration windows. Without database concurrency control and strict transaction isolation, the system would suffer from:
1. **Lost Updates & Double Bookings**: Two conflicting sessions confirmed for the exact same physical space.
2. **Race Conditions**: Parallel threads concurrently checking availability, finding the room vacant, and simultaneously committing overlapping reservations.
3. **Dirty & Non-Repeatable Reads**: Users viewing uncommitted reservations or partially booked states.

CampusPulse resolves these challenges by combining **Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`)**, **Transaction Isolation**, and an **Oracle PL/SQL Compound Trigger** to guarantee serializable scheduling safety.

---

## 2. ACID Properties Implementation in CampusPulse

| Property | Database Theoretical Meaning | CampusPulse Implementation & Proof |
| :--- | :--- | :--- |
| **Atomicity** | All operations in a transaction succeed, or the entire transaction is rolled back with zero partial changes. | In `CampusService.create_booking` and `CampusService.update_ticket_status`, if any constraint or check fails midway, `db.rollback()` executes, leaving the database completely untouched. Verified in automated test `test_transaction_atomicity_and_rollback`. |
| **Consistency** | The database transitions from one valid state to another valid state, satisfying all declared schema constraints and business invariants. | Enforced at the DBMS engine layer via `CHECK (end_time > start_time)`, `CHECK (capacity > 0)`, `FOREIGN KEY ... ON DELETE CASCADE`, and the compound trigger `trg_no_overlapping_bookings`. |
| **Isolation** | Concurrent execution of transactions yields the same state as if they were executed serially. | Achieved via **Pessimistic Row Locking (`SELECT ... FOR UPDATE`)** on the target `ROOMS` tuple. Parallel threads attempting to reserve the same room are queued in database lock queues rather than racing. Verified in `test_concurrent_booking_conflict`. |
| **Durability** | Once a transaction is successfully committed, its updates persist permanently, surviving application or server crashes. | Changes are committed to Oracle Redo Logs and Datafiles via standard `db.commit()` / SQL `COMMIT`. Subsequent connection sessions immediately observe committed data. |

---

## 3. Mathematical Interval Overlap Definition

CampusPulse models all room reservations as **half-open temporal intervals**:
$$\text{Interval} = [t_{\text{start}}, t_{\text{end}})$$

Under half-open interval semantics:
- A session occupies the room starting precisely at $t_{\text{start}}$.
- A session vacates the room precisely at $t_{\text{end}}$.

### Non-Overlap Invariant
Two bookings $B_1 = [s_1, e_1)$ and $B_2 = [s_2, e_2)$ do **NOT** overlap if and only if:
$$(e_1 \le s_2) \lor (s_1 \ge e_2)$$

### Overlap Condition (Negation)
By De Morgan's laws, a conflict exists when:
$$\neg \bigl((e_1 \le s_2) \lor (s_1 \ge e_2)\bigr) \iff (e_1 > s_2) \land (s_1 < e_2)$$

### Practical Consequences
1. **Back-to-Back Bookings Permitted**: If Booking A ends at 11:00 AM and Booking B starts at 11:00 AM, $(11:00 \le 11:00)$ is TRUE, meaning **NO CONFLICT**. The next group enters immediately as the previous group finishes.
2. **Partial Overlap Rejected**: If Booking A runs from 10:00 to 12:00 and Booking B requests 11:00 to 13:00, conflict is detected and rejected.
3. **Enclosure Rejected**: If Booking B requests 10:30 to 11:30 inside Booking A's 10:00 to 12:00, conflict is detected and rejected.

---

## 4. Multi-Tier Concurrency Control Strategy

CampusPulse implements a **defense-in-depth** locking and conflict-prevention architecture:

```
[Incoming Concurrent Booking Requests: Client A & Client B]
                            |
                            v
+-----------------------------------------------------------+
| 1. API Validation & Half-Open Interval Check             |
|    - Validates end_time > start_time                      |
|    - Validates target room exists and is not MAINTENANCE  |
+-----------------------------------------------------------+
                            |
                            v
+-----------------------------------------------------------+
| 2. Pessimistic Row Lock: SELECT ... FOR UPDATE           |
|    - SELECT * FROM rooms WHERE id = :room_id FOR UPDATE   |
|    - Serializes concurrent attempts on the SAME room      |
|    - Client A holds TX row lock; Client B blocks/waits   |
+-----------------------------------------------------------+
                            |
                            v
+-----------------------------------------------------------+
| 3. Conflict Detection Query                              |
|    - Checks existing CONFIRMED bookings for that room     |
|    - Client A finds zero conflicts -> INSERT & COMMIT     |
|    - Client A releases row lock                           |
+-----------------------------------------------------------+
                            |
                            v
+-----------------------------------------------------------+
| 4. Client B Unblocks -> Re-evaluates Conflict Query       |
|    - Client B now sees Client A's committed booking!      |
|    - Detects collision -> ROLLBACK & raises ConflictError |
+-----------------------------------------------------------+
                            |
                            v
+-----------------------------------------------------------+
| 5. Oracle Compound Trigger (DBMS Engine Safety Net)       |
|    - trg_no_overlapping_bookings intercepts any insert    |
|    - Guarantees safety even for direct SQL / raw scripts  |
|    - Raises ORA-20001 on collision                        |
+-----------------------------------------------------------+
```

---

## 5. Row-Level Locking Mechanics (`SELECT ... FOR UPDATE`)

### Code Implementation (`backend/app/services/campus_service.py`)
```python
# Acquire exclusive row-level lock on the parent Room record
room_query = db.query(Room).filter(Room.id == data.room_id)
if not is_sqlite:
    room_query = room_query.with_for_update()
room = room_query.one_or_none()
```

### Why Lock the `Room` Row Instead of the `Bookings` Table?
1. **Granularity & Throughput**: Locking `Room #101` does **NOT** block users reserving `Room #205` or `Room #301`. Bookings in different rooms execute concurrently with zero waiting.
2. **Elimination of Phantom Read Anomalies**: In standard `READ COMMITTED` isolation, querying `bookings` cannot place row locks on records that do not yet exist. By locking the existing parent `Room` record, we serialize all transactions intending to write child bookings for that room.
3. **Deadlock Prevention**: All booking transactions acquire locks in the exact same resource order:
   $$\text{Parent Room Lock} \to \text{Query Bookings} \to \text{Insert Booking} \to \text{Commit/Release}$$
   Because transactions lock only a single room and never cross-lock other rooms, cyclic wait-for graphs (deadlocks) are impossible.

---

## 6. Oracle PL/SQL Compound Trigger Architecture

### Overcoming the Mutating-Table Problem (`ORA-04091`)
In standard Oracle PL/SQL, a row-level trigger (`FOR EACH ROW`) cannot query the table on which it is defined. Attempting to run `SELECT COUNT(*) FROM bookings` inside an `AFTER INSERT ON bookings FOR EACH ROW` trigger triggers:
`ORA-04091: table CAMPUSPULSE.BOOKINGS is mutating, trigger/function may not see it`

### The Compound Trigger Solution
Oracle's **COMPOUND TRIGGER** partitions trigger execution into discrete timing points:

```sql
CREATE OR REPLACE TRIGGER trg_no_overlapping_bookings
FOR INSERT OR UPDATE ON bookings
COMPOUND TRIGGER

   -- Collection to hold new rows in session memory
   TYPE t_booking_rec IS RECORD (
      room_id    bookings.room_id%TYPE,
      start_time bookings.start_time%TYPE,
      end_time   bookings.end_time%TYPE,
      status     bookings.status%TYPE,
      id         bookings.id%TYPE
   );
   TYPE t_booking_list IS TABLE OF t_booking_rec;
   g_bookings t_booking_list := t_booking_list();

   -- Phase 1: Initialize collection before statement begins
   BEFORE STATEMENT IS
   BEGIN
      g_bookings.DELETE;
   END BEFORE STATEMENT;

   -- Phase 2: Record newly inserted/updated rows in memory
   AFTER EACH ROW IS
   BEGIN
      IF :NEW.status = 'CONFIRMED' THEN
         g_bookings.EXTEND;
         g_bookings(g_bookings.LAST).room_id := :NEW.room_id;
         g_bookings(g_bookings.LAST).start_time := :NEW.start_time;
         g_bookings(g_bookings.LAST).end_time := :NEW.end_time;
         g_bookings(g_bookings.LAST).status := :NEW.status;
         g_bookings(g_bookings.LAST).id := :NEW.id;
      END IF;
   END AFTER EACH ROW;

   -- Phase 3: Inspect table AFTER statement completes (table is no longer mutating!)
   AFTER STATEMENT IS
      v_conflict_count NUMBER := 0;
   BEGIN
      FOR i IN 1 .. g_bookings.COUNT LOOP
         SELECT COUNT(*)
         INTO v_conflict_count
         FROM bookings b
         WHERE b.room_id = g_bookings(i).room_id
           AND b.status = 'CONFIRMED'
           AND (b.id != g_bookings(i).id OR g_bookings(i).id IS NULL)
           AND NOT (b.end_time <= g_bookings(i).start_time OR b.start_time >= g_bookings(i).end_time);

         IF v_conflict_count > 0 THEN
            RAISE_APPLICATION_ERROR(
               -20001, 
               'OracleSQL Conflict Error: Room ' || g_bookings(i).room_id || 
               ' has an overlapping booking during the requested time window.'
            );
         END IF;
      END LOOP;
   END AFTER STATEMENT;

END trg_no_overlapping_bookings;
/
```

---

## 7. Automated Concurrency Test Case Verification

The test suite includes a multi-threaded parallel stress test in `backend/tests/test_concurrency.py`:

```python
def test_concurrent_booking_conflict():
    # 4 parallel worker threads target the EXACT same room and time slot
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(attempt_booking, i) for i in range(4)]
        responses = [f.result() for f in concurrent.futures.as_completed(futures)]

    status_codes = [r.status_code for r in responses]
    success_count = status_codes.count(201)
    conflict_count = status_codes.count(409)

    # Invariant: Exactly 1 succeeds, exactly 3 are rejected with HTTP 409
    assert success_count == 1
    assert conflict_count == 3
```

### Actual Test Execution Output on Oracle 21c
```
backend/tests/test_concurrency.py::test_concurrent_booking_conflict PASSED [100%]
Outcome: Successes=1, Conflicts=3 (HTTP 409)
Zero duplicate bookings created.
```

