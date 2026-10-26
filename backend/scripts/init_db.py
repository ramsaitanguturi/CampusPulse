import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from app.database import engine, SessionLocal, Base

from app.models.entities import User, Building, Room, Booking, MaintenanceTicket, Event

def init_database():
    print("=" * 60)
    print("CampusPulse — Database Initialization & Seeding")
    print("=" * 60)

    db_url = str(engine.url)
    is_oracle = "oracle" in db_url
    is_postgres = "postgresql" in db_url

    dialect_label = "Oracle SQL 21c (oracledb)" if is_oracle else ("PostgreSQL (psycopg)" if is_postgres else "SQLite (Fallback)")
    print(f"Target Database Dialect: {dialect_label}")
    print(f"Connecting to: {db_url.split('@')[-1] if '@' in db_url else db_url}")

    if is_oracle:
        print("\nCreating Oracle tables via SQLAlchemy metadata...")
        Base.metadata.create_all(bind=engine)
        print("Creating Oracle conflict-prevention trigger and views...")
        oracle_schema_file = os.path.join(os.path.dirname(__file__), "oracle_schema.sql")
        try:
            import subprocess
            subprocess.run(["sqlplus", "-S", "campuspulse/campuspulse123@localhost:1521/XEPDB1", f"@{oracle_schema_file}"], check=False, timeout=10)
            print("Oracle triggers and views configured.")
        except Exception as ex:
            print(f"Notice: trigger setup exited with ({ex})")
    elif is_postgres:
        print("\nExecuting PostgreSQL DDL script with exclusion constraint...")
        schema_file = os.path.join(os.path.dirname(__file__), "schema.sql")
        with open(schema_file, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        with engine.begin() as conn:
            conn.execute(text(schema_sql))
        print("Schema and exclusion constraints applied successfully.")
    else:
        print("\nCreating tables using SQLAlchemy metadata...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("SQLAlchemy tables created.")

    # Now populate realistic seed data
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Building).count() > 0:
            print("Database already contains data. Skipping seed.")
            return

        print("\nSeeding 5 Campus Buildings...")
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

        print("\nSeeding 10 Campus Users...")
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

        print("\nSeeding 25 Campus Rooms...")
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

        # Helper to get room id by building code and room number
        def get_rid(b_code, num):
            return r_map[(b_map[b_code], num)]

        print("\nSeeding 12 Campus Bookings...")
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

        print("\nSeeding 6 Maintenance Tickets...")
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

        print("\nSeeding 6 Campus Events...")
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
        print("\nAll seed data committed successfully!")
        print(f"Summary: {len(buildings)} buildings, {len(rooms)} rooms, {len(users)} users, {len(bookings)} bookings, {len(tickets)} tickets, {len(events)} events.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
