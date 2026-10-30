# CampusPulse — Applied SQL Concepts & Implementation Guide
### Comprehensive Demonstration Guide for DBMS Academic Evaluation

---

## 1. Overview

This document presents the theoretical foundations, exact SQL syntax, execution mechanics, and sample outputs for the 20 database concepts implemented within the **CampusPulse Smart Campus Digital Twin** on **Oracle Database 21c Enterprise / Express Edition**.

Every query is derived directly from the active CampusPulse schema:
- `USERS`
- `BUILDINGS`
- `ROOMS`
- `BOOKINGS`
- `MAINTENANCE_TICKETS`
- `EVENTS`

---

## 2. Concept 1: Selection & Projection (SELECT ... WHERE)

### Theoretical Definition
In relational algebra, **Projection** ($\pi$) selects a vertical subset of columns, while **Selection** ($\sigma$) chooses a horizontal subset of rows satisfying a Boolean predicate.

### CampusPulse Production Query
```sql
SELECT 
    id, 
    room_number, 
    capacity, 
    room_type, 
    status 
FROM rooms 
WHERE capacity >= 40 
  AND status = 'AVAILABLE' 
  AND room_type IN ('CLASSROOM', 'AUDITORIUM');
```

### Explanation
- **Projection**: Only `id`, `room_number`, `capacity`, `room_type`, and `status` are retrieved, saving network and memory bandwidth.
- **Selection Predicate**: Filters rooms for large lecture allocation: capacity at least 40, currently marked `AVAILABLE`, and restricted to lecture-appropriate types.

### Sample Execution Output
```
   ID ROOM_NUMBER    CAPACITY ROOM_TYPE        STATUS
----- ------------ ---------- ---------------- -----------
    1 101                  60 CLASSROOM        AVAILABLE
    3 201                 120 AUDITORIUM       AVAILABLE
   12 101                  90 CLASSROOM        AVAILABLE
   16 101                 200 CLASSROOM        AVAILABLE
   21 101                 250 AUDITORIUM       AVAILABLE
   22 104                  40 CLASSROOM        AVAILABLE
   25 301                  50 CLASSROOM        AVAILABLE
```

---

## 3. Concept 2: Hierarchical Sorting (ORDER BY)

### Theoretical Definition
Relational tables are unordered multisets by definition. The `ORDER BY` clause imposes a deterministic total order on the output relation based on one or more sort keys.

### CampusPulse Production Query
```sql
SELECT 
    id, 
    name, 
    email, 
    role, 
    department 
FROM users 
WHERE department IS NOT NULL 
ORDER BY department ASC, name ASC;
```

### Explanation
- Rows are partitioned alphabetically by `department` (primary sort key).
- Within each department, users are sorted alphabetically by `name` (secondary tie-breaker).

---

## 4. Concept 3: Duplicate Elimination (DISTINCT)

### Theoretical Definition
SQL multisets permit duplicate tuples. The `DISTINCT` operator converts the multiset into a formal relational set by removing redundant rows.

### CampusPulse Production Query
```sql
SELECT DISTINCT 
    category 
FROM events 
ORDER BY category ASC;
```

### Sample Output
```
CATEGORY
----------------------------------------
ACADEMIC
CULTURAL
TECH
WORKSHOP
```

---

## 5. Concept 4: Relational Inner Equi-Join (INNER JOIN)

### Theoretical Definition
An Inner Join computes the Cartesian product of two relations ($R \times S$) and applies a join predicate ($R.A = S.B$), retaining only tuples where the condition evaluates to TRUE.

### CampusPulse Production Query
```sql
SELECT 
    r.id AS room_id,
    r.room_number,
    r.floor,
    r.capacity,
    b.code AS building_code,
    b.name AS building_name
FROM rooms r
INNER JOIN buildings b ON r.building_id = b.id
WHERE b.code = 'TURING'
ORDER BY r.floor, r.room_number;
```

