import pytest
import os
import time
import concurrent.futures
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models.entities import Room, Booking, User
from app.services.campus_service import CampusService

def is_oracle_connected():
    url_str = str(engine.url)
    if "oracle" not in url_str:
        return False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM dual"))
        return True
    except Exception:
        return False

oracle_available = is_oracle_connected()
skip_reason = "Oracle Database is not reachable or configured. Skipping Oracle integration suite."

@pytest.mark.skipif(not oracle_available, reason=skip_reason)
def test_oracle_schema_tables_and_metadata():
    """Verifies Oracle USER_TABLES metadata."""
    with engine.connect() as conn:
        tables = conn.execute(text("SELECT table_name FROM user_tables")).scalars().all()
        table_set = {t.upper() for t in tables}
        for expected in ["USERS", "BUILDINGS", "ROOMS", "BOOKINGS", "MAINTENANCE_TICKETS", "EVENTS"]:
            assert expected in table_set, f"Expected table {expected} in USER_TABLES"

@pytest.mark.skipif(not oracle_available, reason=skip_reason)
def test_oracle_trigger_compilation_and_validity():
    """Verifies Oracle compound trigger status in USER_TRIGGERS and USER_OBJECTS."""
    with engine.connect() as conn:
        trg_status = conn.execute(text(
            "SELECT status FROM user_triggers WHERE trigger_name = 'TRG_NO_OVERLAPPING_BOOKINGS'"
        )).scalar()
        assert trg_status == "ENABLED", f"Trigger status should be ENABLED, got {trg_status}"

        obj_status = conn.execute(text(
            "SELECT status FROM user_objects WHERE object_type = 'TRIGGER' AND object_name = 'TRG_NO_OVERLAPPING_BOOKINGS'"
        )).scalar()
        assert obj_status == "VALID", f"Trigger object compilation status should be VALID, got {obj_status}"

@pytest.mark.skipif(not oracle_available, reason=skip_reason)
def test_oracle_views_compilation_and_validity():
    """Verifies Oracle views v_dashboard_summary and v_room_live_status are VALID."""
    with engine.connect() as conn:
        for vw in ["V_DASHBOARD_SUMMARY", "V_ROOM_LIVE_STATUS"]:
            status = conn.execute(text(
                "SELECT status FROM user_objects WHERE object_type = 'VIEW' AND object_name = :vw"
            ), {"vw": vw}).scalar()
            assert status == "VALID", f"View {vw} compilation status should be VALID, got {status}"

@pytest.mark.skipif(not oracle_available, reason=skip_reason)
def test_oracle_row_locking_select_for_update_blocks_concurrent_session():
    """
    Verifies that pessimistic row-level locking (SELECT ... FOR UPDATE) on Oracle
    actually serializes and blocks concurrent independent sessions attempting to acquire
    the same row lock with NOWAIT (ORA-00054).
    """
    with engine.connect() as conn:
        room_id = conn.execute(text("SELECT id FROM rooms WHERE status = 'AVAILABLE'")).scalar()
    assert room_id is not None

    holder_started = False
    contender_rejected = False

    def session_holder():
        nonlocal holder_started
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                conn.execute(text(f"SELECT id FROM rooms WHERE id = {room_id} FOR UPDATE"))
                holder_started = True
                time.sleep(1.2)
            finally:
                trans.rollback()

    def session_contender():
        nonlocal contender_rejected
        # Wait until holder has acquired lock
        for _ in range(25):
            if holder_started:
                break
            time.sleep(0.05)
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                conn.execute(text(f"SELECT id FROM rooms WHERE id = {room_id} FOR UPDATE NOWAIT"))
            except Exception as ex:
                err = str(ex).lower()
                if "ora-00054" in err or "resource busy" in err:
                    contender_rejected = True
            finally:
                trans.rollback()

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(session_holder)
        f2 = executor.submit(session_contender)
        concurrent.futures.wait([f1, f2])

    assert holder_started, "Session holder failed to start and acquire lock"
    assert contender_rejected, "Session contender was not blocked by row lock (expected ORA-00054)!"

