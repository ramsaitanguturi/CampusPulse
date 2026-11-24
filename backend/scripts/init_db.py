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
      id         bookings.id%TYPE,
      room_id    bookings.room_id%TYPE,
      start_time bookings.start_time%TYPE,
      end_time   bookings.end_time%TYPE,
      status     bookings.status%TYPE
   );
   TYPE t_booking_list IS TABLE OF t_booking_rec;
   g_bookings t_booking_list := t_booking_list();

   -- Associative array of affected room IDs for deterministic sorted locking
   TYPE t_room_id_map IS TABLE OF BOOLEAN INDEX BY PLS_INTEGER;
   g_room_ids t_room_id_map;

   BEFORE STATEMENT IS
   BEGIN
      g_bookings.DELETE;
      g_room_ids.DELETE;
   END BEFORE STATEMENT;

   AFTER EACH ROW IS
   BEGIN
      IF :NEW.status = 'CONFIRMED' THEN
         g_bookings.EXTEND;
         g_bookings(g_bookings.LAST).id := :NEW.id;
         g_bookings(g_bookings.LAST).room_id := :NEW.room_id;
         g_bookings(g_bookings.LAST).start_time := :NEW.start_time;
         g_bookings(g_bookings.LAST).end_time := :NEW.end_time;
         g_bookings(g_bookings.LAST).status := :NEW.status;

         g_room_ids(:NEW.room_id) := TRUE;
      END IF;

      IF UPDATING THEN
         IF :OLD.room_id IS NOT NULL AND :OLD.room_id != :NEW.room_id THEN
            g_room_ids(:OLD.room_id) := TRUE;
         END IF;
      END IF;
   END AFTER EACH ROW;

   AFTER STATEMENT IS
      v_dummy_room_id rooms.id%TYPE;
      v_curr_room_id  PLS_INTEGER;
      v_conflict_count NUMBER := 0;
   BEGIN
      -- Step 1: Deterministic sorted row locking on parent ROOMS table to serialize concurrent transactions
      v_curr_room_id := g_room_ids.FIRST;
      WHILE v_curr_room_id IS NOT NULL LOOP
         BEGIN
            SELECT id
            INTO v_dummy_room_id
            FROM rooms
            WHERE id = v_curr_room_id
            FOR UPDATE;
         EXCEPTION
            WHEN NO_DATA_FOUND THEN
               NULL; -- Let foreign key constraint reject non-existent room
         END;
         v_curr_room_id := g_room_ids.NEXT(v_curr_room_id);
      END LOOP;

      -- Step 2: Validate half-open interval overlap with parent room locks acquired
      FOR i IN 1 .. g_bookings.COUNT LOOP
         SELECT COUNT(*)
         INTO v_conflict_count
         FROM bookings b
         WHERE b.room_id = g_bookings(i).room_id
           AND b.status = 'CONFIRMED'
           AND (b.id != g_bookings(i).id OR g_bookings(i).id IS NULL)
           AND (b.start_time < g_bookings(i).end_time AND b.end_time > g_bookings(i).start_time);

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

