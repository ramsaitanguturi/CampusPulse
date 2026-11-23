# Oracle Viva: Concurrency, PL/SQL & Compound Triggers (Questions 41–60)

---

### Q41: What is Pessimistic Concurrency Control versus Optimistic Concurrency Control?
- **Direct Answer**:
  - **Pessimistic Concurrency Control**: Locks resources upon reading/accessing them, assuming conflicts will occur. Other transactions must wait.
  - **Optimistic Concurrency Control**: Allows concurrent reading and modification without locks, validating version numbers (`version_id`) at commit time. If modified, the transaction is aborted.
- **CampusPulse Decision**: We use **Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`)** because room booking involves high contention during burst windows where optimistic retries would waste server cycles and frustrate users.

---

### Q42: What does `SELECT ... FOR UPDATE` do in Oracle?
- **Direct Answer**: Acquires an exclusive row-level lock on all rows returned by the query. Concurrent transactions attempting to modify or lock those same rows are blocked until the locking transaction issues a `COMMIT` or `ROLLBACK`.
- **CampusPulse Example**:
  ```python
  db.query(Room).filter(Room.id == data.room_id).with_for_update().one_or_none()
  ```
- **Follow-up Question**: *What is the difference between `FOR UPDATE` and `FOR UPDATE NOWAIT`?* (Answer: `FOR UPDATE` blocks until the lock is released; `FOR UPDATE NOWAIT` immediately raises `ORA-00054: resource busy` if the row is already locked).

---

### Q43: How does your test suite prove that `SELECT FOR UPDATE` actually locks rows in Oracle?
- **Direct Answer**: In `test_oracle_row_locking_select_for_update_blocks_concurrent_session`, Session 1 locks Room 1 via `SELECT FOR UPDATE`. Parallel Session 2 attempts `SELECT id FROM rooms WHERE id = 1 FOR UPDATE NOWAIT`. Session 2 is immediately rejected with `ORA-00054`, proving authentic database row-locking.

---

### Q44: What is an ORA-04091 mutating-table error?
- **Direct Answer**: An Oracle runtime error that occurs when a row-level trigger (`FOR EACH ROW`) attempts to query or modify the table on which the trigger is defined, while that table is in the middle of being modified by the triggering SQL statement.
- **Why It Happens**: The table is in an inconsistent, mutating state. Oracle prevents row-level triggers from reading mutating tables to protect read consistency.

---

### Q45: How does an Oracle Compound Trigger solve the mutating-table problem?
- **Direct Answer**: A Compound Trigger combines four timing points into a single trigger body:
  1. `BEFORE STATEMENT`
  2. `BEFORE EACH ROW`
  3. `AFTER EACH ROW`
  4. `AFTER STATEMENT`
  It allows sharing in-memory package variables across timing points. In `AFTER EACH ROW`, we collect newly inserted rows into a PL/SQL collection without querying the table. Then, in `AFTER STATEMENT`, when the SQL statement has concluded and the table is **no longer mutating**, we query the table safely without `ORA-04091`.

---

### Q46: Walk through the exact phases of your compound trigger `TRG_NO_OVERLAPPING_BOOKINGS`.
- **Direct Answer**:
  1. **`BEFORE STATEMENT`**: Clears the in-memory collections `g_bookings.DELETE` and `g_room_ids.DELETE`.
  2. **`AFTER EACH ROW`**: If `:NEW.status = 'CONFIRMED'`, appends the booking record (`id`, `room_id`, `start_time`, `end_time`) to collection `g_bookings`, and marks `g_room_ids(:NEW.room_id) := TRUE`.
  3. **`AFTER STATEMENT`**:
     - *Step A*: Iterates through `g_room_ids` in ascending sorted order and executes `SELECT id FROM rooms WHERE id = v_curr_room_id FOR UPDATE` to serialize concurrent raw SQL transactions.
     - *Step B*: Executes the overlap query against `bookings`. If any overlapping confirmed booking is found, calls `RAISE_APPLICATION_ERROR(-20001, 'OracleSQL Conflict Error...')`.

---

### Q47: Why does the trigger lock room IDs in ascending sorted order?
- **Direct Answer**: To **prevent deadlocks**. If Transaction 1 inserts bookings for Room 5 and Room 10, and Transaction 2 simultaneously inserts bookings for Room 10 and Room 5:
  - Without sorting: Tx 1 locks Room 5, Tx 2 locks Room 10 $\to$ Cyclic Wait-for Graph $\to$ **Deadlock (`ORA-00060`)**.
  - With sorting: Both transactions lock Room 5 first, then Room 10 $\to$ One transaction waits cleanly; deadlocks are mathematically impossible.

---

### Q48: What is `RAISE_APPLICATION_ERROR` in Oracle PL/SQL?
- **Direct Answer**: A built-in procedure that allows developers to raise user-defined exception codes between `-20000` and `-20999` with custom error text, rolling back the current statement or transaction.
- **CampusPulse Example**: `RAISE_APPLICATION_ERROR(-20001, 'OracleSQL Conflict Error: Room ... has an overlapping booking.')`.

---

### Q49: What is the difference between Oracle Pluggable Database (PDB) and Container Database (CDB)?
- **Direct Answer**: In Oracle Multitenant architecture:
  - **CDB (Root / `CDB$ROOT`)**: The parent container holding system metadata, background processes, and shared memory.
  - **PDB (e.g. `XEPDB1`)**: A self-contained, portable database containing user schemas, tablespaces, and applications. CampusPulse resides exclusively inside pluggable database `XEPDB1`.

---

### Q50: How do you verify active triggers in the Oracle Data Dictionary?
- **Direct Answer**:
  ```sql
  SELECT trigger_name, status FROM user_triggers WHERE trigger_name = 'TRG_NO_OVERLAPPING_BOOKINGS';
  ```
  Status must return `ENABLED`. In `USER_OBJECTS`, the compilation status must return `VALID`.

---

### Q51: What is the transaction isolation level in Oracle by default?
- **Direct Answer**: **`READ COMMITTED`**.
- **Detailed Explanation**: Under `READ COMMITTED`, a query sees only data committed before the query began. If another transaction commits changes during your transaction, a subsequent query will see those committed changes (non-repeatable reads possible without row locks).
- **CampusPulse Consequence**: Because standard `READ COMMITTED` does not prevent another transaction from inserting a new row while you are querying, we acquire a pessimistic row lock (`SELECT FOR UPDATE`) on the parent `ROOMS` row to serialize child inserts.

---

### Q52: What is a Lost Update anomaly and how does CampusPulse prevent it?
- **Direct Answer**: Occurs when Transaction 1 and Transaction 2 read the same row, calculate new values based on that read, and overwrite each other's changes.
- **CampusPulse Prevention**: Serialized room locks ensure only one transaction can evaluate and commit a reservation at a time.

---

### Q53: What is a Phantom Read?
- **Direct Answer**: Occurs when Transaction 1 queries a range of rows (e.g., existing bookings for 10:00–12:00), and Transaction 2 inserts a *new* row satisfying that range and commits. When Transaction 1 queries again, a new "phantom" row appears.
- **CampusPulse Prevention**: By locking the existing parent `ROOMS` row, Transaction 2 cannot begin inserting until Transaction 1 has committed.

---

### Q54: Explain the mathematical proof of non-overlap for intervals $[s, e)$.
- **Direct Answer**:
  Two intervals $B_1 = [s_1, e_1)$ and $B_2 = [s_2, e_2)$ do **NOT** overlap if:
  $$(e_1 \le s_2) \lor (s_1 \ge e_2)$$
  Negating this expression via De Morgan's laws:
  $$\neg((e_1 \le s_2) \lor (s_1 \ge e_2)) \iff (e_1 > s_2) \land (s_1 < e_2)$$
  This exact condition is implemented in our SQL queries and trigger.

---

### Q55: Why are adjacent bookings valid under $[s, e)$?
- **Direct Answer**: For Booking 1 (10:00–11:00) and Booking 2 (11:00–12:00), $e_1 = 11:00$ and $s_2 = 11:00$. Evaluating $(11:00 \le 11:00)$ yields **TRUE** (non-overlap condition satisfied). Therefore, no conflict exists.

---

### Q56: What happens when a booking is cancelled?
- **Direct Answer**: `CampusService.cancel_booking` atomically updates `status = 'CANCELLED'`. Because all conflict queries filter for `status = 'CONFIRMED'`, cancelled bookings are excluded from interval checks, immediately restoring the room slot for new bookings.

---

### Q57: What is Oracle Redo Log and how does it guarantee Durability?
- **Direct Answer**: A circular set of log files that record all changes made to database blocks. When a transaction issues `COMMIT`, Oracle writes redo records to disk synchronously before acknowledging success. If power is lost, Oracle uses the redo log during crash recovery to roll forward committed changes.

---

### Q58: What is connection pooling in `python-oracledb` and why is it important?
- **Direct Answer**: Maintaining a pool of pre-established database connections that worker threads reuse, eliminating the significant latency (~100–300 ms) of establishing a new TCP handshake and Oracle session for every incoming HTTP request.

---

### Q59: What does `pool_pre_ping = True` do in SQLAlchemy?
- **Direct Answer**: Issues a lightweight test query (`SELECT 1 FROM dual`) before giving a connection to an application thread. If the connection has died (e.g. firewall timeout or server restart), the pool transparently discards it and creates a fresh connection.

---

### Q60: Can a SQL injection attack penetrate your application?
- **Direct Answer**: No. All database interactions in CampusPulse use **parameterized queries** via SQLAlchemy ORM or bound parameters (`db.execute(text(...), {"param": value})`). User inputs are treated strictly as data literals, never concatenated into executable SQL strings.
