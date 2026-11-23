# 04 — SQL & DBMS Syllabus Concepts

This document summarizes the 20 applied SQL syllabus concepts implemented in CampusPulse using Oracle Database 21c SQL.

---

## The 20 Applied SQL Concepts Summary Table

| # | DBMS Concept | Primary Tables | Production Query Objective | Key Keyword / Clause |
|---|---|---|---|---|
| 1 | **Selection & Projection** | `ROOMS` | Filter large lecture halls ($capacity \ge 40$) | `SELECT ... WHERE` |
| 2 | **Hierarchical Sorting** | `USERS` | Sort alphabetically by department then name | `ORDER BY dept ASC, name ASC` |
| 3 | **Duplicate Elimination** | `EVENTS` | Distinct categories hosted on campus | `DISTINCT` |
| 4 | **Inner Equi-Join** | `ROOMS`, `BUILDINGS` | Retrieve rooms with parent building details | `INNER JOIN ... ON` |
| 5 | **Left Outer Join** | `BUILDINGS`, `ROOMS` | Show all buildings, even those with 0 rooms | `LEFT JOIN ... ON` |
| 6 | **Right Outer Join** | `MAINTENANCE_TICKETS`, `USERS` | Show all users and ticket submission counts | `RIGHT JOIN ... ON` |
| 7 | **4-Way Multi-Table Join** | `BOOKINGS`, `ROOMS`, `BUILDINGS`, `USERS` | Audit active reservations with organizer & location | 4-table `INNER JOIN` |
| 8 | **Aggregate Functions** | `ROOMS` | Total, cumulative, average, min, max capacity | `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` |
| 9 | **GROUP BY & HAVING** | `BUILDINGS`, `ROOMS` | Filter buildings with total capacity $\ge 100$ | `GROUP BY ... HAVING` |
| 10| **Non-Correlated Subquery** | `ROOMS`, `MAINTENANCE_TICKETS` | Find rooms with active maintenance tickets | `WHERE id IN (SELECT ...)` |
| 11| **Correlated Subquery** | `ROOMS` | Find rooms larger than their building's average | `WHERE capacity > (SELECT AVG...)` |
| 12| **Semi-Join with NOT EXISTS**| `ROOMS`, `BOOKINGS` | Find conflict-free rooms currently vacant | `NOT EXISTS (SELECT 1 ...)` |
| 13| **DML State Modification** | `MAINTENANCE_TICKETS` | Insert, update priority, and delete ticket | `INSERT`, `UPDATE`, `DELETE` |
| 14| **Relational Views** | `BUILDINGS`, `ROOMS` | Pre-compiled occupancy statistics view | `CREATE VIEW v_dashboard_summary` |
| 15| **Index Optimization** | `BOOKINGS` | Verify index range scan on composite index | `EXPLAIN PLAN`, `INDEX RANGE SCAN` |
| 16| **Transaction Demarcation**| `USERS` | Partial rollback without aborting transaction | `SAVEPOINT`, `ROLLBACK TO`, `COMMIT` |
| 17| **PL/SQL Compound Trigger** | `BOOKINGS` | Mutating-table-free overlap rejection | `COMPOUND TRIGGER`, `RAISE_APPLICATION_ERROR` |
| 18| **Data Dictionary Audit** | `USER_CONSTRAINTS` | Verify active PK, FK, Check, and Unique rules | `SELECT FROM user_constraints` |
| 19| **Date & Time Arithmetic** | `BOOKINGS` | Compute duration of meetings in fractional hours| `(CAST(end AS DATE) - CAST(start AS DATE)) * 24` |
| 20| **Parametric Availability**| `ROOMS`, `BOOKINGS` | Dynamic slot search with equipment criteria | Parameterized interval `NOT EXISTS` |

---

## Top 5 Queries to Showcase in Viva