def init_database(use_sqlplus: bool = False, force: bool = False):
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
                with engine.begin() as conn:
                    for view_sql in ORACLE_VIEWS_DDL:
                        conn.execute(text(view_sql.strip()))
                    print("[*] Oracle views created (v_dashboard_summary, v_room_live_status).")

                    raw_conn = conn.connection
                    cursor = raw_conn.cursor()
                    cursor.execute(ORACLE_TRIGGER_DDL.strip())
                    cursor.close()
                    print("[*] Oracle compound trigger compiled (trg_no_overlapping_bookings).")

                    for idx_sql in ORACLE_INDEXES_DDL:
                        try:
                            conn.execute(text(idx_sql.strip()))
                        except Exception as ie:
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

    # Phase 4: Data Population (Extracted Authentic Academic Context)
    print("\n--- [Phase 4: Sample Data Seeding] ---")
    db = SessionLocal()
    try:
        if force:
            print("[*] Force reseed flag detected. Deleting existing records (child -> parent)...")
            db.query(Event).delete()
            db.query(MaintenanceTicket).delete()
            db.query(Booking).delete()
            db.query(Room).delete()
            db.query(Building).delete()
            db.query(User).delete()
            db.commit()
            print("[SUCCESS] Old seed records purged.")
        else:
            existing_buildings = db.query(Building).count()
            if existing_buildings >= 4:
                print(f"[*] Database already populated with {existing_buildings} buildings. (Use --force to re-seed). Skipping.")
                return

        # -------------------------------------------------------------------------
        # 1. Buildings (5 Institutional Facilities)
        # -------------------------------------------------------------------------
        print("[*] Seeding 5 Academic Facilities...")
        buildings = [
            Building(
                code="LHB",
                name="Lecture Hall Block",
                floors=3,
                map_x=22.0,
                map_y=30.0,
                description="Central lecture complex housing undergraduate tiered lecture theaters and seminar spaces.",
                status="OPERATIONAL"
            ),
            Building(
                code="CC",
                name="Turing Computing Centre & AI Hub",
                floors=4,
                map_x=45.0,
                map_y=25.0,
                description="Flagship computing facility housing high-performance GPU clusters, DBMS, OS, networking, and deep learning labs.",
                status="OPERATIONAL"
            ),
            Building(
                code="SCI",
                name="Science & Nanotechnology Block",
                floors=3,
                map_x=72.0,
                map_y=35.0,
                description="Advanced sciences facility housing physics, chemistry, nanotechnology, and the Science Seminar Hall.",
                status="OPERATIONAL"
            ),
            Building(
                code="SHC",
                name="Seminar Hall Complex",
                floors=2,
                map_x=32.0,
                map_y=68.0,
                description="Central auditorium complex housing Krishna Seminar Hall (KSH), Hundri Seminar Hall (HSH), and Tungabhadra Seminar Hall (TSH) for conferences, symposia, and academic convocations.",
                status="OPERATIONAL"
            ),
            Building(
                code="MWB",
                name="Mechanical & Design Workshop Block",
                floors=3,
                map_x=65.0,
                map_y=70.0,
                description="Heavy machinery, design realization, smart manufacturing studio, and robotics fabrication center.",
                status="OPERATIONAL"
            ),
        ]
        db.add_all(buildings)
        db.flush()
        b_map = {b.code: b.id for b in buildings}

        # -------------------------------------------------------------------------
        # 2. Users (Professors, Staff, and Students from context documents)
        # -------------------------------------------------------------------------
        print("[*] Seeding 28 Institutional Users (22 Faculty Instructors, 2 Staff, 4 Students)...")
        users = [
            # Faculty from Exam Timetable & Syllabus Instructors
            User(name="Dr. Vinay Kumar Tiwari", email="vinay.tiwari@iiitk.ac.in", role="FACULTY", department="Artificial Intelligence & Data Science"),
            User(name="Dr. S. Manoj Kumar", email="manoj.kumar@iiitk.ac.in", role="FACULTY", department="Computer Science & Engineering"),
            User(name="Dr. N. Srinivas Naik", email="srinivas.naik@iiitk.ac.in", role="FACULTY", department="Computer Science & Engineering"),
            User(name="Dr. Priyadarshini Rai", email="priyadarshini.rai@iiitk.ac.in", role="FACULTY", department="Artificial Intelligence & Data Science"),
            User(name="Dr. Rohit Kumar Das", email="rohit.das@iiitk.ac.in", role="FACULTY", department="Computer Science & Engineering"),
            User(name="Dr. Shounak Chakraborty", email="shounak.chakraborty@iiitk.ac.in", role="FACULTY", department="Artificial Intelligence & Data Science"),
            User(name="Dr. Srinivasa Desikan K.E", email="srinivasa.desikan@iiitk.ac.in", role="FACULTY", department="Electronics & Communication Engineering"),
            User(name="Dr. P. Ranga Babu", email="ranga.babu@iiitk.ac.in", role="FACULTY", department="Electronics & Communication Engineering"),
            User(name="Dr. Eswaramoorthy K.V", email="eswaramoorthy@iiitk.ac.in", role="FACULTY", department="Electronics & Communication Engineering"),
            User(name="Dr. S. Subba Rao", email="subba.rao@iiitk.ac.in", role="FACULTY", department="Electronics & Communication Engineering"),
            User(name="Dr. M. Pullarao", email="pullarao@iiitk.ac.in", role="FACULTY", department="Mechanical Engineering"),
            User(name="Dr. Akhtar Khan", email="akhtar.khan@iiitk.ac.in", role="FACULTY", department="Mechanical Engineering"),
            User(name="Dr. Somnath Dey", email="somnath.dey@iiitk.ac.in", role="FACULTY", department="Mechanical Engineering"),
            User(name="Dr. C. Chandrasekhara Sastry", email="chandrasekhara.sastry@iiitk.ac.in", role="FACULTY", department="Mechanical Engineering"),
            User(name="Dr. J. Krishnaiah", email="krishnaiah@iiitk.ac.in", role="FACULTY", department="Mechanical Engineering"),
            User(name="Dr. D. Murali", email="murali@iiitk.ac.in", role="FACULTY", department="Sciences & Humanities"),
            User(name="Dr. D. Amaranatha Reddy", email="amaranatha.reddy@iiitk.ac.in", role="FACULTY", department="Sciences & Humanities"),
            User(name="Dr. Pavan Venu Prakash Madduri", email="pavan.madduri@iiitk.ac.in", role="FACULTY", department="Sciences & Humanities"),
            User(name="Dr. T. Pandiyarajan", email="pandiyarajan@iiitk.ac.in", role="FACULTY", department="Sciences & Humanities"),
            User(name="Dr. Putha Kishore", email="putha.kishore@iiitk.ac.in", role="FACULTY", department="Sciences & Humanities"),
            User(name="Prof. K. Sathya Babu", email="sathya.babu@iiitk.ac.in", role="FACULTY", department="Computer Science & Engineering"),
            User(name="Dr. D. Chandra Mohan", email="chandra.mohan@iiitk.ac.in", role="FACULTY", department="Computer Science & Engineering"),

            # Administration & Estate Management
            User(name="K. Rajesh (FIC-Examinations)", email="fic.exams@iiitk.ac.in", role="ADMIN", department="Academic Affairs & Examination Cell"),
            User(name="M. Venkat (Estate Officer)", email="estate.officer@iiitk.ac.in", role="STAFF", department="Estate & Facility Management"),

            # Students (from Context Seating Register)
            User(name="Student 123CS0035", email="123cs0035@iiitk.ac.in", role="STUDENT", department="Computer Science & Engineering"),
            User(name="Student 124AD0018", email="124ad0018@iiitk.ac.in", role="STUDENT", department="Artificial Intelligence & Data Science"),
            User(name="Student 124EC0032", email="124ec0032@iiitk.ac.in", role="STUDENT", department="Electronics & Communication Engineering"),
            User(name="Student 124ME0024", email="124me0024@iiitk.ac.in", role="STUDENT", department="Mechanical Engineering"),
        ]
        db.add_all(users)
        db.flush()
        u_map = {u.name: u.id for u in users}

        # -------------------------------------------------------------------------
        # 3. Rooms (25 Real Classrooms, Auditoriums, and Practice Labs)
        # -------------------------------------------------------------------------
        print("[*] Seeding 25 Campus Rooms & Laboratories...")
        rooms_data = [
            # Lecture Hall Block (LHB) - Authentic rooms from 23-11-2026_FN.xlsx
            {"b": "LHB", "num": "EC101", "floor": 1, "cap": 63, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "LHB", "num": "ME101", "floor": 1, "cap": 63, "type": "CLASSROOM", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "LHB", "num": "CS101", "floor": 1, "cap": 63, "type": "CLASSROOM", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "LHB", "num": "CS102", "floor": 1, "cap": 63, "type": "CLASSROOM", "status": "MAINTENANCE", "proj": True, "ac": True},
            {"b": "LHB", "num": "EC201", "floor": 2, "cap": 54, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "LHB", "num": "ME201", "floor": 2, "cap": 50, "type": "CLASSROOM", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "LHB", "num": "CS201", "floor": 2, "cap": 46, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "LHB", "num": "CS202", "floor": 2, "cap": 37, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "LHB", "num": "LHB301", "floor": 3, "cap": 30, "type": "CONFERENCE", "status": "AVAILABLE", "proj": True, "ac": True},

            # Science & Nanotechnology Block (SCI) - Context Excel Classrooms & Seminar Hall
            {"b": "SCI", "num": "DS101", "floor": 1, "cap": 58, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "SCI", "num": "DS102", "floor": 1, "cap": 53, "type": "CLASSROOM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "SCI", "num": "DS103", "floor": 1, "cap": 63, "type": "CLASSROOM", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "SCI", "num": "DS104", "floor": 1, "cap": 64, "type": "CLASSROOM", "status": "MAINTENANCE", "proj": True, "ac": True},
            {"b": "SCI", "num": "SH", "floor": 2, "cap": 66, "type": "AUDITORIUM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "SCI", "num": "DS201", "floor": 2, "cap": 40, "type": "LAB", "status": "OCCUPIED", "proj": True, "ac": True},

            # Seminar Hall Complex (SHC) - Central Auditoriums (Krishna, Hundri, and Tungabhadra)
            {"b": "SHC", "num": "KSH", "floor": 1, "cap": 150, "type": "AUDITORIUM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "SHC", "num": "HSH", "floor": 1, "cap": 120, "type": "AUDITORIUM", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "SHC", "num": "TSH", "floor": 2, "cap": 120, "type": "AUDITORIUM", "status": "OCCUPIED", "proj": True, "ac": True},

            # Turing Computing Centre & AI Hub (CC) - B.Tech CSE Practice Laboratories
            {"b": "CC", "num": "CC101", "floor": 1, "cap": 60, "type": "LAB", "status": "OCCUPIED", "proj": True, "ac": True},
            {"b": "CC", "num": "CC102", "floor": 1, "cap": 60, "type": "LAB", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "CC", "num": "CC201", "floor": 2, "cap": 60, "type": "LAB", "status": "MAINTENANCE", "proj": True, "ac": True},
            {"b": "CC", "num": "CC301", "floor": 3, "cap": 40, "type": "LAB", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "CC", "num": "CC401", "floor": 4, "cap": 12, "type": "STUDY_POD", "status": "AVAILABLE", "proj": False, "ac": True},

            # Mechanical & Design Workshop Block (MWB) - Engineering Design Laboratories
            {"b": "MWB", "num": "MWB101", "floor": 1, "cap": 50, "type": "LAB", "status": "AVAILABLE", "proj": True, "ac": True},
            {"b": "MWB", "num": "MWB201", "floor": 2, "cap": 35, "type": "LAB", "status": "OCCUPIED", "proj": True, "ac": True},
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

        # -------------------------------------------------------------------------
        # 4. Bookings (Course Lectures, End-Sem Exams, and Practice Labs)
        # -------------------------------------------------------------------------
        print("[*] Seeding 14 Authentic Course Bookings & End-Sem Sessions...")
        now = datetime.now(timezone.utc)
        bookings = [
            # Active ongoing sessions
            Booking(
                room_id=get_rid("LHB", "CS101"),
                user_id=u_map["Dr. S. Manoj Kumar"],
                title="CS301: Database Management Systems - End-Sem Evaluation",
                start_time=now - timedelta(minutes=30),
                end_time=now + timedelta(hours=1, minutes=30),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("LHB", "ME101"),
                user_id=u_map["Dr. Vinay Kumar Tiwari"],
                title="AD301: Database Management Systems - Mid-Term Review",
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=2),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("LHB", "ME201"),
                user_id=u_map["Dr. N. Srinivas Naik"],
                title="CS303: Operating Systems Theory & Kernel Concepts",
                start_time=now - timedelta(minutes=45),
                end_time=now + timedelta(hours=1, minutes=15),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("SCI", "DS103"),
                user_id=u_map["Dr. Srinivasa Desikan K.E"],
                title="EC301: Digital Signal Processing - Filter Synthesis",
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=1),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("CC", "CC101"),
                user_id=u_map["Dr. S. Manoj Kumar"],
                title="CS351: DBMS Practice Lab Slot A (SQL DDL/DML & Triggers)",
                start_time=now - timedelta(minutes=40),
                end_time=now + timedelta(hours=1, minutes=20),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("SCI", "DS201"),
                user_id=u_map["Dr. D. Murali"],
                title="DS401: Quantum Computing - Post-Silicon Simulation Group",
                start_time=now - timedelta(minutes=20),
                end_time=now + timedelta(hours=1, minutes=40),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("SHC", "TSH"),
                user_id=u_map["K. Rajesh (FIC-Examinations)"],
                title="Academic Senate Committee: B.Tech Curriculum Revision (Tungabhadra Hall)",
                start_time=now - timedelta(hours=1),
                end_time=now + timedelta(hours=2),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("MWB", "MWB201"),
                user_id=u_map["Dr. C. Chandrasekhara Sastry"],
                title="ME401: CAD/CAM Mechatronics Modeling Practical",
                start_time=now - timedelta(minutes=50),
                end_time=now + timedelta(hours=1, minutes=10),
                status="CONFIRMED"
            ),

            # Upcoming booked sessions
            Booking(
                room_id=get_rid("LHB", "CS201"),
                user_id=u_map["Dr. Rohit Kumar Das"],
                title="CS302: Data Communication & Networks - Protocol Lab",
                start_time=now + timedelta(hours=3),
                end_time=now + timedelta(hours=5),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("CC", "CC102"),
                user_id=u_map["Dr. Shounak Chakraborty"],
                title="AD302: Deep Learning Neural Network Training Lab",
                start_time=now + timedelta(hours=4),
                end_time=now + timedelta(hours=6),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("LHB", "EC101"),
                user_id=u_map["Dr. P. Ranga Babu"],
                title="EC303: VLSI System Design - CMOS Layout Seminar",
                start_time=now + timedelta(days=1, hours=2),
                end_time=now + timedelta(days=1, hours=4),
                status="CONFIRMED"
            ),
            Booking(
                room_id=get_rid("SHC", "HSH"),
                user_id=u_map["Prof. K. Sathya Babu"],
                title="CS311: Natural Language Processing - Transformer Models (Hundri Hall)",
                start_time=now + timedelta(days=2, hours=3),
                end_time=now + timedelta(days=2, hours=7),
                status="CONFIRMED"
            ),

            # Past sessions (Completed & Cancelled)
            Booking(
                room_id=get_rid("LHB", "EC201"),
                user_id=u_map["Dr. Somnath Dey"],
                title="ME305: Design of Machine Elements Review Session",
                start_time=now - timedelta(days=1, hours=3),
                end_time=now - timedelta(days=1, hours=1),
                status="COMPLETED"
            ),
            Booking(
                room_id=get_rid("LHB", "CS202"),
                user_id=u_map["Dr. Pavan Venu Prakash Madduri"],
                title="DS403: Quantum Technologies Laboratory Discussion",
                start_time=now - timedelta(days=2, hours=2),
                end_time=now - timedelta(days=2, hours=1),
                status="CANCELLED"
            ),
        ]
        db.add_all(bookings)

        # -------------------------------------------------------------------------
        # 5. Maintenance Tickets
        # -------------------------------------------------------------------------
        print("[*] Seeding 6 Campus Facility Tickets...")
        tickets = [
            MaintenanceTicket(
                room_id=get_rid("LHB", "CS102"),
                user_id=u_map["Dr. N. Srinivas Naik"],
                title="Overhead 4K Projector HDMI Port & EDID Sync Glitch",
                description="Lecture hall projector experiences periodic video blackout during dual display sync in CS303 classes.",
                priority="HIGH",
                status="OPEN",
                reported_at=now - timedelta(hours=14)
            ),
            MaintenanceTicket(
                room_id=get_rid("CC", "CC201"),
                user_id=u_map["Dr. Priyadarshini Rai"],
                title="Server Rack UPS Battery Warning & Power Surge Trip",
                description="Auxiliary power unit reporting low voltage cell on rack 4. OS & Deep Learning lab machines experiencing unexpected shutdowns.",
                priority="CRITICAL",
                status="IN_PROGRESS",
                reported_at=now - timedelta(hours=36)
            ),
            MaintenanceTicket(
                room_id=get_rid("SCI", "DS104"),
                user_id=u_map["Dr. Putha Kishore"],
                title="Acoustic Microphone Feedback & Audio PA Amp Hum",
                description="Microphone channel creates high-frequency oscillation feedback when volume exceeds 50% in DS104.",
                priority="MEDIUM",
                status="OPEN",
                reported_at=now - timedelta(hours=6)
            ),
            MaintenanceTicket(
                room_id=get_rid("LHB", "ME101"),
                user_id=u_map["Dr. Akhtar Khan"],
                title="Air Conditioning Thermostat Calibration Fault",
                description="Room temperature sensor reads 18C while room ambient is 28C. Blower running continuously on low.",
                priority="LOW",
                status="IN_PROGRESS",
                reported_at=now - timedelta(days=2)
            ),
            MaintenanceTicket(
                room_id=get_rid("SCI", "SH"),
                user_id=u_map["Dr. D. Amaranatha Reddy"],
                title="Stage Luminaire Dimmer Pack Tripping Circuit Breaker",
                description="Dimmer rack channel 3 shorted during Sustainable Design seminar. Breaker replaced and tested under full load.",
                priority="MEDIUM",
                status="RESOLVED",
                reported_at=now - timedelta(days=5),
                resolved_at=now - timedelta(days=1)
            ),
            MaintenanceTicket(
                room_id=get_rid("MWB", "MWB101"),
                user_id=u_map["M. Venkat (Estate Officer)"],
                title="Dust Extraction & Filtration Filter Replacement",
                description="Quarterly inspection and HEPA exhaust filtration canister replacement completed for CNC mill enclosures.",
                priority="LOW",
                status="RESOLVED",
                reported_at=now - timedelta(days=7),
                resolved_at=now - timedelta(days=6)
            ),
        ]
        db.add_all(tickets)

        # -------------------------------------------------------------------------
        # 6. Events (Academic Examinations, Symposia, & Technical Workshops)
        # -------------------------------------------------------------------------
        print("[*] Seeding 6 Academic & Institutional Events...")
        events = [
            Event(
                title="B.Tech End-Semester Examinations (Session: July - Nov 2026)",
                description="Centralized final examinations for 3rd Year B.Tech (CSE, AI&DS, ECE, ME) as per official institutional schedule.",
                building_id=b_map["LHB"],
                room_id=get_rid("LHB", "CS101"),
                start_time=now + timedelta(days=1, hours=2),
                end_time=now + timedelta(days=1, hours=8),
                category="ACADEMIC"
            ),
            Event(
                title="Quantum Computing & Nano-Electronics National Symposium",
                description="Keynote talks by Dr. D. Murali and Dr. T. Pandiyarajan on topological qubits and solid-state quantum devices.",
                building_id=b_map["SCI"],
                room_id=get_rid("SCI", "SH"),
                start_time=now + timedelta(days=3, hours=1),
                end_time=now + timedelta(days=3, hours=6),
                category="ACADEMIC"
            ),
            Event(
                title="IIITDM Kurnool Annual Hackathon: AI Agents & Edge Computing",
                description="48-hour competitive software hackathon solving smart manufacturing, robotics, and campus IoT problems.",
                building_id=b_map["CC"],
                room_id=get_rid("CC", "CC102"),
                start_time=now + timedelta(days=7),
                end_time=now + timedelta(days=9),
                category="TECH"
            ),
            Event(
                title="Large Language Models & Transformer Architectures Workshop",
                description="Hands-on masterclass conducted by Prof. K. Sathya Babu in Tungabhadra Seminar Hall on attention mechanisms, LoRA fine-tuning, and inference engines.",
                building_id=b_map["SHC"],
                room_id=get_rid("SHC", "TSH"),
                start_time=now + timedelta(days=4, hours=4),
                end_time=now + timedelta(days=4, hours=8),
                category="WORKSHOP"
            ),
            Event(
                title="Industry 4.0 & Smart Mechatronics Expo 2026",
                description="Live demonstration of additive manufacturing, robotic workcells, and predictive maintenance by Mechanical Engineering faculty.",
                building_id=b_map["MWB"],
                room_id=get_rid("MWB", "MWB101"),
                start_time=now + timedelta(days=5, hours=9),
                end_time=now + timedelta(days=5, hours=14),
                category="TECH"
            ),
            Event(
                title="Tarang 2026: Annual Inter-College Cultural Gala",
                description="Student music society orchestra, theater productions, and classical dance performances in Krishna Seminar Hall.",
                building_id=b_map["SHC"],
                room_id=get_rid("SHC", "KSH"),
                start_time=now + timedelta(days=6, hours=3),
                end_time=now + timedelta(days=6, hours=8),
                category="CULTURAL"
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
    force_mode = "--force" in sys.argv
    init_database(use_sqlplus=use_sqlplus_mode, force=force_mode)