### Sample Output
```
   ROOM_ID ROOM_NUMBER     FLOOR   CAPACITY BUILDING_CODE BUILDING_NAME
---------- ------------ -------- ---------- ------------- -------------------------
         6 101                 1        180 TURING        Turing Computing & AI Hub
         7 102                 1         50 TURING        Turing Computing & AI Hub
         8 205                 2         40 TURING        Turing Computing & AI Hub
         9 210                 2         75 TURING        Turing Computing & AI Hub
        10 301                 3         20 TURING        Turing Computing & AI Hub
        11 402                 4          8 TURING        Turing Computing & AI Hub
```

---

## 6. Concept 5: Left Outer Join (Preservation of Primary Relation)

### Theoretical Definition
A Left Outer Join ($R \leftouterjoin S$) preserves all tuples from the left relation $R$, even when no matching tuple exists in $S$. Unmatched attributes from $S$ are filled with `NULL`.

### CampusPulse Production Query
```sql
SELECT 
    b.code AS building_code,
    b.name AS building_name,
    COUNT(r.id) AS total_rooms,
    COALESCE(SUM(r.capacity), 0) AS total_building_capacity
FROM buildings b
LEFT JOIN rooms r ON b.id = r.building_id
GROUP BY b.code, b.name
ORDER BY total_building_capacity DESC;
```

### Key DBMS Benefit
Ensures newly registered campus buildings with zero constructed rooms are not lost from statistical summaries.

---

## 7. Concept 6: Right Outer Join

### Theoretical Definition
A Right Outer Join ($R \rightouterjoin S$) preserves all tuples from the right relation $S$.

### CampusPulse Production Query
```sql
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.role,
    COUNT(mt.id) AS tickets_reported
FROM maintenance_tickets mt
RIGHT JOIN users u ON mt.user_id = u.id
GROUP BY u.id, u.name, u.role
ORDER BY tickets_reported DESC, u.name ASC;
```

### Key DBMS Benefit
Lists all users in the system and accurately reflects users who have submitted 0 tickets (`tickets_reported = 0`).

---

## 8. Concept 7: Multi-Table 4-Way Join

### CampusPulse Production Query
```sql
SELECT 
    bk.id AS booking_id,
    bk.title AS session_title,
    u.name AS reserved_by,
    u.department,
    bld.name AS building_name,
    r.room_number,
    r.room_type,
    TO_CHAR(bk.start_time, 'YYYY-MM-DD HH24:MI') AS start_time,
    TO_CHAR(bk.end_time, 'YYYY-MM-DD HH24:MI') AS end_time
FROM bookings bk
JOIN rooms r ON bk.room_id = r.id
JOIN buildings bld ON r.building_id = bld.id
JOIN users u ON bk.user_id = u.id
WHERE bk.status = 'CONFIRMED'
ORDER BY bk.start_time ASC
FETCH FIRST 10 ROWS ONLY;
```

### Join Path
$$\text{BOOKINGS} \xrightarrow{room\_id} \text{ROOMS} \xrightarrow{building\_id} \text{BUILDINGS}$$
$$\text{BOOKINGS} \xrightarrow{user\_id} \text{USERS}$$

---

## 9. Concept 8: Aggregate Functions (COUNT, SUM, AVG, MIN, MAX)

```sql
SELECT 
    COUNT(id) AS total_room_count,
    SUM(capacity) AS cumulative_campus_capacity,
    ROUND(AVG(capacity), 2) AS average_room_capacity,
    MIN(capacity) AS smallest_room_capacity,
    MAX(capacity) AS largest_room_capacity
FROM rooms;
```

---

## 10. Concept 9: Grouping & Post-Aggregation Predicates (GROUP BY ... HAVING)

### Theoretical Distinction
- `WHERE`: Filters tuples **before** aggregation.
- `HAVING`: Filters groups **after** aggregate expressions have been evaluated.

```sql
SELECT 
    b.code AS building_code,
    b.name AS building_name,
    COUNT(r.id) AS room_count,
    SUM(r.capacity) AS total_capacity,
    ROUND(AVG(r.capacity), 1) AS avg_capacity
FROM buildings b
JOIN rooms r ON b.id = r.building_id
GROUP BY b.code, b.name
HAVING SUM(r.capacity) >= 100
ORDER BY total_capacity DESC;
```

---

## 11. Concept 10: Non-Correlated Nested Subquery (IN)