@pytest.mark.skipif(not oracle_available, reason=skip_reason)
def test_oracle_direct_sql_two_simultaneous_overlapping_inserts():
    """
    Scenario: Two simultaneous direct SQL inserts for the same room and overlapping time.
    Guarantees:
    - Independent database sessions and transactions.
    - Compound trigger acquires parent room lock via SELECT FOR UPDATE, serializing them.
    - Exactly one transaction commits.
    - The conflicting transaction is rejected with ORA-20001 and rolls back cleanly.
    - Zero partial data left in the database.
    """
    with engine.connect() as conn:
        room_id = conn.execute(text("SELECT id FROM rooms WHERE status = 'AVAILABLE'")).scalar()
        user_id = conn.execute(text("SELECT id FROM users")).scalar()

    now = datetime.now(timezone.utc)
    base_time = now + timedelta(days=62, hours=10)
    s1 = base_time.strftime("%Y-%m-%d %H:%M:%S")
    e1 = (base_time + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
    s2 = (base_time + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
    e2 = (base_time + timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S")

    t1_title = "DirectSQL Overlap T1"
    t2_title = "DirectSQL Overlap T2"

    try:
        def execute_insert(is_first: bool):
            with engine.connect() as conn:
                trans = conn.begin()
                try:
                    if not is_first:
                        time.sleep(0.3)
                    s = s1 if is_first else s2
                    e_t = e1 if is_first else e2
                    title = t1_title if is_first else t2_title
                    conn.execute(text(f"""
                        INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status, created_at)
                        VALUES ({room_id}, {user_id}, '{title}',
                                TO_DATE('{s}', 'YYYY-MM-DD HH24:MI:SS'),
                                TO_DATE('{e_t}', 'YYYY-MM-DD HH24:MI:SS'),
                                'CONFIRMED', SYSDATE)
                    """))
                    if is_first:
                        time.sleep(1.0)
                    trans.commit()
                    return ("SUCCESS", None)
                except Exception as ex:
                    trans.rollback()
                    return ("FAIL", str(ex))

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(execute_insert, True)
            f2 = executor.submit(execute_insert, False)
            res1_status, res1_err = f1.result()
            res2_status, res2_err = f2.result()

        statuses = [res1_status, res2_status]
        assert statuses.count("SUCCESS") == 1, f"Expected exactly 1 commit success: {statuses}"
        assert statuses.count("FAIL") == 1, f"Expected exactly 1 rollback failure: {statuses}"

        failed_err = res1_err if res1_status == "FAIL" else res2_err
        assert "ora-20001" in failed_err.lower() or "overlapping" in failed_err.lower()

        # Verify atomicity: only the successful booking exists
        with engine.connect() as conn:
            persisted = conn.execute(text(
                f"SELECT title FROM bookings WHERE title IN ('{t1_title}', '{t2_title}')"
            )).scalars().all()
            assert len(persisted) == 1, f"Expected 1 persisted booking, got {persisted}"
    finally:
        with engine.begin() as conn:
            conn.execute(text(f"DELETE FROM bookings WHERE title IN ('{t1_title}', '{t2_title}')"))

@pytest.mark.skipif(not oracle_available, reason=skip_reason)
def test_oracle_direct_sql_concurrent_different_rooms():
    """
    Scenario: Concurrent direct SQL bookings for different rooms at the same time.
    Guarantees: Both independent transactions succeed concurrently without blocking.
    """
    with engine.connect() as conn:
        rooms = conn.execute(text("SELECT id FROM rooms WHERE status = 'AVAILABLE' ORDER BY id")).scalars().all()
        user_id = conn.execute(text("SELECT id FROM users")).scalar()
    assert len(rooms) >= 2

    r_a, r_b = rooms[0], rooms[1]
    now = datetime.now(timezone.utc)
    base_time = now + timedelta(days=63, hours=14)
    s = base_time.strftime("%Y-%m-%d %H:%M:%S")
    e = (base_time + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")

    t_a = "DirectSQL DiffRoom A"
    t_b = "DirectSQL DiffRoom B"

    try:
        def insert_room(room_id, title):
            with engine.connect() as conn:
                trans = conn.begin()
                try:
                    conn.execute(text(f"""
                        INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status, created_at)
                        VALUES ({room_id}, {user_id}, '{title}',
                                TO_DATE('{s}', 'YYYY-MM-DD HH24:MI:SS'),
                                TO_DATE('{e}', 'YYYY-MM-DD HH24:MI:SS'),
                                'CONFIRMED', SYSDATE)
                    """))
                    trans.commit()
                    return "SUCCESS"
                except Exception:
                    trans.rollback()
                    raise

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(insert_room, r_a, t_a)
            f2 = executor.submit(insert_room, r_b, t_b)
            res1, res2 = f1.result(), f2.result()

        assert res1 == "SUCCESS"
        assert res2 == "SUCCESS"
    finally:
        with engine.begin() as conn:
            conn.execute(text(f"DELETE FROM bookings WHERE title IN ('{t_a}', '{t_b}')"))

@pytest.mark.skipif(not oracle_available, reason=skip_reason)
def test_oracle_direct_sql_adjacent_back_to_back_bookings():
    """
    Scenario: Direct SQL back-to-back bookings ([T1, T2) and [T2, T3)) for the same room.
    Guarantees: Half-open interval semantics allow adjacent bookings to commit concurrently.
    """
    with engine.connect() as conn:
        room_id = conn.execute(text("SELECT id FROM rooms WHERE status = 'AVAILABLE'")).scalar()
        user_id = conn.execute(text("SELECT id FROM users")).scalar()

    now = datetime.now(timezone.utc)
    base_time = now + timedelta(days=64, hours=8)
    s1 = base_time.strftime("%Y-%m-%d %H:%M:%S")
    e1 = (base_time + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
    s2 = e1
    e2 = (base_time + timedelta(hours=4)).strftime("%Y-%m-%d %H:%M:%S")

    t1_title = "DirectSQL Adjacent 1"
    t2_title = "DirectSQL Adjacent 2"

    try:
        def insert_slot(start_str, end_str, title):
            with engine.connect() as conn:
                trans = conn.begin()
                try:
                    conn.execute(text(f"""
                        INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status, created_at)
                        VALUES ({room_id}, {user_id}, '{title}',
                                TO_DATE('{start_str}', 'YYYY-MM-DD HH24:MI:SS'),
                                TO_DATE('{end_str}', 'YYYY-MM-DD HH24:MI:SS'),
                                'CONFIRMED', SYSDATE)
                    """))
                    trans.commit()
                    return "SUCCESS"
                except Exception:
                    trans.rollback()
                    raise

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(insert_slot, s1, e1, t1_title)
            f2 = executor.submit(insert_slot, s2, e2, t2_title)
            res1, res2 = f1.result(), f2.result()

        assert res1 == "SUCCESS"
        assert res2 == "SUCCESS"
    finally:
        with engine.begin() as conn:
            conn.execute(text(f"DELETE FROM bookings WHERE title IN ('{t1_title}', '{t2_title}')"))

@pytest.mark.skipif(not oracle_available, reason=skip_reason)
def test_oracle_direct_sql_concurrent_updates_to_booking_intervals():
    """
    Scenario: Concurrent updates to booking intervals.
    Guarantees: When two bookings exist and an UPDATE operation alters a booking's
    time window to overlap another existing confirmed booking, the compound trigger
    intercepts the UPDATE with ORA-20001 and rolls back the change cleanly.
    """
    with engine.connect() as conn:
        room_id = conn.execute(text("SELECT id FROM rooms WHERE status = 'AVAILABLE'")).scalar()
        user_id = conn.execute(text("SELECT id FROM users")).scalar()

    now = datetime.now(timezone.utc)
    base_time = now + timedelta(days=66, hours=9)
    s1 = base_time.strftime("%Y-%m-%d %H:%M:%S")
    e1 = (base_time + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
    s2 = (base_time + timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S")
    e2 = (base_time + timedelta(hours=4)).strftime("%Y-%m-%d %H:%M:%S")

    t1_title = "DirectSQL Interval Update 1"
    t2_title = "DirectSQL Interval Update 2"

    try:
        # Seed 2 distinct non-overlapping bookings
        with engine.begin() as conn:
            conn.execute(text(f"""
                INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status, created_at)
                VALUES ({room_id}, {user_id}, '{t1_title}',
                        TO_DATE('{s1}', 'YYYY-MM-DD HH24:MI:SS'),
                        TO_DATE('{e1}', 'YYYY-MM-DD HH24:MI:SS'),
                        'CONFIRMED', SYSDATE)
            """))
            conn.execute(text(f"""
                INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status, created_at)
                VALUES ({room_id}, {user_id}, '{t2_title}',
                        TO_DATE('{s2}', 'YYYY-MM-DD HH24:MI:SS'),
                        TO_DATE('{e2}', 'YYYY-MM-DD HH24:MI:SS'),
                        'CONFIRMED', SYSDATE)
            """))

        # Attempt to UPDATE 'Interval Update 1' so its end_time overlaps with 'Interval Update 2'
        conflict_end = (base_time + timedelta(hours=3, minutes=30)).strftime("%Y-%m-%d %H:%M:%S")

        with engine.connect() as conn:
            trans = conn.begin()
            update_failed = False
            try:
                conn.execute(text(f"""
                    UPDATE bookings
                    SET end_time = TO_DATE('{conflict_end}', 'YYYY-MM-DD HH24:MI:SS')
                    WHERE title = '{t1_title}'
                """))
                trans.commit()
            except Exception as ex:
                err = str(ex).lower()
                if "ora-20001" in err or "overlapping" in err:
                    update_failed = True
                trans.rollback()

        assert update_failed, "Compound trigger failed to prevent overlapping interval UPDATE!"

        # Verify that 'Interval Update 1' was NOT mutated due to clean rollback
        with engine.connect() as conn:
            end_time_db = conn.execute(text(
                f"SELECT TO_CHAR(end_time, 'YYYY-MM-DD HH24:MI:SS') FROM bookings WHERE title = '{t1_title}'"
            )).scalar()
            assert end_time_db == e1, f"Original end_time altered despite rollback! Got {end_time_db}, expected {e1}"
    finally:
        with engine.begin() as conn:
            conn.execute(text(f"DELETE FROM bookings WHERE title IN ('{t1_title}', '{t2_title}')"))

@pytest.mark.skipif(not oracle_available, reason=skip_reason)
def test_oracle_all_studio_queries():
    """Verifies that all 5 DBMS Studio queries execute without errors on Oracle SQL 21c."""
    db = SessionLocal()
    try:
        query_ids = [
            "multi_table_join",
            "aggregation_groupby",
            "not_exists_availability",
            "correlated_subquery",
            "view_query"
        ]
        for q_id in query_ids:
            res = CampusService.execute_analytics_query(db, q_id)
            assert res["row_count"] >= 0
            assert len(res["columns"]) > 0
            assert "execution_time_ms" in res
    finally:
        db.close()


