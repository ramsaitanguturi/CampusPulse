# Project Defense: Advanced Cross-Examination & Exposed Weaknesses (Questions 91–105)

---

## Part 1: High-Difficulty Defense Questions (Questions 91–98)

### Q91: "Can a deadlock occur in your booking system under peak load?"
- **Direct Answer**: *"No. In our system, transactions lock only a single room record at a time. Deadlocks require a cyclic wait-for dependency between two or more transactions ($T_1$ holds Resource A waiting for Resource B; $T_2$ holds Resource B waiting for Resource A). Because our transactions acquire an exclusive lock on only one parent room row and commit immediately, cyclic wait-for graphs cannot form. In addition, our PL/SQL compound trigger sorts room IDs in ascending order, mathematically eliminating deadlocks for multi-row updates."*

---

### Q92: "If two users book different rooms at the exact same millisecond, do they block each other?"
- **Direct Answer**: *"No. The row lock is acquired specifically on `rooms.id = :target_room_id`. Users booking Room 101 lock row `id=1`; users booking Room 205 lock row `id=2`. Oracle places separate row locks on distinct physical data blocks. Both transactions proceed in parallel without blocking."*

---

### Q93: "What happens if a user submits a booking for 23:30 to 01:30 spanning past midnight?"
- **Direct Answer**: *"Because all temporal comparisons use absolute timestamps (`TIMESTAMP WITH TIME ZONE`) rather than time-of-day strings, intervals across midnight are handled identically to any other interval. The start timestamp is `2026-11-24 23:30` and the end timestamp is `2026-11-25 01:30`. The check `end_time > start_time` evaluates to TRUE, and conflict detection functions accurately."*

---

### Q94: "Why didn't you use PostgreSQL Exclusion Constraints (`gist`) instead of Oracle Triggers?"
- **Direct Answer**: *"While PostgreSQL supports native btree_gist exclusion constraints for range types (`tsrange`), our university DBMS syllabus centers on **Oracle Database 21c** as the authoritative industrial platform. Oracle does not have a native temporal range exclusion constraint; therefore, implementing pessimistic row-level locking paired with a PL/SQL Compound Trigger demonstrates a much higher level of enterprise database engineering mastery."*

---

### Q95: "How does the system ensure ACID atomicity if the server crashes mid-booking?"
- **Direct Answer**: *"Before `db.commit()` is called, changes reside in uncommitted database transaction undo segments. If the server loses power, Oracle's Process Monitor (PMON) or crash recovery routine automatically rolls back the uncommitted transaction upon restart. Zero partial tuples are written."*

---

### Q96: "What is the difference between a Statement-Level Trigger and a Row-Level Trigger?"
- **Direct Answer**:
  - *Row-Level (`FOR EACH ROW`)*: Fires once for every individual row modified by the SQL statement. Has access to `:OLD` and `:NEW` values, but causes mutating-table errors if it queries the same table.
  - *Statement-Level*: Fires once for the entire SQL statement regardless of how many rows are affected. Does not have access to individual row `:NEW` values, but can query the table safely.
  - *Compound Trigger*: Combines both, allowing row-level buffering into memory and statement-level table validation.

---

### Q97: "How does your pre-ping connection pool protect against stale sockets?"
- **Direct Answer**: *"When a database connection sits idle in the pool, firewalls or the Oracle listener may drop the TCP connection. When a worker thread requests a connection, `pool_pre_ping = True` issues `SELECT 1 FROM dual`. If the ping fails, SQLAlchemy silently discards the dead socket and creates a fresh connection, preventing runtime 500 errors."*

---

### Q98: "What is the time complexity of room conflict detection in Oracle?"
- **Direct Answer**: *"With composite index `idx_bk_room_time(room_id, start_time, end_time)`, the time complexity is $O(\log N + K)$, where $N$ is the total number of bookings in the table and $K$ is the number of bookings for that specific room. Without the index, it would be an unacceptable $O(N)$ full table scan."*

---

## Part 2: "QUESTIONS THAT CAN EXPOSE WEAKNESSES IN OUR PROJECT" (Questions 99–105)

Examiners often ask probing questions to test whether you understand the limitations of your own architecture. **Never hide these weaknesses; defend them with engineering trade-offs.**

---

