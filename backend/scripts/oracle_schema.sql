-- =====================================================================
-- CampusPulse — Smart Campus Digital Twin
-- Database Dialect: Oracle 21c SQL / PL/SQL
-- User / Schema: campuspulse@XEPDB1
-- =====================================================================

-- 1. Oracle Compound Trigger for Conflict-Free Room Scheduling
-- Uses COMPOUND TRIGGER to prevent ORA-04091 mutating table error
CREATE OR REPLACE TRIGGER trg_no_overlapping_bookings
FOR INSERT OR UPDATE ON bookings
COMPOUND TRIGGER

   TYPE t_booking_rec IS RECORD (
      room_id NUMBER,
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      status VARCHAR2(30),
      id NUMBER
   );
   TYPE t_booking_list IS TABLE OF t_booking_rec;
   g_bookings t_booking_list := t_booking_list();

   BEFORE STATEMENT IS
   BEGIN
      g_bookings.DELETE;
   END BEFORE STATEMENT;

   BEFORE EACH ROW IS
   BEGIN
      IF :NEW.status = 'CONFIRMED' THEN
         g_bookings.EXTEND;
         g_bookings(g_bookings.LAST).room_id := :NEW.room_id;
         g_bookings(g_bookings.LAST).start_time := :NEW.start_time;
         g_bookings(g_bookings.LAST).end_time := :NEW.end_time;
         g_bookings(g_bookings.LAST).status := :NEW.status;
         g_bookings(g_bookings.LAST).id := NVL(:NEW.id, -1);
      END IF;
   END BEFORE EACH ROW;

   AFTER STATEMENT IS
      v_conflict_count NUMBER := 0;
   BEGIN
      FOR i IN 1 .. g_bookings.COUNT LOOP
         SELECT COUNT(*)
         INTO v_conflict_count
         FROM bookings b
         WHERE b.room_id = g_bookings(i).room_id
           AND b.status = 'CONFIRMED'
           AND b.id != g_bookings(i).id
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

-- 2. Oracle View: v_dashboard_summary
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT 
    b.id AS building_id,
    b.code AS building_code,
    b.name AS building_name,
    b.floors,
    b.status AS building_status,
    COUNT(r.id) AS total_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'AVAILABLE' THEN 1 ELSE 0 END), 0) AS available_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END), 0) AS occupied_rooms,
    COALESCE(SUM(CASE WHEN r.status = 'MAINTENANCE' THEN 1 ELSE 0 END), 0) AS maintenance_rooms,
    ROUND(
        CASE 
            WHEN COUNT(r.id) > 0 THEN (SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END) / COUNT(r.id)) * 100 
            ELSE 0 
        END, 2
    ) AS occupancy_rate
FROM buildings b
LEFT JOIN rooms r ON b.id = r.building_id
GROUP BY b.id, b.code, b.name, b.floors, b.status;

-- 3. Oracle View: v_room_live_status
CREATE OR REPLACE VIEW v_room_live_status AS
SELECT 
    r.id AS room_id,
    r.room_number,
    r.floor,
    r.capacity,
    r.room_type,
    r.status AS configured_status,
    r.has_projector,
    r.has_ac,
    b.id AS building_id,
    b.code AS building_code,
    b.name AS building_name,
    bk.id AS active_booking_id,
    bk.title AS active_booking_title,
    bk.start_time AS active_booking_start,
    bk.end_time AS active_booking_end,
    mt.id AS open_ticket_id,
    mt.title AS open_ticket_title,
    mt.priority AS open_ticket_priority
FROM rooms r
JOIN buildings b ON r.building_id = b.id
LEFT JOIN bookings bk ON r.id = bk.room_id 
    AND bk.status = 'CONFIRMED' 
    AND CURRENT_TIMESTAMP BETWEEN bk.start_time AND bk.end_time
LEFT JOIN maintenance_tickets mt ON r.id = mt.room_id 
    AND mt.status IN ('OPEN', 'IN_PROGRESS');

-- 4. Additional Oracle Performance Indexes
BEGIN
   EXECUTE IMMEDIATE 'CREATE INDEX idx_rooms_bld_status ON rooms(building_id, status)';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
   EXECUTE IMMEDIATE 'CREATE INDEX idx_bk_room_time ON bookings(room_id, start_time, end_time)';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
   EXECUTE IMMEDIATE 'CREATE INDEX idx_mt_status_pri ON maintenance_tickets(status, priority)';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

EXIT;
