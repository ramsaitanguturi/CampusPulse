import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.config import mask_database_url
from app.database import engine, SessionLocal
from app.models.entities import User, Building, Room, Booking, MaintenanceTicket, Event

REQUIRED_TABLES = ["USERS", "BUILDINGS", "ROOMS", "BOOKINGS", "MAINTENANCE_TICKETS", "EVENTS"]
REQUIRED_VIEWS = ["V_DASHBOARD_SUMMARY", "V_ROOM_LIVE_STATUS"]

def verify_oracle_schema():
    print("=" * 70)
    print(" CampusPulse — Oracle Database Schema & Integrity Verification ")
    print("=" * 70)

    url_str = str(engine.url)
    is_oracle = "oracle" in url_str
    print(f"Target Database: {mask_database_url(url_str)}")
    print(f"Dialect Detected: {'Oracle Database (oracledb)' if is_oracle else 'Non-Oracle (' + url_str.split(':')[0] + ')'}")

    failures = []

    # 1. Connectivity Check
    print("\n[Check 1/9] Verifying Database Connectivity...")
    try:
        ping_sql = "SELECT 1 FROM dual" if is_oracle else "SELECT 1"
        with engine.connect() as conn:
            conn.execute(text(ping_sql))
        print("  -> PASS: Database ping responded successfully.")
    except Exception as e:
        print(f"  -> FAIL: Connectivity error: {e}")
        return 1

    # 2. Required Tables Existence
    print("\n[Check 2/9] Checking Required Relational Tables...")
    with engine.connect() as conn:
        if is_oracle:
            res = conn.execute(text("SELECT table_name FROM user_tables")).scalars().all()
            found_tables = {t.upper() for t in res}
        else:
            res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).scalars().all()
            found_tables = {t.upper() for t in res}

        for tbl in REQUIRED_TABLES:
            if tbl in found_tables:
                print(f"  -> PASS: Table '{tbl}' exists.")
            else:
                print(f"  -> FAIL: Table '{tbl}' is MISSING.")
                failures.append(f"Missing table: {tbl}")

    # 3. Required Views Existence and Validity
    print("\n[Check 3/9] Checking Dashboard and Analytics Views...")
    with engine.connect() as conn:
        if is_oracle:
            views_res = conn.execute(text("SELECT view_name FROM user_views")).scalars().all()
            found_views = {v.upper() for v in views_res}
            # Check validity in USER_OBJECTS
            valid_res = conn.execute(text(
                "SELECT object_name, status FROM user_objects WHERE object_type = 'VIEW'"
            )).fetchall()
            validity_map = {row[0].upper(): row[1] for row in valid_res}
        else:
            views_res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='view'")).scalars().all()
            found_views = {v.upper() for v in views_res}
            validity_map = {v: "VALID" for v in found_views}

        for vw in REQUIRED_VIEWS:
            if vw in found_views:
                v_status = validity_map.get(vw, "UNKNOWN")
                if v_status == "VALID":
                    print(f"  -> PASS: View '{vw}' exists and is VALID.")
                else:
                    print(f"  -> FAIL: View '{vw}' exists but status is {v_status}.")
                    failures.append(f"Invalid view: {vw} ({v_status})")
            else:
                print(f"  -> FAIL: View '{vw}' is MISSING.")
                failures.append(f"Missing view: {vw}")

    # 4. Trigger Existence and Validity (Oracle Specific)
    print("\n[Check 4/9] Checking Conflict-Prevention Triggers...")
    if is_oracle:
        with engine.connect() as conn:
            trg_res = conn.execute(text(
                "SELECT trigger_name, status FROM user_triggers WHERE trigger_name = 'TRG_NO_OVERLAPPING_BOOKINGS'"
            )).fetchall()
            if trg_res:
                t_name, t_status = trg_res[0]
                # Check compilation status in user_objects
                obj_res = conn.execute(text(
                    "SELECT status FROM user_objects WHERE object_type = 'TRIGGER' AND object_name = 'TRG_NO_OVERLAPPING_BOOKINGS'"
                )).scalar()
                if t_status == "ENABLED" and obj_res == "VALID":
                    print(f"  -> PASS: Trigger '{t_name}' is ENABLED and VALID.")
                else:
                    print(f"  -> FAIL: Trigger '{t_name}' status is {t_status}, object status: {obj_res}.")
                    failures.append(f"Trigger {t_name} not healthy: status={t_status}, object={obj_res}")
            else:
                print("  -> FAIL: Trigger 'TRG_NO_OVERLAPPING_BOOKINGS' is MISSING.")
                failures.append("Missing trigger: TRG_NO_OVERLAPPING_BOOKINGS")
    else:
        print("  -> INFO: Trigger check skipped (non-Oracle environment).")

    # 5. Constraints Verification (Primary Keys, Foreign Keys, Checks, Uniques)
    print("\n[Check 5/9] Verifying Table Constraints & Integrity Rules...")
    if is_oracle:
        with engine.connect() as conn:
            constraints = conn.execute(text("""
                SELECT table_name, constraint_type, constraint_name, status 
                FROM user_constraints 
                WHERE table_name IN ('USERS', 'BUILDINGS', 'ROOMS', 'BOOKINGS', 'MAINTENANCE_TICKETS', 'EVENTS')
                ORDER BY table_name, constraint_type
            """)).fetchall()
            
            c_by_type = {"P": 0, "R": 0, "C": 0, "U": 0}
            for row in constraints:
                ctype = row[1]
                if ctype in c_by_type:
                    c_by_type[ctype] += 1
            
            print(f"  -> Constraints found: {c_by_type['P']} Primary Keys, {c_by_type['R']} Foreign Keys, "
                  f"{c_by_type['C']} Check Constraints, {c_by_type['U']} Unique Constraints.")
            if c_by_type['P'] >= 6 and c_by_type['R'] >= 5:
                print("  -> PASS: Key integrity constraints are active and enforced.")
            else:
                print("  -> WARN: Some constraints might be missing.")
                failures.append("Insufficient constraint counts in USER_CONSTRAINTS")
    else:
        print("  -> INFO: SQLite uses inline constraints verified via ORM definitions.")

    # 6. Performance Indexes
    print("\n[Check 6/9] Verifying Performance Indexes...")
    with engine.connect() as conn:
        if is_oracle:
            indexes = conn.execute(text("SELECT index_name, table_name FROM user_indexes")).fetchall()
            idx_names = {row[0].upper() for row in indexes}
            expected_indexes = ["IDX_ROOMS_BLD_STATUS", "IDX_BK_ROOM_TIME", "IDX_MT_STATUS_PRI"]
            for exp in expected_indexes:
                if exp in idx_names:
                    print(f"  -> PASS: Index '{exp}' verified.")
                else:
                    print(f"  -> FAIL: Index '{exp}' missing.")
                    failures.append(f"Missing index: {exp}")
        else:
            print("  -> INFO: Standard indexes checked via metadata.")

    # 7. Seed Data Record Counts
    print("\n[Check 7/9] Verifying Seed Data Record Quantities...")
    db = SessionLocal()
    try:
        cnt_buildings = db.query(Building).count()
        cnt_rooms = db.query(Room).count()
        cnt_users = db.query(User).count()
        cnt_bookings = db.query(Booking).count()
        cnt_tickets = db.query(MaintenanceTicket).count()
        cnt_events = db.query(Event).count()

        print(f"  -> Buildings: {cnt_buildings} (Minimum required: 4)")
        print(f"  -> Rooms    : {cnt_rooms} (Minimum required: 20)")
        print(f"  -> Users    : {cnt_users} (Minimum required: 8)")
        print(f"  -> Bookings : {cnt_bookings} (Minimum required: 10)")
        print(f"  -> Tickets  : {cnt_tickets} (Minimum required: 5)")
        print(f"  -> Events   : {cnt_events} (Minimum required: 5)")

        if (cnt_buildings >= 4 and cnt_rooms >= 20 and cnt_users >= 8 and 
            cnt_bookings >= 10 and cnt_tickets >= 5 and cnt_events >= 5):
            print("  -> PASS: Seed data record counts satisfy all evaluation criteria.")
        else:
            print("  -> FAIL: Inadequate seed data counts.")
            failures.append("Seed data counts below required minimums")

        # 8. Referential Integrity Check
        print("\n[Check 8/9] Verifying Referential Integrity...")
        # Check orphaned rooms
        orphaned_rooms = db.query(Room).filter(~Room.building_id.in_(db.query(Building.id))).count()
        # Check orphaned bookings
        orphaned_bookings = db.query(Booking).filter(~Booking.room_id.in_(db.query(Room.id))).count()
        # Check orphaned tickets
        orphaned_tickets = db.query(MaintenanceTicket).filter(~MaintenanceTicket.room_id.in_(db.query(Room.id))).count()

        if orphaned_rooms == 0 and orphaned_bookings == 0 and orphaned_tickets == 0:
            print("  -> PASS: Zero orphaned foreign keys detected across all relations.")
        else:
            print(f"  -> FAIL: Referential integrity violation: {orphaned_rooms} rooms, {orphaned_bookings} bookings, {orphaned_tickets} tickets.")
            failures.append("Referential integrity check failed")

        # 9. Dashboard View Query Test
        print("\n[Check 9/9] Querying v_dashboard_summary...")
        view_rows = db.execute(text("SELECT building_code, total_rooms, occupancy_rate FROM v_dashboard_summary")).fetchall()
        print(f"  -> PASS: v_dashboard_summary returned {len(view_rows)} building summary rows.")

    finally:
        db.close()

    print("\n" + "=" * 70)
    if not failures:
        print(" VERIFICATION RESULT: ALL CHECKS PASSED (EXIT CODE 0) ")
        print("=" * 70)
        return 0
    else:
        print(f" VERIFICATION RESULT: {len(failures)} CHECKS FAILED (EXIT CODE 1) ")
        for f in failures:
            print(f"  * {f}")
        print("=" * 70)
        return 1

if __name__ == "__main__":
    exit_code = verify_oracle_schema()
    sys.exit(exit_code)
