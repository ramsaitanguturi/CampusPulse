-- =====================================================================
-- CampusPulse — Smart Campus Digital Twin
-- Comprehensive DBMS Semester Project Schema
-- Database Dialect: PostgreSQL-Specific DDL (Not Oracle-Compatible)
-- Note: Uses PostgreSQL extensions (btree_gist) and exclusion constraints (EXCLUDE USING gist).
-- For Oracle Database 21c authoritative schema, use oracle_schema.sql.
-- =====================================================================
-- WARNING: DESTRUCTIVE DDL SCRIPT - DROPS EXISTING TABLES AND VIEWS
-- Executing this script drops views and tables (CASCADE) permanently deleting all data.
-- BACKUP INSTRUCTIONS:
-- Prior to running, back up your database using pg_dump:
--     pg_dump -U postgres -d campuspulse -f campuspulse_pg_backup.sql
-- CONFIRMATION REQUIREMENT:
-- Run only if you intend to wipe existing tables and reinitialize from scratch.
-- =====================================================================

-- 1. Enable btree_gist for multi-column range exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Drop existing views and tables if rebuilding
DROP VIEW IF EXISTS v_room_live_status CASCADE;
DROP VIEW IF EXISTS v_dashboard_summary CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS maintenance_tickets CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================================
-- TABLE: users
-- =====================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'STUDENT',
    department VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (role IN ('STUDENT', 'FACULTY', 'ADMIN', 'STAFF'))
);

-- =====================================================================
-- TABLE: buildings
-- =====================================================================
CREATE TABLE buildings (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    floors INTEGER NOT NULL DEFAULT 4,
    map_x DOUBLE PRECISION NOT NULL,
    map_y DOUBLE PRECISION NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_building_status CHECK (status IN ('OPERATIONAL', 'PARTIAL', 'MAINTENANCE'))
);

-- =====================================================================
-- TABLE: rooms
-- =====================================================================
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    capacity INTEGER NOT NULL,
    room_type VARCHAR(30) NOT NULL DEFAULT 'CLASSROOM',
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    has_projector BOOLEAN NOT NULL DEFAULT TRUE,
    has_ac BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_room_capacity_positive CHECK (capacity > 0),
    CONSTRAINT chk_room_status CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE')),
    CONSTRAINT chk_room_type CHECK (room_type IN ('CLASSROOM', 'LAB', 'AUDITORIUM', 'CONFERENCE', 'STUDY_POD')),
    CONSTRAINT uq_building_room_number UNIQUE (building_id, room_number)
);

-- =====================================================================
-- TABLE: bookings
-- Includes PostgreSQL Exclusion Constraint to mathematically prevent
-- overlapping bookings for the same room at the DBMS engine level!
-- =====================================================================
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_booking_times_valid CHECK (end_time > start_time),
    CONSTRAINT chk_booking_status CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
    -- EXCLUSION CONSTRAINT: Enforces conflict-free room bookings at the SQL engine level
    CONSTRAINT no_overlapping_bookings 
        EXCLUDE USING gist (room_id WITH =, tstzrange(start_time, end_time) WITH &&)
        WHERE (status = 'CONFIRMED')
);

-- =====================================================================
-- TABLE: maintenance_tickets
-- =====================================================================
CREATE TABLE maintenance_tickets (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_ticket_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_ticket_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED'))
);

-- =====================================================================
-- TABLE: events
-- =====================================================================
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'ACADEMIC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_event_times_valid CHECK (end_time > start_time),
    CONSTRAINT chk_event_category CHECK (category IN ('ACADEMIC', 'TECH', 'WORKSHOP', 'CULTURAL', 'ATHLETIC'))
);

-- =====================================================================
-- PERFORMANCE INDEXES
-- =====================================================================
CREATE INDEX idx_rooms_building_status ON rooms(building_id, status);
CREATE INDEX idx_bookings_room_time ON bookings(room_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_tickets_room_status ON maintenance_tickets(room_id, status);
CREATE INDEX idx_tickets_priority ON maintenance_tickets(priority);
CREATE INDEX idx_events_start_time ON events(start_time);

-- =====================================================================
-- DBMS VIEWS FOR ANALYTICS AND DASHBOARD
-- =====================================================================

-- View 1: Building Summary View with Room Counts & Occupancy Rate
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
            WHEN COUNT(r.id) > 0 THEN (SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END)::NUMERIC / COUNT(r.id)::NUMERIC) * 100 
            ELSE 0 
        END, 2
    ) AS occupancy_rate
FROM buildings b
LEFT JOIN rooms r ON b.id = r.building_id
GROUP BY b.id, b.code, b.name, b.floors, b.status;

-- View 2: Room Live Status View (Joins Building, Active Booking, and Active Maintenance)
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
