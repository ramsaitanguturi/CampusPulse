import os
import sys
import shutil
import subprocess
import logging
from datetime import datetime, timedelta, timezone

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.config import settings, mask_database_url
from app.database import engine, SessionLocal, Base
from app.models.entities import User, Building, Room, Booking, MaintenanceTicket, Event

logger = logging.getLogger("campuspulse.init_db")
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

# SQL DDL for SQLite Views
SQLITE_VIEWS_DDL = """
CREATE VIEW IF NOT EXISTS v_dashboard_summary AS
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
            WHEN COUNT(r.id) > 0 THEN (CAST(SUM(CASE WHEN r.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(r.id)) * 100 
            ELSE 0 
        END, 2
    ) AS occupancy_rate
FROM buildings b
LEFT JOIN rooms r ON b.id = r.building_id
GROUP BY b.id, b.code, b.name, b.floors, b.status;

CREATE VIEW IF NOT EXISTS v_room_live_status AS
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
"""

ORACLE_TRIGGER_DDL = """
CREATE OR REPLACE TRIGGER trg_no_overlapping_bookings
FOR INSERT OR UPDATE ON bookings
COMPOUND TRIGGER

   TYPE t_booking_rec IS RECORD (
      room_id    bookings.room_id%TYPE,
      start_time bookings.start_time%TYPE,
      end_time   bookings.end_time%TYPE,
      status     bookings.status%TYPE,
      id         bookings.id%TYPE
   );
   TYPE t_booking_list IS TABLE OF t_booking_rec;
   g_bookings t_booking_list := t_booking_list();

   BEFORE STATEMENT IS
   BEGIN
      g_bookings.DELETE;
   END BEFORE STATEMENT;

   AFTER EACH ROW IS
   BEGIN
      IF :NEW.status = 'CONFIRMED' THEN
         g_bookings.EXTEND;
         g_bookings(g_bookings.LAST).room_id := :NEW.room_id;
         g_bookings(g_bookings.LAST).start_time := :NEW.start_time;
         g_bookings(g_bookings.LAST).end_time := :NEW.end_time;
         g_bookings(g_bookings.LAST).status := :NEW.status;
         g_bookings(g_bookings.LAST).id := :NEW.id;
      END IF;
   END AFTER EACH ROW;

   AFTER STATEMENT IS
      v_conflict_count NUMBER := 0;
   BEGIN
      FOR i IN 1 .. g_bookings.COUNT LOOP
         SELECT COUNT(*)
         INTO v_conflict_count
         FROM bookings b
         WHERE b.room_id = g_bookings(i).room_id
           AND b.status = 'CONFIRMED'
           AND (b.id != g_bookings(i).id OR g_bookings(i).id IS NULL)
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
"""

ORACLE_VIEWS_DDL = [
    """
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
    GROUP BY b.id, b.code, b.name, b.floors, b.status
    """,
    """
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
        AND mt.status IN ('OPEN', 'IN_PROGRESS')
    """
]

ORACLE_INDEXES_DDL = [
    "CREATE INDEX idx_rooms_bld_status ON rooms(building_id, status)",
    "CREATE INDEX idx_bk_room_time ON bookings(room_id, start_time, end_time)",
    "CREATE INDEX idx_bk_user_id ON bookings(user_id)",
    "CREATE INDEX idx_mt_status_pri ON maintenance_tickets(status, priority)",
    "CREATE INDEX idx_mt_room_id ON maintenance_tickets(room_id)",
    "CREATE INDEX idx_mt_user_id ON maintenance_tickets(user_id)",
    "CREATE INDEX idx_events_start ON events(start_time)",
    "CREATE INDEX idx_events_bld_room ON events(building_id, room_id)",
]

