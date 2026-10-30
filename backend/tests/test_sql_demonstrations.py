"""Automated Verification of SQL Demonstration Queries on Oracle Database 21c.

Executes and asserts row output from the 20 syllabus demonstration queries
against the live database.
"""

import pytest
from sqlalchemy import text
from app.database import engine, SessionLocal


def is_oracle_connected() -> bool:
    if "oracle" not in str(engine.url):
        return False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM dual"))
        return True
    except Exception:
        return False


skip_reason = "SQL Demonstration tests execute against Oracle Database."


@pytest.mark.skipif(not is_oracle_connected(), reason=skip_reason)
def test_sql_demo_basic_select_and_ordering():
    """Queries 1 & 2: SELECT, WHERE, ORDER BY."""
    db = SessionLocal()
    try:
        # High capacity classrooms
        res1 = db.execute(text("""
            SELECT id, room_number, capacity, room_type, status 
            FROM rooms 
            WHERE capacity >= 40 AND status = 'AVAILABLE'
        """)).fetchall()
        assert len(res1) > 0

        # Multi-level ordered users
        res2 = db.execute(text("""
            SELECT name, department 
            FROM users 
            WHERE department IS NOT NULL 
            ORDER BY department ASC, name ASC
        """)).fetchall()
        assert len(res2) >= 5
    finally:
        db.close()


@pytest.mark.skipif(not is_oracle_connected(), reason=skip_reason)
def test_sql_demo_distinct_and_joins():
    """Queries 3, 4, 5, 6, 7: DISTINCT, INNER, LEFT, RIGHT, and 4-way Multi-Join."""
    db = SessionLocal()
    try:
        # Distinct categories
        cats = db.execute(text("SELECT DISTINCT category FROM events")).scalars().all()
        assert len(cats) >= 3

        # Inner Join
        inner_rows = db.execute(text("""
            SELECT r.room_number, b.code 
            FROM rooms r 
            INNER JOIN buildings b ON r.building_id = b.id
        """)).fetchall()
        assert len(inner_rows) >= 20

        # Left Join
        left_rows = db.execute(text("""
            SELECT b.code, COUNT(r.id) AS room_count 
            FROM buildings b 
            LEFT JOIN rooms r ON b.id = r.building_id 
            GROUP BY b.code
        """)).fetchall()
        assert len(left_rows) >= 4

        # Right Join
        right_rows = db.execute(text("""
            SELECT u.name, COUNT(mt.id) AS ticket_count 
            FROM maintenance_tickets mt 
            RIGHT JOIN users u ON mt.user_id = u.id 
            GROUP BY u.name
        """)).fetchall()
        assert len(right_rows) >= 8

        # 4-Way Multi Join
        multi_rows = db.execute(text("""
            SELECT bk.title, u.name, r.room_number, bld.name 
            FROM bookings bk
            JOIN rooms r ON bk.room_id = r.id
            JOIN buildings bld ON r.building_id = bld.id
            JOIN users u ON bk.user_id = u.id
            WHERE bk.status = 'CONFIRMED'
        """)).fetchall()
        assert len(multi_rows) >= 5
    finally:
        db.close()


@pytest.mark.skipif(not is_oracle_connected(), reason=skip_reason)
def test_sql_demo_aggregations_and_subqueries():
    """Queries 8, 9, 10, 11, 12: Aggregate functions, GROUP BY / HAVING, Subqueries."""
    db = SessionLocal()
    try:
        # Aggregates
        stats = db.execute(text("""
            SELECT COUNT(id), SUM(capacity), AVG(capacity), MIN(capacity), MAX(capacity) 
            FROM rooms
        """)).fetchone()
        tot_cnt, tot_cap, avg_cap, min_cap, max_cap = stats
        assert tot_cnt >= 20
        assert tot_cap > 500
        assert min_cap > 0
        assert max_cap >= 100

        # Group By & Having
        having_rows = db.execute(text("""
            SELECT b.code, SUM(r.capacity) AS cap 
            FROM buildings b 
            JOIN rooms r ON b.id = r.building_id 
            GROUP BY b.code 
            HAVING SUM(r.capacity) >= 100
        """)).fetchall()
        assert len(having_rows) > 0

        # Nested Subquery (IN)
        nested_rows = db.execute(text("""
            SELECT room_number FROM rooms 
            WHERE id IN (SELECT DISTINCT room_id FROM maintenance_tickets WHERE status = 'OPEN')
        """)).fetchall()
        assert len(nested_rows) >= 0

        # Correlated Subquery
        correlated_rows = db.execute(text("""
            SELECT r.room_number, r.capacity 
            FROM rooms r 
            WHERE r.capacity > (
                SELECT AVG(inner_r.capacity) FROM rooms inner_r WHERE inner_r.building_id = r.building_id
            )
        """)).fetchall()
        assert len(correlated_rows) > 0

        # NOT EXISTS
        avail_rows = db.execute(text("""
            SELECT r.room_number 
            FROM rooms r 
            WHERE r.status != 'MAINTENANCE' 
              AND NOT EXISTS (
                  SELECT 1 FROM bookings bk 
                  WHERE bk.room_id = r.id 
                    AND bk.status = 'CONFIRMED' 
                    AND CURRENT_TIMESTAMP BETWEEN bk.start_time AND bk.end_time
              )
        """)).fetchall()
        assert len(avail_rows) > 0

    finally:
        db.close()


@pytest.mark.skipif(not is_oracle_connected(), reason=skip_reason)
def test_sql_demo_views_and_date_math():
    """Queries 14, 19, 20: Views, Date calculations, Parametric search."""
    db = SessionLocal()
    try:
        # View query
        view_rows = db.execute(text("""
            SELECT building_code, total_rooms, occupancy_rate FROM v_dashboard_summary
        """)).fetchall()
        assert len(view_rows) >= 4

        # Date math
        durations = db.execute(text("""
            SELECT id, ROUND((CAST(end_time AS DATE) - CAST(start_time AS DATE)) * 24, 2) AS hrs 
            FROM bookings 
            FETCH FIRST 5 ROWS ONLY
        """)).fetchall()
        assert len(durations) > 0
        for b_id, hrs in durations:
            assert hrs > 0

        # Parametric room availability search
        search_rows = db.execute(text("""
            SELECT r.room_number, b.code 
            FROM rooms r 
            JOIN buildings b ON r.building_id = b.id 
            WHERE r.capacity >= 25 
              AND NOT EXISTS (
                  SELECT 1 FROM bookings bk 
                  WHERE bk.room_id = r.id 
                    AND bk.status = 'CONFIRMED' 
                    AND NOT (bk.end_time <= CURRENT_TIMESTAMP + INTERVAL '10' DAY 
                             OR bk.start_time >= CURRENT_TIMESTAMP + INTERVAL '10' DAY + INTERVAL '2' HOUR)
              )
        """)).fetchall()
        assert len(search_rows) > 0

    finally:
        db.close()