### Q99: "Weakness 1: Your row lock locks the ENTIRE room row, not just the requested time slot. Doesn't this hurt throughput?"
- **The Critique**: If User A is booking Room 101 for Monday morning and User B is booking Room 101 for Friday afternoon, User B is blocked waiting for User A's transaction to commit, even though their slots do not overlap!
- **How to Defend**:
  > *"Professor, you are completely correct. Locking the parent Room row serializes all booking attempts on that specific room regardless of time slot. We chose this deliberately because:
  > 1. In standard relational databases under `READ COMMITTED` isolation, you cannot lock a time slot before the booking row exists (phantom insert problem).
  > 2. The critical section between acquiring the room lock, running the overlap query, and inserting the booking takes less than 3 milliseconds.
  > 3. Serializing requests on that room for 3 milliseconds provides absolute mathematical safety against race conditions with zero deadlock risk, which is a worthwhile trade-off for campus scheduling."*

---

### Q100: "Weakness 2: Where is User Authentication? Anyone can select Dr. Evelyn Reed and book a room as her!"
- **The Critique**: There are no passwords, OAuth2 tokens, or JWT authorization checks.
- **How to Defend**:
  > *"Professor, CampusPulse is strictly evaluated as a **Database Management Systems semester project**. Our primary academic objectives were BCNF normalization, ACID transaction management, PL/SQL compound triggers, and complex SQL joins. Implementing a full authentication layer with JWT hashing, password resets, and session cookies would have added boilerplate web development code without demonstrating additional database concepts. For laboratory evaluation, selecting registered stakeholders from our normalized `USERS` table allows us to demonstrate foreign key relationships directly."*

---

### Q101: "Weakness 3: You used `ON DELETE CASCADE` for rooms and buildings. If a building is deleted, decades of historical booking data are permanently wiped out!"
- **The Critique**: Hard cascading deletes destroy institutional audit trails.
- **How to Defend**:
  > *"You are entirely right. In our academic schema, `ON DELETE CASCADE` demonstrates referential integrity constraints. In a production enterprise system, we would implement **Soft Deletes** by adding an `is_deleted` boolean flag or transitioning status to `DECOMMISSIONED` / `ARCHIVED`. This would hide old buildings from active booking while preserving historical booking and maintenance analytics forever."*

---

### Q102: "Weakness 4: What happens if an admin bulk-inserts 10,000 bookings using direct SQL? Will your compound trigger crash or run out of memory?"
- **The Critique**: Your compound trigger buffers every inserted row in a PL/SQL collection (`g_bookings`) in PGA memory.
- **How to Defend**:
  > *"That is an acute observation. For a bulk insert of 10,000 bookings, the associative array buffers all rows in session PGA memory, and the statement-level nested loop would cause execution latency. For large batch migrations, best practice is to temporarily disable `TRG_NO_OVERLAPPING_BOOKINGS`, execute the bulk load, and run a set-based SQL audit query to catch any conflicting rows before re-enabling the trigger."*

---

### Q103: "Weakness 5: How do you handle recurring bookings (e.g. every Tuesday for 15 weeks)?"
- **The Critique**: The UI only supports creating single temporal slots $[start, end)$.
- **How to Defend**:
  > *"Currently, each recurring session must be submitted as an individual reservation tuple. In our future scope, we plan to implement a recurring series expansion module that generates a batch of $N$ bookings wrapped in a single database transaction, rolling back the entire batch if even a single weekly slot collides."*

---

### Q104: "Weakness 6: How does the system know when a room is physically occupied? You rely on manual status updates!"
- **The Critique**: A room might be booked on the calendar, but the professor never showed up (empty room).
- **How to Defend**:
  > *"CampusPulse currently synchronizes status based on scheduled reservations and filed maintenance tickets. In Phase 2 of our architectural roadmap, we envision integrating IoT PIR motion sensors and smart door locks via webhooks to verify real-time physical presence and automatically release unused rooms after a 15-minute grace period."*

---

### Q105: "Weakness 7: Why are SVG map coordinates stored as arbitrary floats (0-1000) instead of standard GIS latitude and longitude?"
- **The Critique**: Real digital twins use geospatial coordinates (WGS 84).
- **How to Defend**:
  > *"For our web interface, canvas coordinates allow high-speed, lightweight vector SVG rendering without requiring heavy map tile servers like Leaflet or Mapbox. Moving forward, the schema can easily adopt Oracle Spatial & Graph (`SDO_GEOMETRY`) to store true geospatial polygons and perform spatial queries like `SDO_CONTAINS`."*
