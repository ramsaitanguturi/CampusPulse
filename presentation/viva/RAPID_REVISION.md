# 10-Minute Rapid Revision Sheet (The "Cram Sheet")

Read this document 10 minutes before entering your presentation or viva evaluation!

---

## 1. Core Technical Identity
- **Authoritative Database**: Oracle Database 21c Express Edition (`XEPDB1`).
- **Driver**: `python-oracledb` 26.0+ in **Thin Mode** (pure Python, 0 C-client dependencies).
- **Stack**: FastAPI (Python 3.12) + SQLAlchemy 2.0 + React 19 + TypeScript + Vite.
- **Test Status**: **45 Passed / 0 Failed in 5.71s** on live Oracle 21c (27 passed in offline SQLite fallback).

---

## 2. The 6 Normalized Relations
1. `USERS`: `id` (PK), `name`, `email` (UK), `role` (CHECK), `department`.
2. `BUILDINGS`: `id` (PK), `code` (UK), `name`, `floors` (>0), `map_x`, `map_y`, `status` (CHECK).
3. `ROOMS`: `id` (PK), `building_id` (FK CASCADE), `room_number`, `capacity` (>0), `status`, `has_projector`, `has_ac`. Composite UK: `(building_id, room_number)`.
4. `BOOKINGS`: `id` (PK), `room_id` (FK CASCADE), `user_id` (FK CASCADE), `start_time`, `end_time` (CHECK `end > start`), `status`.
5. `MAINTENANCE_TICKETS`: `id` (PK), `room_id` (FK CASCADE), `user_id` (FK SET NULL), `priority` (CHECK), `status` (CHECK).
6. `EVENTS`: `id` (PK), `building_id` (FK CASCADE), `room_id` (FK SET NULL), `start_time`, `end_time` (CHECK `end > start`), `category`.

---

## 3. The Normalization Proof (1NF to BCNF in 30 Seconds)
- **1NF**: All attributes are scalar; equipment is boolean columns (`has_projector`, `has_ac`); bookings are separate tuples.
- **2NF**: Single-attribute surrogate keys (`id`) eliminate partial functional dependencies.
- **3NF**: Zero transitive dependencies between non-prime attributes.
- **BCNF**: Every determinant in all active functional dependencies ($\{id\}$, $\{email\}$, $\{code\}$, $\{building\_id, room\_number\}$) is a candidate key / superkey.

---

## 4. The Half-Open Interval Formula $[s, e)$
- **Non-Overlap Condition**:
  $$(e_1 \le s_2) \lor (s_1 \ge e_2)$$
- **Overlap Condition (Negation via De Morgan's Law)**:
  $$\text{Overlap} \iff (e_1 > s_2) \land (s_1 < e_2)$$
- **Why It Matters**: Back-to-back bookings (e.g. 10:00–11:00 and 11:00–12:00) succeed without collision because $(11:00 \le 11:00)$ is TRUE.

---

## 5. Concurrency Control in 3 Steps
1. **Lock**: `SELECT * FROM rooms WHERE id = :room_id FOR UPDATE` serializes concurrent transactions on the target room.
2. **Evaluate**: Transaction queries existing confirmed bookings for that room.
3. **Commit or Reject**:
   - If clean $\to$ inserts booking $\to$ commits $\to$ releases lock.
   - If overlap $\to$ rolls back $\to$ raises `ConflictError` $\to$ returns **HTTP 409 Conflict**.

---

## 6. Oracle PL/SQL Compound Trigger (`TRG_NO_OVERLAPPING_BOOKINGS`)
- **Mutating Table Error (`ORA-04091`) Avoidance**:
  - `AFTER EACH ROW`: Buffers `:NEW` booking rows in memory collections without touching the table.
  - `AFTER STATEMENT`: When the table is no longer mutating, locks parent room rows in ascending sorted order to prevent deadlocks, evaluates overlap, and raises `RAISE_APPLICATION_ERROR(-20001, ...)`.

---

## 7. Rehearsed Demo Sequence Cheat Sheet
1. **Dashboard**: Show real-time counters and `v_dashboard_summary` occupancy chart.
2. **Campus Map**: Click **Turing Computing Hub** $\to$ click **Room 101 (Turing Auditorium)**.
3. **Booking A**: Room 101, Dr. Evelyn Reed, Tomorrow 10:00–12:00 $\to$ **Confirmed (201)**.
4. **Booking B (Conflict)**: Same room, Prof. Marcus Vance, Tomorrow 11:00–13:00 $\to$ **Rejected with Red Alert (HTTP 409)**.
5. **Booking C (Back-to-Back)**: Same room, Prof. Marcus Vance, Tomorrow 12:00–14:00 $\to$ **Confirmed (201)**.
6. **Cancel Booking A**: Restores slot availability immediately.
7. **DBMS Studio**: Execute 4-Way Join and Non-Inflating Aggregation queries; highlight ~1.2 ms execution latency.
8. **Automated Tests**: Run `pytest -v` in PowerShell $\to$ show **45 passed in 5.7s**.
