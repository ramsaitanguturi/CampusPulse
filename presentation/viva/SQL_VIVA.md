# SQL Viva: Queries, Joins, Aggregations & Subqueries (Questions 21–40)

---

### Q21: What is the difference between `WHERE` and `HAVING` in SQL?
- **Direct Answer**: `WHERE` filters individual tuples **before** aggregation; `HAVING` filters aggregated group records **after** aggregate expressions have been evaluated.
- **CampusPulse Example** (Query 9):
  ```sql
  SELECT b.code, COUNT(r.id) AS room_count, SUM(r.capacity) AS total_capacity
  FROM buildings b JOIN rooms r ON b.id = r.building_id
  GROUP BY b.code, b.name
  HAVING SUM(r.capacity) >= 100;
  ```
  `WHERE` cannot filter on `SUM(r.capacity)` because aggregate sums have not been calculated when `WHERE` executes.

---

### Q22: What is a Correlated Subquery and how does it execute?
- **Direct Answer**: A subquery that references attributes from the outer query. It cannot be evaluated independently; conceptually, the inner query is re-evaluated for each candidate row processed by the outer query.
- **CampusPulse Example** (Query 11):
  ```sql
  SELECT r.room_number, r.capacity, b.name
  FROM rooms r JOIN buildings b ON r.building_id = b.id
  WHERE r.capacity > (
      SELECT AVG(inner_r.capacity) FROM rooms inner_r WHERE inner_r.building_id = r.building_id
  );
  ```
  The inner query computes the average room capacity specifically for outer row's `r.building_id`.
- **Follow-up Question**: *How does the Oracle optimizer optimize correlated subqueries?* (Answer: It attempts subquery unnesting, converting the correlated subquery into a hash join or window function to avoid row-by-row nested loop execution).

---

### Q23: Explain the difference between `IN` and `EXISTS`. When is `EXISTS` preferred?
- **Direct Answer**: `IN` tests if a scalar value is a member of a returned set. `EXISTS` tests whether a subquery returns at least one tuple (Boolean test). `EXISTS` is preferred for large outer relations because it short-circuits as soon as the first matching tuple is located.
- **CampusPulse Example**: In room availability checking, we use `NOT EXISTS`. If a room has even 1 confirmed booking, `NOT EXISTS` aborts subquery scanning immediately for that room. Furthermore, `NOT IN` fails unpredictably if the subquery returns any `NULL` values, whereas `NOT EXISTS` handles `NULL` safely.

---

### Q24: What is an Equi-Join versus an Outer Join?
- **Direct Answer**: An Equi-Join retains only rows where the join predicate evaluates to TRUE ($R.A = S.B$). An Outer Join retains matching rows plus unmatched rows from one or both relations, populating non-matching columns with `NULL`.
- **CampusPulse Example**:
  - `INNER JOIN`: `rooms r JOIN buildings b ON r.building_id = b.id` (returns only rooms assigned to valid buildings).
  - `LEFT OUTER JOIN`: `buildings b LEFT JOIN rooms r ON b.id = r.building_id` (preserves buildings with zero rooms).

---

### Q25: What is Cartesian Product Row Multiplication and how did CampusPulse solve it?
- **Direct Answer**: When joining a parent table to two or more independent child tables (e.g. `Buildings -> Rooms` and `Buildings -> Tickets`), the query produces a Cartesian product where every room is paired with every ticket, multiplying counts and sums.
- **CampusPulse Solution**: We execute **pre-aggregated subqueries**:
  ```sql
  SELECT b.name, r_agg.total_rooms, t_agg.active_tickets
  FROM buildings b
  JOIN (SELECT building_id, COUNT(*) AS total_rooms FROM rooms GROUP BY building_id) r_agg 
    ON b.id = r_agg.building_id
  LEFT JOIN (SELECT r2.building_id, COUNT(*) AS active_tickets FROM maintenance_tickets mt JOIN rooms r2 ON mt.room_id = r2.id GROUP BY r2.building_id) t_agg 
    ON b.id = t_agg.building_id;
  ```
  Aggregating each relation independently before joining guarantees accurate scalar totals.

---

### Q26: What is a Relational Database View and what are its advantages?
- **Direct Answer**: A named, virtual relation defined by a stored SQL query. It does not store physical data tuples (unless materialized); the query executes dynamically when the view is referenced.
- **Advantages**:
  1. Simplifies complex queries for application developers.
  2. Provides security / column-level access control.
  3. Provides logical data independence.
- **CampusPulse Example**: `v_dashboard_summary` pre-calculates building occupancy rates.
- **Follow-up Question**: *Is `v_dashboard_summary` updatable?* (Answer: No, because it contains `GROUP BY`, `COUNT`, and `SUM` aggregate expressions; Oracle views with aggregations are read-only).

---

### Q27: How does Oracle perform pagination in SQL?
- **Direct Answer**: Starting in Oracle 12c, Oracle supports ANSI standard `OFFSET ... FETCH FIRST n ROWS ONLY` syntax.
- **CampusPulse Example**: In Query 7, `FETCH FIRST 10 ROWS ONLY` returns the top 10 rows without needing legacy nested subqueries with `ROWNUM <= 10`.

---