def init_database(use_sqlplus: bool = False):
    print("=" * 65)
    print(" CampusPulse — Database Initialization & Verification ")
    print("=" * 65)

    db_url = str(engine.url)
    masked_url = mask_database_url(db_url)
    is_oracle = "oracle" in db_url
    is_postgres = "postgresql" in db_url
    is_sqlite = "sqlite" in db_url

    dialect_label = (
        "Oracle Database 21c (python-oracledb)" if is_oracle 
        else "PostgreSQL (psycopg)" if is_postgres 
        else "SQLite (Test / Offline Mode)"
    )
    print(f"[*] Target Dialect : {dialect_label}")
    print(f"[*] Target Endpoint: {masked_url}")

    # Phase 1: Connection Verification
    print("\n--- [Phase 1: Database Connectivity Check] ---")
    try:
        ping_sql = "SELECT 1 FROM dual" if is_oracle else "SELECT 1"
        with engine.connect() as conn:
            conn.execute(text(ping_sql))
        print("[SUCCESS] Database connection established.")
    except Exception as e:
        print(f"[FAILED] Could not connect to database ({masked_url}): {e}")
        sys.exit(1)

    # Phase 2: Schema / Table Creation
    print("\n--- [Phase 2: Relational Tables Creation] ---")
    try:
        if is_postgres:
            schema_file = os.path.join(os.path.dirname(__file__), "schema.sql")
            with open(schema_file, "r", encoding="utf-8") as f:
                schema_sql = f.read()
            with engine.begin() as conn:
                conn.execute(text(schema_sql))
            print("[SUCCESS] PostgreSQL DDL executed.")
        else:
            # Oracle and SQLite: Use SQLAlchemy declarative metadata
            Base.metadata.create_all(bind=engine)
            print("[SUCCESS] Base tables and constraints created via metadata.")
    except Exception as e:
        print(f"[FAILED] Relational tables creation failed: {e}")
        sys.exit(1)

    # Phase 3: Post-Schema Objects (Triggers, Views, Indexes)
    print("\n--- [Phase 3: Post-Schema Objects (Views, Triggers, Indexes)] ---")
    try:
        if is_oracle:
            if use_sqlplus:
                sqlplus_bin = shutil.which("sqlplus")
                if not sqlplus_bin:
                    raise FileNotFoundError("sqlplus executable not found in system PATH.")
                
                # Extract credentials from engine.url
                user = engine.url.username
                password = engine.url.password
                host = engine.url.host or "localhost"
                port = engine.url.port or 1521
                service = engine.url.query.get("service_name", "XEPDB1")
                conn_str = f"{user}/{password}@{host}:{port}/{service}"
                oracle_schema_file = os.path.join(os.path.dirname(__file__), "oracle_schema.sql")

                print(f"[*] Executing SQL*Plus with script: {oracle_schema_file}")
                res = subprocess.run(
                    [sqlplus_bin, "-S", "-L", conn_str, f"@{oracle_schema_file}"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                if res.returncode != 0:
                    print(f"[FAILED] SQL*Plus exited with returncode {res.returncode}")
                    print("STDOUT:", res.stdout)
                    print("STDERR:", res.stderr)
                    sys.exit(res.returncode)
                print("[SUCCESS] Oracle schema compiled successfully via SQL*Plus.")
            else:
                # Compile directly via connection
                with engine.begin() as conn:
                    # 1. Views
                    for view_sql in ORACLE_VIEWS_DDL:
                        conn.execute(text(view_sql.strip()))
                    print("[*] Oracle views created (v_dashboard_summary, v_room_live_status).")

                    # 2. Trigger
                    raw_conn = conn.connection
                    cursor = raw_conn.cursor()
                    cursor.execute(ORACLE_TRIGGER_DDL.strip())
                    cursor.close()
                    print("[*] Oracle compound trigger compiled (trg_no_overlapping_bookings).")

                    # 3. Indexes
                    for idx_sql in ORACLE_INDEXES_DDL:
                        try:
                            conn.execute(text(idx_sql.strip()))
                        except Exception as ie:
                            # ORA-00955: name already used; ORA-01408: such column list already indexed
                            err_str = str(ie)
                            if "ORA-00955" not in err_str and "ORA-01408" not in err_str:
                                raise
                    print("[*] Oracle performance indexes created.")
                print("[SUCCESS] All Oracle schema objects compiled and verified.")

        elif is_sqlite:
            with engine.begin() as conn:
                for statement in SQLITE_VIEWS_DDL.strip().split(";"):
                    stmt = statement.strip()
                    if stmt:
                        conn.execute(text(stmt))
            print("[SUCCESS] SQLite views created (v_dashboard_summary, v_room_live_status).")

    except Exception as e:
        print(f"[FAILED] Post-schema objects creation failed: {e}")
        sys.exit(1)

    # Phase 4: Idempotent Seed Data Population
    print("\n--- [Phase 4: Sample Data Seeding] ---")
    db = SessionLocal()
    try:
        # Check if buildings already exist
        existing_buildings = db.query(Building).count()
        if existing_buildings >= 4:
            print(f"[*] Database already populated with {existing_buildings} buildings. Skipping duplicate seed.")
            return

        print("[*] Seeding 5 Campus Buildings...")
        buildings = [
            Building(
                code="ENG",
                name="Engineering & Robotics Complex",
                floors=5,
                map_x=22.0,
                map_y=30.0,
                description="State-of-the-art engineering center with advanced robotics labs and mechatronics bays.",
                status="OPERATIONAL"
            ),
            Building(
                code="TURING",
                name="Turing Computing & AI Hub",
                floors=6,
                map_x=45.0,
                map_y=25.0,
                description="Flagship computing sciences facility housing supercomputing clusters and AI research pods.",
                status="OPERATIONAL"
            ),
            Building(
                code="SCI",
                name="Science & Nanotechnology Pavilion",
                floors=4,
                map_x=72.0,
                map_y=35.0,
                description="Interdisciplinary science center featuring clean rooms and physics laboratories.",
                status="PARTIAL"
            ),
            Building(
                code="LIB",
                name="Alexandria Central Library & Tech Center",
                floors=4,
                map_x=32.0,
                map_y=68.0,
                description="Central academic repository with 24/7 collaborative digital study suites and archive halls.",
                status="OPERATIONAL"
            ),
            Building(
                code="STU",
                name="Student Senate & Innovation Pavilion",
                floors=3,
                map_x=65.0,
                map_y=70.0,
                description="Hub for student governance, entrepreneurship incubators, and campus events.",
                status="OPERATIONAL"
            ),
        ]
        db.add_all(buildings)
        db.flush()

        b_map = {b.code: b.id for b in buildings}

        print("[*] Seeding 10 Campus Users...")
        users = [
            User(name="Dr. Evelyn Reed", email="evelyn.reed@campuspulse.edu", role="FACULTY", department="Computer Science"),
            User(name="Prof. Marcus Vance", email="marcus.vance@campuspulse.edu", role="FACULTY", department="Electrical Engineering"),
            User(name="Sarah Jenkins", email="sarah.jenkins@campuspulse.edu", role="STUDENT", department="Robotics"),
            User(name="Alex Chen", email="alex.chen@campuspulse.edu", role="STUDENT", department="Artificial Intelligence"),
            User(name="Elena Rostova", email="elena.rostova@campuspulse.edu", role="STAFF", department="Facilities & Operations"),
            User(name="David Miller", email="david.miller@campuspulse.edu", role="ADMIN", department="Campus Registrar"),
            User(name="Priya Sharma", email="priya.sharma@campuspulse.edu", role="STUDENT", department="Software Engineering"),
            User(name="Dr. James O'Connor", email="james.oconnor@campuspulse.edu", role="FACULTY", department="Applied Physics"),
            User(name="Dr. Maya Patel", email="maya.patel@campuspulse.edu", role="FACULTY", department="Bioengineering"),
            User(name="Liam Gallagher", email="liam.gallagher@campuspulse.edu", role="STUDENT", department="Digital Media"),
        ]
        db.add_all(users)
        db.flush()

        u_map = {u.name: u.id for u in users}

        print("[*] Seeding 25 Campus Rooms...")
        rooms_data = [
            # ENG Building
            {"b": "ENG", "num": "101", "floor": 1, "cap": 60, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "ENG", "num": "105", "floor": 1, "cap": 30, "type": "LAB", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "ENG", "num": "201", "floor": 2, "cap": 120, "type": "AUDITORIUM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "ENG", "num": "208", "floor": 2, "cap": 25, "type": "LAB", "status": "MAINTENANCE", "proj": False, "ac": True},
            {"b": "ENG", "num": "304", "floor": 3, "cap": 16, "type": "CONFERENCE", "status": "AVAILABLE", "proj": True, "ac": True},

            # TURING Building
            {"b": "TURING", "num": "101", "floor": 1, "cap": 180, "type": "AUDITORIUM", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "TURING", "num": "102", "floor": 1, "cap": 50, "type": "LAB", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "TURING", "num": "205", "floor": 2, "cap": 40, "type": "LAB", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "TURING", "num": "210", "floor": 2, "cap": 75, "type": "CLASSROOM", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "TURING", "num": "301", "floor": 3, "cap": 20, "type": "CONFERENCE", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "TURING", "num": "402", "floor": 4, "cap": 8, "type": "STUDY_POD", "status": "AVAILABLE", "proj": False, "ac": True},

            # SCI Building
            {"b": "SCI", "num": "101", "floor": 1, "cap": 90, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "SCI", "num": "104", "floor": 1, "cap": 35, "type": "LAB", "status": "MAINTENANCE", "proj": True, "ac": False},
            {"b": "SCI", "num": "202", "floor": 2, "cap": 45, "type": "CLASSROOM", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "SCI", "num": "305", "floor": 3, "cap": 14, "type": "CONFERENCE", "status": "AVAILABLE", "proj": True, "ac": True},

            # LIB Building
            {"b": "LIB", "num": "101", "floor": 1, "cap": 200, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "LIB", "num": "201", "floor": 2, "cap": 12, "type": "STUDY_POD", "status": "OCCUPIED", "proj": False, "ac": True},
            {"b": "LIB", "num": "202", "floor": 2, "cap": 12, "type": "STUDY_POD", "status": "AVAILABLE", "proj": False, "ac": True},
            {"b": "LIB", "num": "203", "floor": 2, "cap": 10, "type": "STUDY_POD", "status": "MAINTENANCE", "proj": False, "ac": True},
            {"b": "LIB", "num": "301", "floor": 3, "cap": 24, "type": "CONFERENCE", "status": "AVAILABLE", "proj": True, "ac": True},

            # STU Building
            {"b": "STU", "num": "101", "floor": 1, "cap": 250, "type": "AUDITORIUM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "STU", "num": "104", "floor": 1, "cap": 40, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "STU", "num": "201", "floor": 2, "cap": 30, "type": "CONFERENCE", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "STU", "num": "205", "floor": 2, "cap": 16, "type": "STUDY_POD", "status": "AVAILABLE", "proj": False, "ac": True},
            {"b": "STU", "num": "301", "floor": 3, "cap": 50, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
        ]

        rooms = []
        for r in rooms_data:
            rooms.append(Room(
                building_id=b_map[r["b"]],
                room_number=r["num"],
                floor=r["floor"],
                capacity=r["cap"],
                room_type=r["type"],
                status=r["status"],
                has_projector=r["proj"],
                has_ac=r["ac"],
            ))
        db.add_all(rooms)
        db.flush()

        r_map = {(r.building_id, r.room_number): r.id for r in rooms}
        def get_rid(b_code, num):
            return r_map[(b_map[b_code], num)]

        print("[*] Seeding 12 Campus Bookings...")
        now = datetime.now(timezone.utc)
        bookings = [
            Booking(
                room_id=get_rid("ENG", "105"),
                user_id=u_map["Sarah Jenkins"],
                title="Robotics Sensor Array Calibration",
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=2),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("TURING", "101"),
                user_id=u_map["Dr. Evelyn Reed"],
                title="Advanced Distributed Algorithms Lecture",
                start_time=now - timedelta(minutes=30),
                end_time=now + timedelta(hours=1, minutes=30),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("TURING", "210"),
                user_id=u_map["Alex Chen"],
                title="Deep Learning Club Weekly Seminar",
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=1),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("SCI", "202"),
                user_id=u_map["Dr. James O'Connor"],
                title="Quantum Optics Lab Discussion",
                start_time=now - timedelta(minutes=45),
                end_time=now + timedelta(hours=1, minutes=15),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("LIB", "201"),
                user_id=u_map["Priya Sharma"],
                title="Distributed Systems Senior Capstone Sync",
                start_time=now - timedelta(minutes=20),
                end_time=now + timedelta(hours=1, minutes=40),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("STU", "201"),
                user_id=u_map["David Miller"],
                title="Academic Senate Steering Committee",
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=2),
                status="CONFIRMED"
            ),
            # Upcoming bookings
            Booking(
                room_id=get_rid("ENG", "201"),
                user_id=u_map["Prof. Marcus Vance"],
                title="Microgrid Energy Systems Colloquium",
                start_time=now + timedelta(hours=3),
                end_time=now + timedelta(hours=5),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("TURING", "102"),
                user_id=u_map["Dr. Evelyn Reed"],
                title="Operating Systems Lab Session",
                start_time=now + timedelta(hours=4),
                end_time=now + timedelta(hours=6),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("LIB", "301"),
                user_id=u_map["Dr. Maya Patel"],
                title="Bioinformatics Research Group Meeting",
                start_time=now + timedelta(days=1, hours=2),
                end_time=now + timedelta(days=1, hours=4),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("STU", "101"),
                user_id=u_map["Liam Gallagher"],
                title="Campus Pulse Film Festival Screening",
                start_time=now + timedelta(days=2, hours=3),
                end_time=now + timedelta(days=2, hours=7),
                status="CONFIRMED"
            ),
            # Completed & Cancelled past bookings
            Booking(
                room_id=get_rid("ENG", "101"),
                user_id=u_map["Sarah Jenkins"],
                title="Autonomous Drones Team Huddle",
                start_time=now - timedelta(days=1, hours=3),
                end_time=now - timedelta(days=1, hours=1),
                status="COMPLETED"
            ),
            Booking(
                room_id=get_rid("TURING", "301"),
                user_id=u_map["Alex Chen"],
                title="Hackathon Steering Committee Prep",
                start_time=now - timedelta(days=2, hours=2),
                end_time=now - timedelta(days=2, hours=1),
                status="CANCELLED"
            ),
        ]
        db.add_all(bookings)

        print("[*] Seeding 6 Maintenance Tickets...")
        tickets = [
            MaintenanceTicket(
                room_id=get_rid("ENG", "208"),
                user_id=u_map["Elena Rostova"],
                title="Laser Cutter Exhaust Fan Intermittent",
                description="Exhaust airflow sensor triggers safety shutdown during high-speed cutting. Requires ventilation filter replacement.",
                priority="HIGH",
                status="OPEN",
                reported_at=now - timedelta(hours=14)
            ),
            MaintenanceTicket(
                room_id=get_rid("SCI", "104"),
                user_id=u_map["Dr. James O'Connor"],
                title="HVAC Airflow Balancing Fault",
                description="Zone temperature fluctuating by 8 degrees Celsius above setpoint. Clean-room protocol compromised.",
                priority="CRITICAL",
                status="IN_PROGRESS",
                reported_at=now - timedelta(hours=36)
            ),
            MaintenanceTicket(
                room_id=get_rid("LIB", "203"),
                user_id=u_map["Elena Rostova"],
                title="Smart Glass Transparency Panel Power Failure",
                description="Pod privacy electrochromic glass failed in opaque state. Driver board needs fuse inspection.",
                priority="MEDIUM",
                status="OPEN",
                reported_at=now - timedelta(hours=6)
            ),
            MaintenanceTicket(
                room_id=get_rid("TURING", "101"),
                user_id=u_map["Dr. Evelyn Reed"],
                title="Auditorium Wireless Mic Interference",
                description="Channel 4 wireless lavalier mic experiencing 5GHz RF dropouts during large lectures.",
                priority="LOW",
                status="IN_PROGRESS",
                reported_at=now - timedelta(days=2)
            ),
            MaintenanceTicket(
                room_id=get_rid("STU", "104"),
                user_id=u_map["Liam Gallagher"],
                title="Overhead 4K Projector HDMI Port Damaged",
                description="Wall plate HDMI connector loose. Replaced with gold-plated pass-through block.",
                priority="MEDIUM",
                status="RESOLVED",
                reported_at=now - timedelta(days=5),
                resolved_at=now - timedelta(days=1)
            ),
            MaintenanceTicket(
                room_id=get_rid("ENG", "105"),
                user_id=u_map["Prof. Marcus Vance"],
                title="Emergency Eye Wash Station Inspection",
                description="Quarterly safety valve inspection and water pressure certification completed.",
                priority="LOW",
                status="RESOLVED",
                reported_at=now - timedelta(days=7),
                resolved_at=now - timedelta(days=6)
            ),
        ]
        db.add_all(tickets)

        print("[*] Seeding 6 Campus Events...")
        events = [
            Event(
                title="NextGen AI & Autonomous Systems Symposium",
                description="Keynote lectures, paper presentations, and live demonstration of campus autonomous rovers.",
                building_id=b_map["TURING"],
                room_id=get_rid("TURING", "101"),
                start_time=now + timedelta(days=1, hours=2),
                end_time=now + timedelta(days=1, hours=8),
                category="TECH"
            ),
            Event(
                title="Inter-College Robotics Battle Challenge 2026",
                description="Collegiate teams compete in autonomous maze navigation and payload manipulation.",
                building_id=b_map["ENG"],
                room_id=get_rid("ENG", "201"),
                start_time=now + timedelta(days=3, hours=1),
                end_time=now + timedelta(days=3, hours=6),
                category="TECH"
            ),
            Event(
                title="Quantum Computing & Post-Silicon Architecture",
                description="Distinguished guest lecture on topological qubits and superconducting cryogenic processors.",
                building_id=b_map["SCI"],
                room_id=get_rid("SCI", "101"),
                start_time=now + timedelta(days=4, hours=4),
                end_time=now + timedelta(days=4, hours=6),
                category="ACADEMIC"
            ),
            Event(
                title="CampusPulse Hackathon: Smart City Innovations",
                description="48-hour intense hackathon creating IoT, digital twins, and energy optimization solutions.",
                building_id=b_map["TURING"],
                room_id=get_rid("TURING", "102"),
                start_time=now + timedelta(days=7),
                end_time=now + timedelta(days=9),
                category="WORKSHOP"
            ),
            Event(
                title="Annual Cultural Harmony Gala & Arts Night",
                description="Student performances, international culinary booths, and live acoustic orchestra.",
                building_id=b_map["STU"],
                room_id=get_rid("STU", "101"),
                start_time=now + timedelta(days=5, hours=9),
                end_time=now + timedelta(days=5, hours=14),
                category="CULTURAL"
            ),
            Event(
                title="Sustainable Campus & Zero-Emission Roundtable",
                description="Faculty and student senate joint forum on campus microgrid and solar rooftop deployment.",
                building_id=b_map["LIB"],
                room_id=get_rid("LIB", "101"),
                start_time=now + timedelta(days=6, hours=3),
                end_time=now + timedelta(days=6, hours=5),
                category="ACADEMIC"
            ),
        ]
        db.add_all(events)

        db.commit()
        print("\n[SUCCESS] Seed data committed successfully.")
        print(f"Summary: {len(buildings)} buildings, {len(rooms)} rooms, {len(users)} users, {len(bookings)} bookings, {len(tickets)} tickets, {len(events)} events.")

    except Exception as e:
        db.rollback()
        print(f"[FAILED] Seeding error: {e}")
        sys.exit(1)
    finally:
        db.close()

    print("\n" + "=" * 65)
    print(" CampusPulse Database Initialization COMPLETE (Status: OK) ")
    print("=" * 65)

if __name__ == "__main__":
    use_sqlplus_mode = "--sqlplus" in sys.argv
    init_database(use_sqlplus=use_sqlplus_mode)