```sql
SELECT 
    r.room_number,
    r.room_type,
    r.status AS room_status,
    b.name AS building_name
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.id IN (
    SELECT DISTINCT room_id 
    FROM maintenance_tickets 
    WHERE status IN ('OPEN', 'IN_PROGRESS')
)
ORDER BY b.name, r.room_number;
```

---

## 12. Concept 11: Correlated Subquery

### Theoretical Mechanism
In a correlated subquery, the inner query references an attribute from the outer query tuple (`r.building_id`). The inner query is conceptually re-evaluated for each candidate tuple in the outer query.

```sql
SELECT 
    r.room_number,
    r.room_type,
    r.capacity,
    b.name AS building_name
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.capacity > (
    SELECT AVG(inner_r.capacity)
    FROM rooms inner_r
    WHERE inner_r.building_id = r.building_id
)
ORDER BY b.name, r.capacity DESC;
```

---

## 13. Concept 12: Semi-Joins via EXISTS & NOT EXISTS

```sql
SELECT 
    r.room_number,
    r.room_type,
    r.capacity,
    b.name AS building_name
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.status != 'MAINTENANCE'
  AND NOT EXISTS (
      SELECT 1 
      FROM bookings bk 
      WHERE bk.room_id = r.id 
        AND bk.status = 'CONFIRMED'
        AND CURRENT_TIMESTAMP BETWEEN bk.start_time AND bk.end_time
  )
ORDER BY r.capacity DESC;
```

---

## 14. Concept 13: DML State Modifications & Transactions

```sql
-- Step 1: Insert temporary ticket
INSERT INTO maintenance_tickets (room_id, user_id, title, description, priority, status)
VALUES (
    (SELECT MIN(id) FROM rooms),
    (SELECT MIN(id) FROM users),
    'Demo DML Inspection Ticket',
    'Routine verification of HVAC filter integrity.',
    'LOW',
    'OPEN'
);

-- Step 2: Update priority
UPDATE maintenance_tickets 
SET priority = 'MEDIUM'
WHERE title = 'Demo DML Inspection Ticket';

-- Step 3: Delete ticket
DELETE FROM maintenance_tickets 
WHERE title = 'Demo DML Inspection Ticket';

COMMIT;
```

---

## 15. Concept 14: Relational Views

CampusPulse defines two pre-compiled views:

### View 1: `v_dashboard_summary`
Aggregates room statuses and calculates building occupancy rates.
```sql
SELECT 
    building_code,
    building_name,
    total_rooms,
    available_rooms,
    occupied_rooms,
    maintenance_rooms,
    occupancy_rate
FROM v_dashboard_summary
ORDER BY occupancy_rate DESC;
```

### View 2: `v_room_live_status`
Combines room attributes, active real-time booking (if any), and active open work order.

---

## 16. Concept 15: Indexing Strategy & Execution Plan (EXPLAIN PLAN)

```sql
EXPLAIN PLAN FOR
SELECT id, title, status 
FROM bookings 
WHERE room_id = 26 
  AND start_time >= TIMESTAMP '2026-11-01 00:00:00 +00:00'
  AND end_time <= TIMESTAMP '2026-11-02 00:00:00 +00:00';

SELECT PLAN_TABLE_OUTPUT 
FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', NULL, 'BASIC'));
```

### Result
The Oracle Cost-Based Optimizer (CBO) utilizes the composite B-Tree index `idx_bk_room_time(room_id, start_time, end_time)` to perform an **INDEX RANGE SCAN**, avoiding a costly full table scan on `BOOKINGS`.

---

## 17. Concept 16: Transaction Demarcation (SAVEPOINT, ROLLBACK, COMMIT)

```sql
SAVEPOINT sp_before_dml;

INSERT INTO users (name, email, role, department)
VALUES ('Temporary Test User', 'temp_demo@univ.edu', 'STUDENT', 'Robotics');

-- Record is visible inside the active transaction
SELECT COUNT(*) FROM users WHERE email = 'temp_demo@univ.edu'; -- Returns 1

-- Rollback uncommitted changes
ROLLBACK TO sp_before_dml;

-- Verify record is completely undone
SELECT COUNT(*) FROM users WHERE email = 'temp_demo@univ.edu'; -- Returns 0

COMMIT;
```

---

