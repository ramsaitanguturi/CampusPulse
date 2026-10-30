-- =====================================================================
-- CampusPulse — Smart Campus Digital Twin
-- DBMS Semester Project: SQL Query Demonstration Collection
-- Database Dialect: Oracle 21c SQL / PL/SQL
-- User / Schema: campuspulse@XEPDB1
--
-- This script contains 20 comprehensive, production-grade SQL demonstrations
-- covering all required DBMS syllabus concepts on the actual CampusPulse schema.
-- =====================================================================

SET SERVEROUTPUT ON;
SET DEFINE OFF;
SET PAGESIZE 100;
SET LINESIZE 200;
WHENEVER SQLERROR CONTINUE;

PROMPT =====================================================================
PROMPT [Query 1] SELECT AND WHERE CLAUSE
PROMPT Concept: Basic projection and predicate filtering on scalar attributes.
PROMPT Purpose: Retrieve high-capacity classrooms suitable for large lectures.
PROMPT =====================================================================
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

PROMPT =====================================================================
PROMPT [Query 2] ORDER BY WITH MULTI-LEVEL SORTING
PROMPT Concept: Deterministic sorting with ascending/descending hierarchical keys.
PROMPT Purpose: List campus users grouped alphabetically by department and name.
PROMPT =====================================================================
SELECT 
    id, 
    name, 
    email, 
    role, 
    department 
FROM users 
WHERE department IS NOT NULL 
ORDER BY department ASC, name ASC;

PROMPT =====================================================================
PROMPT [Query 3] DISTINCT OPERATOR
PROMPT Concept: Elimination of duplicate projection values across relational rows.
PROMPT Purpose: Identify distinct event categories hosted across campus.
PROMPT =====================================================================
SELECT DISTINCT 
    category 
FROM events 
ORDER BY category ASC;

PROMPT =====================================================================
PROMPT [Query 4] INNER JOIN
PROMPT Concept: Equi-join on primary/foreign key relations (Rooms <-> Buildings).
PROMPT Purpose: Retrieve rooms along with their parent building metadata.
PROMPT =====================================================================
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

PROMPT =====================================================================
PROMPT [Query 5] LEFT OUTER JOIN
PROMPT Concept: Preservation of all outer relation rows (Buildings with zero/many rooms).
PROMPT Purpose: Display all buildings, including any without active rooms.
PROMPT =====================================================================
SELECT 
    b.code AS building_code,
    b.name AS building_name,
    COUNT(r.id) AS total_rooms,
    COALESCE(SUM(r.capacity), 0) AS total_building_capacity
FROM buildings b
LEFT JOIN rooms r ON b.id = r.building_id
GROUP BY b.code, b.name
ORDER BY total_building_capacity DESC;

PROMPT =====================================================================
PROMPT [Query 6] RIGHT OUTER JOIN
PROMPT Concept: Right-side outer preservation matching users to reported tickets.
PROMPT Purpose: Identify all registered users and whether they have submitted tickets.
PROMPT =====================================================================
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.role,
    COUNT(mt.id) AS tickets_reported
FROM maintenance_tickets mt
RIGHT JOIN users u ON mt.user_id = u.id
GROUP BY u.id, u.name, u.role
ORDER BY tickets_reported DESC, u.name ASC;

PROMPT =====================================================================
PROMPT [Query 7] MULTIPLE-TABLE 4-WAY JOIN
PROMPT Concept: Associative joining across 4 relations: Bookings, Rooms, Buildings, Users.
PROMPT Purpose: Comprehensive audit of active reservations with spatial and organizer context.
PROMPT =====================================================================
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

PROMPT =====================================================================
PROMPT [Query 8] AGGREGATE FUNCTIONS (COUNT, SUM, AVG, MIN, MAX)
PROMPT Concept: Statistical summarization over domain populations.
PROMPT Purpose: Compute campus-wide capacity distribution metrics.
PROMPT =====================================================================
SELECT 
    COUNT(id) AS total_room_count,
    SUM(capacity) AS cumulative_campus_capacity,
    ROUND(AVG(capacity), 2) AS average_room_capacity,
    MIN(capacity) AS smallest_room_capacity,
    MAX(capacity) AS largest_room_capacity
FROM rooms;

PROMPT =====================================================================
PROMPT [Query 9] GROUP BY AND HAVING CLAUSES
PROMPT Concept: Partition aggregation filtered by post-grouping predicate.
PROMPT Purpose: Identify high-density buildings with total capacity exceeding 100.
PROMPT =====================================================================
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

PROMPT =====================================================================
PROMPT [Query 10] NESTED SUBQUERY (IN-CLAUSE / NON-CORRELATED)
PROMPT Concept: Independent subquery evaluated once to filter the outer query.
PROMPT Purpose: Find all rooms currently experiencing open or in-progress tickets.
PROMPT =====================================================================
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

PROMPT =====================================================================
PROMPT [Query 11] CORRELATED SUBQUERY
PROMPT Concept: Inner subquery dependent on current row value from outer query.
PROMPT Purpose: Find rooms whose capacity exceeds the average capacity of their building.
PROMPT =====================================================================
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

PROMPT =====================================================================
PROMPT [Query 12] EXISTS AND NOT EXISTS OPERATORS
PROMPT Concept: Boolean semi-join predicate testing set cardinality.
PROMPT Purpose: Find rooms with NO conflicting confirmed bookings (Available Now).
PROMPT =====================================================================
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