### Q28: What is the purpose of `COALESCE` in SQL?
- **Direct Answer**: An ANSI SQL function that returns the first non-null argument in its parameter list.
- **CampusPulse Example**: In `v_dashboard_summary`, when a building has zero rooms, `SUM(...)` yields `NULL`. `COALESCE(SUM(...), 0)` transforms the null value to numeric `0`.

---

### Q29: What does `CURRENT_TIMESTAMP BETWEEN start_time AND end_time` evaluate?
- **Direct Answer**: It evaluates whether the system timestamp falls within the inclusive interval $[start\_time, end\_time]$.
- **CampusPulse Example**: Used in `v_room_live_status` to evaluate whether a room has an ongoing confirmed reservation at the present moment.

---

### Q30: How do you calculate duration in hours between two Oracle timestamps?
- **Direct Answer**: In Oracle, subtracting two `DATE` values yields fractional days. Subtracting two `TIMESTAMP WITH TIME ZONE` values yields an `INTERVAL DAY TO SECOND`. Casting timestamps to `DATE` and multiplying by 24 yields fractional hours:
  ```sql
  ROUND((CAST(end_time AS DATE) - CAST(start_time AS DATE)) * 24, 2)
  ```

---

### Q31: What is a B-Tree Index and how does it accelerate SQL queries?
- **Direct Answer**: A balanced tree data structure that maintains sorted keys, providing $O(\log N)$ lookup, insertion, and range search performance by minimizing disk I/O operations.
- **CampusPulse Example**: Composite index `idx_bk_room_time(room_id, start_time, end_time)` allows Oracle to find conflicting room bookings via an `INDEX RANGE SCAN` rather than a full table scan on `BOOKINGS`.
- **Follow-up Question**: *What is the overhead of creating too many indexes?* (Answer: Every index consumes disk space and degrades DML performance, as `INSERT`, `UPDATE`, and `DELETE` operations must update every associated index).

---

### Q32: How do you verify that an index is actually being used by Oracle?
- **Direct Answer**: Using Oracle's `EXPLAIN PLAN FOR <query>` command, followed by querying `DBMS_XPLAN.DISPLAY('PLAN_TABLE', NULL, 'BASIC')`.
- **CampusPulse Example**: Verified in Query 15 of `sql_demonstrations.sql`, which shows Oracle Cost-Based Optimizer choosing `INDEX RANGE SCAN` on `idx_bk_room_time`.

---

### Q33: What is the difference between Relational Selection and Projection?
- **Direct Answer**:
  - **Selection ($\sigma$)**: Chooses a horizontal subset of tuples satisfying a predicate condition (SQL `WHERE`).
  - **Projection ($\pi$)**: Chooses a vertical subset of specific columns, discarding unselected attributes (SQL `SELECT col1, col2`).

---

### Q34: What is an Inner Equi-Join versus a Natural Join?
- **Direct Answer**: An Inner Equi-Join explicitly states the matching columns via `ON R.id = S.r_id`. A Natural Join automatically equates all columns sharing identical names between the two relations.
- **Why Avoid Natural Joins**: Natural joins can break unpredictably if columns with generic names (such as `created_at` or `status`) are added to both tables. CampusPulse always uses explicit `JOIN ... ON`.

---

### Q35: How does `DISTINCT` eliminate duplicate rows?
- **Direct Answer**: It converts a multiset (bag) into a mathematical set by hashing or sorting the projected rows and eliminating duplicate tuples.
- **CampusPulse Example**: `SELECT DISTINCT category FROM events;` returns unique categories (`ACADEMIC`, `TECH`, `WORKSHOP`, `CULTURAL`, `ATHLETIC`).

---

### Q36: What is a Semi-Join?
- **Direct Answer**: A join operation that returns rows from the first relation that match at least one row in the second relation, without duplicating rows or returning attributes from the second relation.
- **CampusPulse Example**: An `EXISTS` query is executed by Oracle internally as a semi-join.

---

### Q37: What is an Anti-Semi-Join?
- **Direct Answer**: A join operation that returns rows from the first relation that have **zero matches** in the second relation.
- **CampusPulse Example**: Our `NOT EXISTS` room availability search is executed by Oracle as an optimized hash anti-semi-join.

---

### Q38: What does `SAVEPOINT` do in SQL transaction control?
- **Direct Answer**: Marks an intermediate point within a transaction to which updates can be partially rolled back via `ROLLBACK TO <savepoint>`, without aborting the entire transaction.
- **CampusPulse Example**: Demonstrated in Query 16 of `sql_demonstrations.sql`.

---

### Q39: What is the purpose of `CASE ... WHEN ... THEN ... ELSE ... END` in SQL?
- **Direct Answer**: A conditional scalar expression in ANSI SQL that returns specific values based on predicate evaluation.
- **CampusPulse Example**: In `v_dashboard_summary`:
  ```sql
  SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END)
  ```
  Permits conditional aggregation of multiple statuses within a single `SELECT` pass.

---

### Q40: What happens if an aggregate function encounters `NULL` values?
- **Direct Answer**: Aggregate functions (`SUM`, `AVG`, `MIN`, `MAX`) ignore `NULL` values during calculation. `COUNT(column)` ignores nulls, whereas `COUNT(*)` counts all tuples including nulls.