## 18. Concept 17: Oracle PL/SQL Compound Trigger Overlap Prevention

```sql
DECLARE
    v_room_id NUMBER;
    v_user_id NUMBER;
    v_now TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP + INTERVAL '90' DAY;
BEGIN
    SELECT MIN(id) INTO v_room_id FROM rooms WHERE status = 'AVAILABLE';
    SELECT MIN(id) INTO v_user_id FROM users;

    -- Valid booking 1: 10:00 to 12:00
    INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status)
    VALUES (v_room_id, v_user_id, 'Trigger Demo Booking A', v_now, v_now + INTERVAL '2' HOUR, 'CONFIRMED');

    BEGIN
        -- Overlapping booking 2: 11:00 to 13:00 (MUST FAIL with ORA-20001)
        INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status)
        VALUES (v_room_id, v_user_id, 'Trigger Demo Conflict B', v_now + INTERVAL '1' HOUR, v_now + INTERVAL '3' HOUR, 'CONFIRMED');
        
        DBMS_OUTPUT.PUT_LINE('FAIL: Overlapping booking was NOT rejected!');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20001 THEN
                DBMS_OUTPUT.PUT_LINE('SUCCESS: Trigger caught overlapping booking: ' || SQLERRM);
            ELSE
                RAISE;
            END IF;
    END;

    ROLLBACK;
END;
/
```

### Output
```
SUCCESS: Trigger caught overlapping booking: ORA-20001: OracleSQL Conflict Error: Room 1 has an overlapping booking during the requested time window.
```

---

## 19. Concept 18: Data Dictionary Integrity Audit

```sql
SELECT 
    table_name,
    constraint_type,
    constraint_name,
    status
FROM user_constraints
WHERE table_name IN ('USERS', 'BUILDINGS', 'ROOMS', 'BOOKINGS', 'MAINTENANCE_TICKETS', 'EVENTS')
ORDER BY table_name, constraint_type, constraint_name;
```

### Key:
- `P`: Primary Key
- `R`: Referential Integrity (Foreign Key)
- `C`: Check / NOT NULL Constraint
- `U`: Unique Constraint

---

## 20. Concept 19: Date & Time Interval Arithmetic

```sql
SELECT 
    id AS booking_id,
    title,
    TO_CHAR(start_time, 'YYYY-MM-DD HH24:MI') AS start_formatted,
    TO_CHAR(end_time, 'YYYY-MM-DD HH24:MI') AS end_formatted,
    ROUND((CAST(end_time AS DATE) - CAST(start_time AS DATE)) * 24, 2) AS duration_hours
FROM bookings
WHERE status = 'CONFIRMED'
FETCH FIRST 5 ROWS ONLY;
```

---

## 21. Concept 20: Parametric Room Availability Search

```sql
SELECT 
    r.id AS room_id,
    r.room_number,
    r.capacity,
    r.room_type,
    r.has_projector,
    r.has_ac,
    b.code AS building_code,
    b.name AS building_name
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.status != 'MAINTENANCE'
  AND r.capacity >= 30
  AND NOT EXISTS (
      SELECT 1 
      FROM bookings bk 
      WHERE bk.room_id = r.id 
        AND bk.status = 'CONFIRMED'
        AND NOT (
            bk.end_time <= CURRENT_TIMESTAMP + INTERVAL '7' DAY OR 
            bk.start_time >= CURRENT_TIMESTAMP + INTERVAL '7' DAY + INTERVAL '2' HOUR
        )
  )
ORDER BY r.capacity DESC, b.code ASC;
```

---

## 22. Summary for Academic Viva Presentation

When presenting these queries to your professor:
1. **Explain the Real-World Scenario**: E.g., Query 12/20 answers the question: "Find all available conference rooms with at least 30 seats next Monday afternoon."
2. **Highlight the DBMS Engine Feature**: Mention how Oracle's Cost-Based Optimizer uses the B-Tree index on `(room_id, start_time, end_time)` to evaluate the `NOT EXISTS` subquery efficiently.
3. **Showcase Declarative Integrity**: Emphasize that business rules like positive capacity and valid roles are enforced directly in the database engine using `CHECK` constraints, not just in web frontend forms.

