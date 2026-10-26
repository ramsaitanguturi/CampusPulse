import pytest
import os
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
def test_oracle_row_locking_select_for_update():
    """
    Verifies that pessimistic row-level locking (SELECT ... FOR UPDATE)
    executes cleanly on Oracle and acquires row locks.
    """
    db = SessionLocal()
    try:
        first_room = db.query(Room).first()
        assert first_room is not None
        room = db.query(Room).filter(Room.id == first_room.id).with_for_update().one_or_none()
        assert room is not None
        assert room.id > 0
        db.rollback()
    finally:
        db.close()

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
