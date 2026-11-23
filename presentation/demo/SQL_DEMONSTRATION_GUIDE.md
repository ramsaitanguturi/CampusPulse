# SQL Demonstration Guide for Laboratory Evaluation

This guide contains the 20 SQL syllabus queries tailored for live execution in **SQL\*Plus** or **DBMS Studio** during laboratory evaluation.

---

## Connecting via SQL\*Plus
```powershell
sqlplus campuspulse@localhost:1521/XEPDB1
```

---

## 1. DQL & Basic Operations (Queries 1–3)

### Query 1: Selection & Projection (SELECT ... WHERE)
```sql
SELECT id, room_number, capacity, room_type, status 
FROM rooms 
WHERE capacity >= 40 AND status = 'AVAILABLE' AND room_type IN ('CLASSROOM', 'AUDITORIUM');
```
*Concept*: Relational Projection ($\pi$) and Selection Predicate ($\sigma$). Filters high-capacity lecture rooms.

### Query 2: Hierarchical Sorting (ORDER BY)
```sql
SELECT id, name, email, role, department 
FROM users 
WHERE department IS NOT NULL 
ORDER BY department ASC, name ASC;
```
*Concept*: Deterministic total ordering using primary sort key (`department`) and secondary tie-breaker (`name`).

### Query 3: Duplicate Elimination (DISTINCT)
```sql
SELECT DISTINCT category FROM events ORDER BY category ASC;
```
*Concept*: Converts SQL multiset into formal relational set by purging redundant values.

---

## 2. Relational Joins (Queries 4–7)

### Query 4: Inner Equi-Join
```sql
SELECT r.id AS room_id, r.room_number, r.floor, r.capacity, b.code, b.name 
FROM rooms r 
INNER JOIN buildings b ON r.building_id = b.id 
WHERE b.code = 'TURING' 
ORDER BY r.floor, r.room_number;
```
*Concept*: Equi-join on primary key / foreign key relationship ($ROOMS.building\_id = BUILDINGS.id$).

### Query 5: Left Outer Join
```sql
SELECT b.code, b.name, COUNT(r.id) AS total_rooms, COALESCE(SUM(r.capacity), 0) AS total_capacity 
FROM buildings b 
LEFT JOIN rooms r ON b.id = r.building_id 
GROUP BY b.code, b.name 
ORDER BY total_capacity DESC;
```
*Concept*: Preserves all rows from left relation (`BUILDINGS`) even if a newly constructed building has 0 rooms.

### Query 6: Right Outer Join
```sql
SELECT u.id, u.name, u.role, COUNT(mt.id) AS tickets_reported 
FROM maintenance_tickets mt 
RIGHT JOIN users u ON mt.user_id = u.id 
GROUP BY u.id, u.name, u.role 
ORDER BY tickets_reported DESC, u.name ASC;
```
*Concept*: Preserves all registered users and accurately displays `0` for users who have submitted no tickets.

### Query 7: 4-Way Multi-Table Join
```sql
SELECT bk.id, bk.title, u.name AS reserved_by, bld.name AS building_name, r.room_number,
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
*Concept*: Associative multi-table traversal across the entire relational graph.

---

## 3. Aggregations & Grouping (Queries 8–9)

### Query 8: Aggregate Functions (COUNT, SUM, AVG, MIN, MAX)
```sql
SELECT COUNT(id) AS total_rooms, SUM(capacity) AS total_capacity,
       ROUND(AVG(capacity), 2) AS avg_capacity, MIN(capacity) AS min_cap, MAX(capacity) AS max_cap 
FROM rooms;
```

### Query 9: GROUP BY & HAVING
```sql
SELECT b.code, b.name, COUNT(r.id) AS room_count, SUM(r.capacity) AS total_capacity 
FROM buildings b 
JOIN rooms r ON b.id = r.building_id 
GROUP BY b.code, b.name 
HAVING SUM(r.capacity) >= 100 
ORDER BY total_capacity DESC;
```
*Concept*: `HAVING` filters groups post-aggregation, unlike `WHERE` which filters tuples pre-aggregation.

---

## 4. Advanced Subqueries & Semi-Joins (Queries 10–12)

### Query 10: Non-Correlated Subquery (IN)
```sql
SELECT r.room_number, r.room_type, b.name AS building_name 
FROM rooms r 
JOIN buildings b ON r.building_id = b.id 
WHERE r.id IN (
    SELECT DISTINCT room_id FROM maintenance_tickets WHERE status IN ('OPEN', 'IN_PROGRESS')
);
```

### Query 11: Correlated Subquery
```sql
SELECT r.room_number, r.room_type, r.capacity, b.name AS building_name 
FROM rooms r 
JOIN buildings b ON r.building_id = b.id 
WHERE r.capacity > (
    SELECT AVG(inner_r.capacity) FROM rooms inner_r WHERE inner_r.building_id = r.building_id
);
```
*Concept*: Inner query depends on candidate tuple value from outer query (`r.building_id`).

### Query 12: Semi-Join via NOT EXISTS
```sql
SELECT r.room_number, b.name AS building_name, r.capacity 
FROM rooms r 
JOIN buildings b ON r.building_id = b.id 
WHERE r.status != 'MAINTENANCE' 
  AND NOT EXISTS (
      SELECT 1 FROM bookings bk 
      WHERE bk.room_id = r.id AND bk.status = 'CONFIRMED' 
        AND CURRENT_TIMESTAMP BETWEEN bk.start_time AND bk.end_time
  );