### 1. Multi-Table 4-Way Join (Live in DBMS Studio)
```sql
SELECT 
    b.id AS booking_id,
    b.title AS session_title,
    u.name AS reserved_by,
    u.role AS user_role,
    u.department,
    r.room_number,
    r.room_type,
    bld.name AS building_name,
    b.start_time,
    b.end_time
FROM bookings b
JOIN rooms r ON b.room_id = r.id
JOIN buildings bld ON r.building_id = bld.id
JOIN users u ON b.user_id = u.id
WHERE b.status = 'CONFIRMED'
ORDER BY b.start_time DESC
FETCH FIRST 10 ROWS ONLY;
```
*Examiner Explanation*: Traverses the relational graph $\text{BOOKINGS} \to \text{ROOMS} \to \text{BUILDINGS}$ and $\text{BOOKINGS} \to \text{USERS}$ in a single query. Uses Oracle 21c ANSI SQL `FETCH FIRST 10 ROWS ONLY` for pagination.

### 2. Multi-Table Aggregation without Cartesian Product Inflation
```sql
SELECT 
    b.code AS building_code,
    b.name AS building_name,
    COALESCE(r_agg.total_rooms, 0) AS total_rooms,
    COALESCE(r_agg.total_capacity, 0) AS total_capacity,
    COALESCE(t_agg.active_tickets, 0) AS active_tickets
FROM buildings b
JOIN (
    SELECT building_id, COUNT(id) AS total_rooms, SUM(capacity) AS total_capacity
    FROM rooms GROUP BY building_id
) r_agg ON b.id = r_agg.building_id
LEFT JOIN (
    SELECT r2.building_id, COUNT(mt.id) AS active_tickets
    FROM maintenance_tickets mt JOIN rooms r2 ON mt.room_id = r2.id
    WHERE mt.status IN ('OPEN', 'IN_PROGRESS')
    GROUP BY r2.building_id
) t_agg ON b.id = t_agg.building_id
ORDER BY total_capacity DESC;
```
*Examiner Explanation*: Naive joins between `buildings`, `rooms`, and `maintenance_tickets` create a Cartesian explosion of rows where building capacity is multiplied by ticket counts. We solve this by pre-aggregating each child relation independently before joining to the parent building.

### 3. Dynamic Conflict-Free Room Availability via Correlated NOT EXISTS
```sql
SELECT r.room_number, b.name AS building_name, r.room_type, r.capacity, r.status
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.status != 'MAINTENANCE'
  AND NOT EXISTS (
      SELECT 1 FROM bookings bk 
      WHERE bk.room_id = r.id AND bk.status = 'CONFIRMED'
        AND CURRENT_TIMESTAMP BETWEEN bk.start_time AND bk.end_time
  );
```
*Examiner Explanation*: `NOT EXISTS` short-circuits evaluation as soon as the first matching record is found, outperforming `NOT IN` (which requires complete set evaluation and handles `NULL` values inefficiently).

### 4. Correlated Subquery
```sql
SELECT r.room_number, r.room_type, r.capacity, b.name AS building_name
FROM rooms r
JOIN buildings b ON r.building_id = b.id
WHERE r.capacity > (
    SELECT AVG(inner_r.capacity)
    FROM rooms inner_r
    WHERE inner_r.building_id = r.building_id
)
ORDER BY b.name, r.capacity DESC;
```
*Examiner Explanation*: Inner query calculates the average room capacity for *that specific building* by referencing the outer row's `r.building_id`.

### 5. Normalized Database View (`v_dashboard_summary`)
```sql
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
    b.id AS building_id,
    b.code AS building_code,
    b.name AS building_name,
    COUNT(r.id) AS total_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'AVAILABLE' THEN 1 ELSE 0 END), 0) AS available_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END), 0) AS occupied_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'MAINTENANCE' THEN 1 ELSE 0 END), 0) AS maintenance_rooms,
    ROUND(CASE WHEN COUNT(r.id) > 0 THEN (SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END) / COUNT(r.id)) * 100 ELSE 0 END, 2) AS occupancy_rate
FROM buildings b
LEFT JOIN rooms r ON b.id = r.building_id
GROUP BY b.id, b.code, b.name, b.floors, b.status;
```
*Examiner Explanation*: Computes real-time occupancy rates directly at the database level. Clustered grouping prevents expensive dynamic calculation inside Python.
