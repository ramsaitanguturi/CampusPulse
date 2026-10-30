"""Comprehensive Database Integrity, Constraints, and ACID Transaction Tests.

Verifies:
- Foreign-key integrity and referential constraints
- Unique constraints
- Domain CHECK constraints
- Direct SQL PL/SQL trigger conflict enforcement
- Transaction Atomicity and complete rollback behavior
- Database Views accuracy and calculations
- Lifecycle of room bookings, cancellations, and status restoration
"""

import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, DatabaseError
from app.database import engine, SessionLocal
from app.models.entities import User, Building, Room, Booking, MaintenanceTicket
from app.services.campus_service import CampusService, ConflictError
from app.schemas.schemas import BookingCreate


def is_oracle_db() -> bool:
    return "oracle" in str(engine.url)


def test_foreign_key_violation_orphaned_room():
    """Verifies that inserting a room with a non-existent building_id is rejected by FK."""
    db = SessionLocal()
    try:
        orphaned_room = Room(
            building_id=999999,  # Non-existent building ID
            room_number="GHOST-1",
            floor=1,
            capacity=30,
            room_type="CLASSROOM",
            status="AVAILABLE",
            has_projector=True,
            has_ac=True
        )
        db.add(orphaned_room)
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_foreign_key_violation_orphaned_booking():
    """Verifies that creating a booking with an invalid user or room fails referential integrity."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        orphaned_booking = Booking(
            room_id=999999,
            user_id=999999,
            title="Orphaned Booking",
            start_time=now + timedelta(days=1),
            end_time=now + timedelta(days=1, hours=2),
            status="CONFIRMED"
        )
        db.add(orphaned_booking)
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_unique_constraint_user_email():
    """Verifies that duplicate user emails violate the UNIQUE constraint."""
    db = SessionLocal()
    try:
        first_user = db.query(User).first()
        assert first_user is not None

        duplicate_user = User(
            name="Imposter Clone",
            email=first_user.email,  # Duplicate email
            role="STUDENT",
            department="Physics"
        )
        db.add(duplicate_user)
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_unique_constraint_room_number_per_building():
    """Verifies composite UNIQUE constraint (building_id, room_number)."""
    db = SessionLocal()
    try:
        existing_room = db.query(Room).first()
        assert existing_room is not None

        duplicate_room = Room(
            building_id=existing_room.building_id,
            room_number=existing_room.room_number,  # Same number in same building
            floor=existing_room.floor,
            capacity=40,
            room_type="LAB",
            status="AVAILABLE",
            has_projector=True,
            has_ac=True
        )
        db.add(duplicate_room)
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_check_constraint_room_capacity_positive():
    """Verifies CHECK constraint chk_room_capacity_positive (capacity > 0)."""
    db = SessionLocal()
    try:
        bld = db.query(Building).first()
        invalid_room = Room(
            building_id=bld.id,
            room_number="NEG-001",
            floor=1,
            capacity=-10,  # Invalid capacity <= 0
            room_type="CLASSROOM",
            status="AVAILABLE",
            has_projector=True,
            has_ac=True
        )
        db.add(invalid_room)
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_check_constraint_user_role():
    """Verifies CHECK constraint chk_user_role."""
    db = SessionLocal()
    try:
        invalid_user = User(
            name="Invalid Role User",
            email="invalid_role_test@univ.edu",
            role="UNAUTHORIZED_ROLE",  # Not in ('STUDENT', 'FACULTY', 'ADMIN', 'STAFF')
            department="IT"
        )
        db.add(invalid_user)
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_check_constraint_booking_times_valid():
    """Verifies CHECK constraint chk_booking_times_valid (end_time > start_time)."""
    db = SessionLocal()
    try:
        room = db.query(Room).first()
        user = db.query(User).first()
        now = datetime.now(timezone.utc)
        
        # end_time BEFORE start_time
        invalid_booking = Booking(
            room_id=room.id,
            user_id=user.id,
            title="Time Traveler Booking",
            start_time=now + timedelta(hours=5),
            end_time=now + timedelta(hours=2),
            status="CONFIRMED"
        )
        db.add(invalid_booking)
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_booking_maintenance_room_rejection():
    """Verifies that rooms marked as MAINTENANCE cannot be booked."""
    db = SessionLocal()
    try:
        # Find or temporarily set a room to MAINTENANCE
        maint_room = db.query(Room).filter(Room.status == "MAINTENANCE").first()
        if not maint_room:
            maint_room = db.query(Room).first()
            maint_room.status = "MAINTENANCE"
            db.commit()

        user = db.query(User).first()
        now = datetime.now(timezone.utc)
        payload = BookingCreate(
            room_id=maint_room.id,
            user_id=user.id,
            title="Attempt Maintenance Room Booking",
            start_time=now + timedelta(days=20, hours=10),
            end_time=now + timedelta(days=20, hours=12)
        )
        with pytest.raises(ValueError) as exc_info:
            CampusService.create_booking(db, payload)
        assert "maintenance" in str(exc_info.value).lower()
    finally:
        db.rollback()
        db.close()


def test_oracle_trigger_direct_sql_conflict_rejection():
    """
    Direct SQL bypass test:
    Inserts a booking directly via SQL, then executes a second overlapping INSERT
    bypassing all Python application checks.
    On Oracle, the compound trigger trg_no_overlapping_bookings must intercept it
    and raise ORA-20001.
    """
    if not is_oracle_db():
        pytest.skip("Direct SQL compound trigger test runs exclusively on Oracle Database.")

    db = SessionLocal()
    try:
        room = db.query(Room).first()
        user = db.query(User).first()
        room_id = room.id
        user_id = user.id

        now = datetime.now(timezone.utc)
        s1 = (now + timedelta(days=35, hours=10)).strftime("%Y-%m-%d %H:%M:%S")
        e1 = (now + timedelta(days=35, hours=12)).strftime("%Y-%m-%d %H:%M:%S")

        # First direct SQL insert
        sql1 = text(f"""
            INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status, created_at)
            VALUES ({room_id}, {user_id}, 'Direct SQL Seed 1', 
                    TO_DATE('{s1}', 'YYYY-MM-DD HH24:MI:SS'), 
                    TO_DATE('{e1}', 'YYYY-MM-DD HH24:MI:SS'), 
                    'CONFIRMED', SYSDATE)
        """)
        db.execute(sql1)
        db.flush()

        # Overlapping second direct SQL insert (11:00 to 13:00)
        s2 = (now + timedelta(days=35, hours=11)).strftime("%Y-%m-%d %H:%M:%S")
        e2 = (now + timedelta(days=35, hours=13)).strftime("%Y-%m-%d %H:%M:%S")

        sql2 = text(f"""
            INSERT INTO bookings (room_id, user_id, title, start_time, end_time, status, created_at)
            VALUES ({room_id}, {user_id}, 'Direct SQL Overlap Attempt', 
                    TO_DATE('{s2}', 'YYYY-MM-DD HH24:MI:SS'), 
                    TO_DATE('{e2}', 'YYYY-MM-DD HH24:MI:SS'), 
                    'CONFIRMED', SYSDATE)
        """)
        with pytest.raises(DatabaseError) as exc_info:
            db.execute(sql2)
            db.flush()

        err_str = str(exc_info.value).lower()
        assert "ora-20001" in err_str or "overlapping" in err_str

    finally:
        db.rollback()
        db.close()


def test_transaction_atomicity_and_rollback():
    """
    Demonstrates ACID Atomicity:
    Executes multiple DML operations in a transaction. When an error is encountered midway,
    all changes in the transaction are rolled back cleanly with zero partial changes committed.
    """
    db = SessionLocal()
    initial_tickets_count = db.query(MaintenanceTicket).count()
    initial_user_count = db.query(User).count()

    try:
        # Step 1: Valid User creation
        valid_user = User(
            name="Atomicity Test User",
            email="atomicity_test@univ.edu",
            role="STUDENT",
            department="Computer Science"
        )
        db.add(valid_user)
        db.flush()

        # Step 2: Invalid Ticket creation violating foreign key constraint
        invalid_ticket = MaintenanceTicket(
            room_id=999999,  # Non-existent room ID triggers FK violation
            user_id=valid_user.id,
            title="Failing Step Ticket",
            description="This step intentionally fails to verify atomicity rollback.",
            priority="HIGH",
            status="OPEN"
        )
        db.add(invalid_ticket)
        # Attempt to commit: Must raise IntegrityError
        db.commit()

    except Exception:
        db.rollback()

    finally:
        db.close()

    # Re-query in a fresh session to verify Durability & Consistency
    verify_db = SessionLocal()
    try:
        after_tickets = verify_db.query(MaintenanceTicket).count()
        after_users = verify_db.query(User).count()
        # Atomicity Guarantee: Both counts MUST remain unchanged
        assert after_tickets == initial_tickets_count, "Ticket count changed despite rollback!"
        assert after_users == initial_user_count, "User persisted despite failed transaction rollback!"
        
        # Verify the user does NOT exist
        leaked_user = verify_db.query(User).filter(User.email == "atomicity_test@univ.edu").first()
        assert leaked_user is None, "Partial data leaked into database!"
    finally:
        verify_db.close()


def test_views_correctness_and_consistency():
    """
    Verifies the mathematical correctness and data consistency of views:
    - v_dashboard_summary: total_rooms = available + occupied + maintenance
    - v_room_live_status: returns room records with valid building joins
    """
    db = SessionLocal()
    try:
        # 1. Test v_dashboard_summary
        summary_rows = db.execute(text("""
            SELECT building_code, total_rooms, available_rooms, occupied_rooms, maintenance_rooms, occupancy_rate
            FROM v_dashboard_summary
        """)).fetchall()

        assert len(summary_rows) >= 4, f"Expected at least 4 buildings in summary, got {len(summary_rows)}"

        for row in summary_rows:
            b_code, tot, avail, occ, maint, rate = row
            tot = tot or 0
            avail = avail or 0
            occ = occ or 0
            maint = maint or 0
            rate = float(rate or 0)
            # Consistency: total_rooms must match sum of partitioned statuses
            assert tot == (avail + occ + maint), f"Building {b_code} room count mismatch: {tot} != {avail}+{occ}+{maint}"
            # Rate must be between 0 and 100
            assert 0.0 <= rate <= 100.0, f"Invalid occupancy rate {rate} for building {b_code}"

        # 2. Test v_room_live_status
        live_rows = db.execute(text("""
            SELECT room_id, room_number, building_code, building_name
            FROM v_room_live_status
        """)).fetchall()

        assert len(live_rows) >= 20, f"Expected at least 20 rooms in live status, got {len(live_rows)}"
        for r_id, r_num, b_code, b_name in live_rows:
            assert r_id > 0
            assert len(r_num) > 0
            assert len(b_code) > 0
            assert len(b_name) > 0

    finally:
        db.close()


def test_cancelled_booking_permits_new_booking():
    """
    Verifies that when a booking is cancelled, the time slot immediately becomes available,
    and a subsequent booking by another user succeeds without conflict.
    """
    db = SessionLocal()
    try:
        room = db.query(Room).filter(Room.status == "AVAILABLE").first()
        users = db.query(User).all()
        assert len(users) >= 2

        user1, user2 = users[0], users[1]
        now = datetime.now(timezone.utc)
        slot_start = now + timedelta(days=40, hours=14)
        slot_end = now + timedelta(days=40, hours=16)

        # 1. Create booking by user 1
        b1_data = BookingCreate(
            room_id=room.id,
            user_id=user1.id,
            title="Initial Booking by User 1",
            start_time=slot_start,
            end_time=slot_end
        )
        b1_res = CampusService.create_booking(db, b1_data)
        assert b1_res["status"] == "CONFIRMED"
        b1_id = b1_res["id"]

        # 2. Attempt overlapping booking by user 2 -> MUST FAIL with ConflictError
        b2_conflict_data = BookingCreate(
            room_id=room.id,
            user_id=user2.id,
            title="Conflicting Booking by User 2",
            start_time=slot_start,
            end_time=slot_end
        )
        with pytest.raises(ConflictError):
            CampusService.create_booking(db, b2_conflict_data)

        # 3. Cancel user 1's booking
        cancel_success = CampusService.cancel_booking(db, b1_id)
        assert cancel_success is True

        # 4. User 2 now books the exact same slot -> MUST SUCCEED
        b2_success = CampusService.create_booking(db, b2_conflict_data)
        assert b2_success["status"] == "CONFIRMED"
        assert b2_success["id"] != b1_id

        # Clean up
        CampusService.cancel_booking(db, b2_success["id"])

    finally:
        db.close()