```
*Concept*: Short-circuit semi-join checking set emptiness without building in-memory lists.

---

## 5. DML, Transactions, Views & Triggers (Queries 13–20)

### Query 13: DML Modifications & Atomicity
```sql
INSERT INTO maintenance_tickets (room_id, user_id, title, description, priority, status)
VALUES ((SELECT MIN(id) FROM rooms), (SELECT MIN(id) FROM users), 'Demo Ticket', 'Test', 'LOW', 'OPEN');
UPDATE maintenance_tickets SET priority = 'MEDIUM' WHERE title = 'Demo Ticket';
DELETE FROM maintenance_tickets WHERE title = 'Demo Ticket';
COMMIT;
```

### Query 14: Relational View Query
```sql
SELECT building_code, building_name, total_rooms, available_rooms, occupied_rooms, occupancy_rate 
FROM v_dashboard_summary 
ORDER BY occupancy_rate DESC;
```

### Query 15: Index Verification via EXPLAIN PLAN
```sql
EXPLAIN PLAN FOR 
SELECT id, title FROM bookings 
WHERE room_id = 1 AND start_time >= CURRENT_TIMESTAMP;

SELECT PLAN_TABLE_OUTPUT FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', NULL, 'BASIC'));
```
*Result*: Oracle CBO uses `INDEX RANGE SCAN` on `idx_bk_room_time`.

### Query 16: Transaction Demarcation (SAVEPOINT & ROLLBACK)
```sql
SAVEPOINT sp1;
INSERT INTO users (name, email, role) VALUES ('Temp User', 'temp@univ.edu', 'STUDENT');
ROLLBACK TO sp1;
SELECT COUNT(*) FROM users WHERE email = 'temp@univ.edu'; -- Returns 0
```

### Query 17: Oracle Compound Trigger Overlap Rejection
```sql
DECLARE
    v_room_id NUMBER;
    v_user_id NUMBER;
    v_now TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP + INTERVAL '100' DAY;
BEGIN
    SELECT MIN(id) INTO v_room_id FROM rooms WHERE status = 'AVAILABLE';
    SELECT MIN(id) INTO v_user_id FROM users;

    INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status)
    VALUES (v_room_id, v_user_id, 'Booking A', v_now, v_now + INTERVAL '2' HOUR, 'CONFIRMED');

    -- Attempt overlapping booking (MUST FAIL with ORA-20001)
    INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status)
    VALUES (v_room_id, v_user_id, 'Conflict B', v_now + INTERVAL '1' HOUR, v_now + INTERVAL '3' HOUR, 'CONFIRMED');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Caught by Trigger: ' || SQLERRM);
        ROLLBACK;
END;
/
```
*Expected Output*: `Caught by Trigger: ORA-20001: OracleSQL Conflict Error: Room ... has an overlapping booking`.

### Query 18: Data Dictionary Constraint Audit
```sql
SELECT table_name, constraint_type, constraint_name, status 
FROM user_constraints 
WHERE table_name IN ('USERS', 'BUILDINGS', 'ROOMS', 'BOOKINGS', 'MAINTENANCE_TICKETS', 'EVENTS')
ORDER BY table_name, constraint_type;
```

### Query 19: Date & Time Arithmetic
```sql
SELECT id, title, ROUND((CAST(end_time AS DATE) - CAST(start_time AS DATE)) * 24, 2) AS duration_hours 
FROM bookings WHERE status = 'CONFIRMED' FETCH FIRST 5 ROWS ONLY;
```

### Query 20: Parametric Dynamic Availability
```sql
SELECT r.id, r.room_number, r.capacity, b.code 
FROM rooms r JOIN buildings b ON r.building_id = b.id 
WHERE r.status = 'AVAILABLE' AND r.capacity >= 50 
  AND NOT EXISTS (
      SELECT 1 FROM bookings bk 
      WHERE bk.room_id = r.id AND bk.status = 'CONFIRMED'
        AND NOT (bk.end_time <= CURRENT_TIMESTAMP + INTERVAL '1' DAY OR bk.start_time >= CURRENT_TIMESTAMP + INTERVAL '1' DAY + INTERVAL '2' HOUR)
  );
```