PROMPT =====================================================================
PROMPT [Query 13] DML OPERATIONS: INSERT, UPDATE, DELETE WITH TRANSACTION
PROMPT Concept: Relational modification statements demonstrating state transition.
PROMPT Purpose: Safely insert a test ticket, update its priority, and remove it.
PROMPT =====================================================================
-- Insert temporary ticket
INSERT INTO maintenance_tickets (room_id, user_id, title, description, priority, status)
VALUES (
    (SELECT MIN(id) FROM rooms),
    (SELECT MIN(id) FROM users),
    'Demo DML Inspection Ticket',
    'Routine verification of HVAC filter integrity.',
    'LOW',
    'OPEN'
);

-- Update priority
UPDATE maintenance_tickets 
SET priority = 'MEDIUM'
WHERE title = 'Demo DML Inspection Ticket';

-- Delete test ticket
DELETE FROM maintenance_tickets 
WHERE title = 'Demo DML Inspection Ticket';

COMMIT;

PROMPT =====================================================================
PROMPT [Query 14] SQL VIEW QUERY
PROMPT Concept: Querying stored relational view abstraction (v_dashboard_summary).
PROMPT Purpose: Retrieve pre-compiled occupancy rate and status metrics.
PROMPT =====================================================================
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

PROMPT =====================================================================
PROMPT [Query 15] INDEX USAGE AND EXPLAIN PLAN
PROMPT Concept: Query optimizer execution plan verification using B-Tree index.
PROMPT Purpose: Verify index idx_bk_room_time accelerates booking window scans.
PROMPT =====================================================================
EXPLAIN PLAN FOR
SELECT id, title, status 
FROM bookings 
WHERE room_id = 26 
  AND start_time >= TIMESTAMP '2026-11-01 00:00:00 +00:00'
  AND end_time <= TIMESTAMP '2026-11-02 00:00:00 +00:00';

SELECT PLAN_TABLE_OUTPUT 
FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', NULL, 'BASIC'));

PROMPT =====================================================================
PROMPT [Query 16] TRANSACTION COMMIT AND ROLLBACK (ACID ATOMICITY)
PROMPT Concept: Transaction demarcation demonstrating rollback on violation.
PROMPT Purpose: Verify uncommitted state is completely undone upon ROLLBACK.
PROMPT =====================================================================
-- Savepoint demonstration
SAVEPOINT sp_before_dml;

INSERT INTO users (name, email, role, department)
VALUES ('Temporary Test User', 'temp_demo@univ.edu', 'STUDENT', 'Robotics');

-- Verify record is visible within current transaction
SELECT COUNT(*) AS uncommitted_count FROM users WHERE email = 'temp_demo@univ.edu';

-- Roll back to savepoint
ROLLBACK TO sp_before_dml;

-- Verify record is completely gone
SELECT COUNT(*) AS post_rollback_count FROM users WHERE email = 'temp_demo@univ.edu';

COMMIT;

PROMPT =====================================================================
PROMPT [Query 17] PL/SQL TRIGGER VERIFICATION
PROMPT Concept: Execution of compound trigger enforcing half-open interval safety.
PROMPT Purpose: Demonstrate ORA-20001 rejection upon overlapping booking attempt.
PROMPT =====================================================================
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

    -- Rollback demo inserts to keep dataset clean
    ROLLBACK;
END;
/

PROMPT =====================================================================
PROMPT [Query 18] SCHEMA INTEGRITY CONSTRAINTS AUDIT
PROMPT Concept: Querying Oracle Data Dictionary (USER_CONSTRAINTS) for active rules.
PROMPT Purpose: Document primary keys, foreign keys, unique keys, and check rules.
PROMPT =====================================================================
SELECT 
    table_name,
    constraint_type,
    constraint_name,
    status
FROM user_constraints
WHERE table_name IN ('USERS', 'BUILDINGS', 'ROOMS', 'BOOKINGS', 'MAINTENANCE_TICKETS', 'EVENTS')
ORDER BY table_name, constraint_type, constraint_name;

PROMPT =====================================================================
PROMPT [Query 19] DATE AND TIME INTERVAL ARITHMETIC
PROMPT Concept: Oracle TIMESTAMP arithmetic, interval additions, and time grouping.
PROMPT Purpose: Calculate duration in hours for completed and confirmed sessions.
PROMPT =====================================================================
SELECT 
    id AS booking_id,
    title,
    TO_CHAR(start_time, 'YYYY-MM-DD HH24:MI') AS start_formatted,
    TO_CHAR(end_time, 'YYYY-MM-DD HH24:MI') AS end_formatted,
    ROUND((CAST(end_time AS DATE) - CAST(start_time AS DATE)) * 24, 2) AS duration_hours
FROM bookings
WHERE status = 'CONFIRMED'
FETCH FIRST 10 ROWS ONLY;

PROMPT =====================================================================
PROMPT [Query 20] PARAMETRIC ROOM AVAILABILITY SEARCH
PROMPT Concept: Correlated availability query matching desired interval & capacity.
PROMPT Purpose: Search rooms available for 2-hour window next week with capacity >= 30.
PROMPT =====================================================================
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

EXIT;
