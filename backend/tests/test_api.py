import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}

def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert "CampusPulse" in res.json()["project"]

def test_dashboard_stats():
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert "stats" in data
    stats = data["stats"]
    assert stats["total_buildings"] >= 4
    assert stats["total_rooms"] >= 20
    assert stats["available_rooms"] > 0
    assert stats["total_bookings"] >= 10
    assert "booking_trends" in data
    assert "building_occupancy" in data
    assert len(data["building_occupancy"]) >= 4

def test_buildings_endpoint():
    res = client.get("/api/buildings")
    assert res.status_code == 200
    buildings = res.json()
    assert len(buildings) >= 4
    first = buildings[0]
    assert "code" in first
    assert "map_x" in first
    assert "map_y" in first
    assert "total_rooms" in first

def test_rooms_list_and_filters():
    res = client.get("/api/rooms")
    assert res.status_code == 200
    rooms = res.json()
    assert len(rooms) >= 20

    # Filter by room_type LAB
    res_lab = client.get("/api/rooms?room_type=LAB")
    assert res_lab.status_code == 200
    for r in res_lab.json():
        assert r["room_type"] == "LAB"

    # Filter by capacity
    res_cap = client.get("/api/rooms?min_capacity=100")
    assert res_cap.status_code == 200
    for r in res_cap.json():
        assert r["capacity"] >= 100

def test_not_exists_availability_query():
    now = datetime.now(timezone.utc)
    # Query for a future slot (40 days ahead)
    t_start = (now + timedelta(days=40, hours=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
    t_end = (now + timedelta(days=40, hours=12)).strftime("%Y-%m-%dT%H:%M:%SZ")

    res = client.get(f"/api/rooms/available?start_time={t_start}&end_time={t_end}")
    assert res.status_code == 200, res.text
    avail_rooms = res.json()
    # At 40 days ahead, non-maintenance rooms should be available
    assert len(avail_rooms) >= 15

def test_booking_creation_and_conflict_rejection():
    # 1. Fetch users and a room
    users = client.get("/api/users").json()
    assert len(users) >= 2
    user1_id = users[0]["id"]
    user2_id = users[1]["id"]

    rooms = client.get("/api/rooms?status=AVAILABLE").json()
    assert len(rooms) > 0
    test_room_id = rooms[0]["id"]

    now = datetime.now(timezone.utc)
    slot1_start = now + timedelta(days=15, hours=2)
    slot1_end = now + timedelta(days=15, hours=4)

    # 2. Create the first booking
    payload1 = {
        "room_id": test_room_id,
        "user_id": user1_id,
        "title": "Automated Unit Test - AI Ethics Seminar",
        "start_time": slot1_start.isoformat(),
        "end_time": slot1_end.isoformat()
    }
    res1 = client.post("/api/bookings", json=payload1)
    assert res1.status_code == 201, res1.text
    b1 = res1.json()
    booking1_id = b1["id"]
    assert b1["status"] == "CONFIRMED"

    # 3. Attempt to create an overlapping booking (starts 1 hour after first, overlaps)
    slot2_start = slot1_start + timedelta(hours=1)
    slot2_end = slot1_end + timedelta(hours=1)
    payload_conflict = {
        "room_id": test_room_id,
        "user_id": user2_id,
        "title": "Conflicting Session Attempt",
        "start_time": slot2_start.isoformat(),
        "end_time": slot2_end.isoformat()
    }
    res_conflict = client.post("/api/bookings", json=payload_conflict)
    # Must reject with 409 Conflict!
    assert res_conflict.status_code == 409, f"Expected 409, got {res_conflict.status_code}: {res_conflict.text}"
    detail = res_conflict.json()["detail"]
    assert "conflict" in detail["message"].lower()

    # 4. Cancel the first booking
    res_cancel = client.post(f"/api/bookings/{booking1_id}/cancel")
    assert res_cancel.status_code == 200
    assert res_cancel.json()["success"] is True

    # 5. After cancellation, the slot should now be bookable without conflict!
    res_retry = client.post("/api/bookings", json=payload_conflict)
    assert res_retry.status_code == 201
    # Cleanup: cancel the second booking
    client.post(f"/api/bookings/{res_retry.json()['id']}/cancel")

def test_back_to_back_bookings_accepted():
    """
    Half-open interval [start_time, end_time) rule:
    Booking A: 10:00 - 11:00
    Booking B: 11:00 - 12:00
    Must be allowed without conflict!
    """
    users = client.get("/api/users").json()
    rooms = client.get("/api/rooms?status=AVAILABLE").json()
    test_room_id = rooms[0]["id"]
    user_id = users[0]["id"]

    now = datetime.now(timezone.utc)
    t1 = now + timedelta(days=20, hours=10)
    t2 = now + timedelta(days=20, hours=11)
    t3 = now + timedelta(days=20, hours=12)

    payload_a = {
        "room_id": test_room_id,
        "user_id": user_id,
        "title": "Session A (10:00 - 11:00)",
        "start_time": t1.isoformat(),
        "end_time": t2.isoformat()
    }
    payload_b = {
        "room_id": test_room_id,
        "user_id": user_id,
        "title": "Session B (11:00 - 12:00) Back-to-Back",
        "start_time": t2.isoformat(),
        "end_time": t3.isoformat()
    }

    res_a = client.post("/api/bookings", json=payload_a)
    assert res_a.status_code == 201, f"Session A failed: {res_a.text}"
    id_a = res_a.json()["id"]

    # Back-to-back immediately adjacent must SUCCEED
    res_b = client.post("/api/bookings", json=payload_b)
    assert res_b.status_code == 201, f"Session B back-to-back failed: {res_b.text}"
    id_b = res_b.json()["id"]

    # Cleanup
    client.post(f"/api/bookings/{id_a}/cancel")
    client.post(f"/api/bookings/{id_b}/cancel")

def test_different_rooms_concurrent_bookings():
    """
    Bookings in different rooms during the exact same time interval must be allowed.
    """
    users = client.get("/api/users").json()
    rooms = client.get("/api/rooms?status=AVAILABLE").json()
    assert len(rooms) >= 2
    room1_id = rooms[0]["id"]
    room2_id = rooms[1]["id"]
    user_id = users[0]["id"]

    now = datetime.now(timezone.utc)
    t_start = now + timedelta(days=25, hours=14)
    t_end = now + timedelta(days=25, hours=16)

    res1 = client.post("/api/bookings", json={
        "room_id": room1_id,
        "user_id": user_id,
        "title": "Parallel Room 1 Session",
        "start_time": t_start.isoformat(),
        "end_time": t_end.isoformat()
    })
    assert res1.status_code == 201

    res2 = client.post("/api/bookings", json={
        "room_id": room2_id,
        "user_id": user_id,
        "title": "Parallel Room 2 Session",
        "start_time": t_start.isoformat(),
        "end_time": t_end.isoformat()
    })
    assert res2.status_code == 201

    # Cleanup
    client.post(f"/api/bookings/{res1.json()['id']}/cancel")
    client.post(f"/api/bookings/{res2.json()['id']}/cancel")

def test_invalid_booking_time_interval():
    users = client.get("/api/users").json()
    rooms = client.get("/api/rooms").json()
    now = datetime.now(timezone.utc)

    # End time before start time
    invalid_payload = {
        "room_id": rooms[0]["id"],
        "user_id": users[0]["id"],
        "title": "Invalid Time Booking",
        "start_time": (now + timedelta(hours=4)).isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat()
    }
    res = client.post("/api/bookings", json=invalid_payload)
    assert res.status_code == 400

def test_maintenance_room_status_transitions():
    """
    Verifies the maintenance room-status policy:
    1. Room with CRITICAL ticket goes into MAINTENANCE.
    2. Room cannot be booked while in MAINTENANCE.
    3. Resolving one of several active tickets maintains room in MAINTENANCE.
    4. Resolving the last ticket restores AVAILABLE status.
    """
    users = client.get("/api/users").json()
    rooms = client.get("/api/rooms?status=AVAILABLE").json()
    target_room = rooms[0]
    room_id = target_room["id"]

    # 1. Create CRITICAL ticket -> Room should become MAINTENANCE
    res_t1 = client.post("/api/maintenance", json={
        "room_id": room_id,
        "user_id": users[0]["id"],
        "title": "Primary Power Transformer Surge",
        "description": "HV breaker trip in lab zone.",
        "priority": "CRITICAL"
    })
    assert res_t1.status_code == 201
    ticket1_id = res_t1.json()["id"]

    # Verify room status is now MAINTENANCE
    r_check = client.get(f"/api/rooms/{room_id}").json()
    assert r_check["status"] == "MAINTENANCE"

    # 2. Attempt to book room under MAINTENANCE -> Rejected with 400!
    now = datetime.now(timezone.utc)
    res_book = client.post("/api/bookings", json={
        "room_id": room_id,
        "user_id": users[0]["id"],
        "title": "Attempted Booking Under Maintenance",
        "start_time": (now + timedelta(days=5, hours=1)).isoformat(),
        "end_time": (now + timedelta(days=5, hours=3)).isoformat()
    })
    assert res_book.status_code == 400
    assert "maintenance" in res_book.json()["detail"].lower()

    # 3. Create a second ticket for the same room (HIGH priority)
    res_t2 = client.post("/api/maintenance", json={
        "room_id": room_id,
        "user_id": users[0]["id"],
        "title": "Cooling Duct Fan Vibration",
        "description": "Secondary fan bearing noise.",
        "priority": "HIGH"
    })
    assert res_t2.status_code == 201
    ticket2_id = res_t2.json()["id"]

    # 4. Resolve the first ticket -> Since ticket 2 is still OPEN, room must STAY in MAINTENANCE!
    res_resolve1 = client.patch(f"/api/maintenance/{ticket1_id}/status", json={"status": "RESOLVED"})
    assert res_resolve1.status_code == 200

    r_check2 = client.get(f"/api/rooms/{room_id}").json()
    assert r_check2["status"] == "MAINTENANCE", "Room should stay MAINTENANCE while another ticket is active"

    # 5. Resolve the second ticket -> Last ticket resolved, room should restore to AVAILABLE
    res_resolve2 = client.patch(f"/api/maintenance/{ticket2_id}/status", json={"status": "RESOLVED"})
    assert res_resolve2.status_code == 200

    r_check3 = client.get(f"/api/rooms/{room_id}").json()
    assert r_check3["status"] == "AVAILABLE", "Room should return to AVAILABLE after all tickets are resolved"

def test_event_validation_and_room_building_consistency():
    """
    Verifies event validation:
    1. Interval validity (end > start).
    2. Room-building consistency (room must belong to the specified building).
    3. Upcoming events query filtering.
    """
    buildings = client.get("/api/buildings").json()
    assert len(buildings) >= 2
    b1 = buildings[0]
    b2 = buildings[1]

    # Find a room belonging to building 1
    rooms_b1 = client.get(f"/api/rooms?building_id={b1['id']}").json()
    assert len(rooms_b1) > 0
    room_b1 = rooms_b1[0]

    now = datetime.now(timezone.utc)
    t_start = now + timedelta(days=12, hours=10)
    t_end = now + timedelta(days=12, hours=14)

    # 1. Invalid time interval (end < start) -> 400
    res_invalid_time = client.post("/api/events", json={
        "title": "Invalid Event",
        "building_id": b1["id"],
        "room_id": room_b1["id"],
        "start_time": t_end.isoformat(),
        "end_time": t_start.isoformat(),
        "category": "TECH"
    })
    assert res_invalid_time.status_code == 400

    # 2. Room belongs to Building 1, but request specifies Building 2 -> 400 Mismatch!
    res_mismatch = client.post("/api/events", json={
        "title": "Mismatched Event",
        "building_id": b2["id"],
        "room_id": room_b1["id"],
        "start_time": t_start.isoformat(),
        "end_time": t_end.isoformat(),
        "category": "TECH"
    })
    assert res_mismatch.status_code == 400
    assert "belong" in res_mismatch.json()["detail"].lower()

    # 3. Valid event creation with matching building and room -> 201
    res_valid = client.post("/api/events", json={
        "title": "Quantum Photonics Symposium 2026",
        "description": "Frontier research keynote.",
        "building_id": b1["id"],
        "room_id": room_b1["id"],
        "start_time": t_start.isoformat(),
        "end_time": t_end.isoformat(),
        "category": "TECH"
    })
    assert res_valid.status_code == 201
    assert res_valid.json()["building_id"] == b1["id"]
    assert res_valid.json()["room_id"] == room_b1["id"]

def test_analytics_queries():
    query_ids = [
        "multi_table_join",
        "aggregation_groupby",
        "not_exists_availability",
        "correlated_subquery",
        "view_query"
    ]
    for q_id in query_ids:
        res = client.post(f"/api/analytics/execute/{q_id}")
        assert res.status_code == 200, f"Query {q_id} failed: {res.text}"
        data = res.json()
        assert "execution_time_ms" in data
        assert "columns" in data
        assert "data" in data
        assert data["row_count"] >= 0

def test_analytics_unknown_query_404():
    """
    Requesting an unknown query ID must return HTTP 404 Not Found,
    never silently substituting a default query.
    """
    res = client.post("/api/analytics/execute/unknown_nonexistent_query")
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"

def test_analytics_aggregation_no_multiplication():
    """
    Regression check for aggregation_groupby:
    Verifies that total_rooms in aggregation matches actual count of rooms per building,
    and is NOT multiplied by the number of maintenance tickets.
    """
    res = client.post("/api/analytics/execute/aggregation_groupby")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) > 0

    # Get actual building room counts from buildings endpoint
    bldgs = client.get("/api/buildings").json()
    b_map = {b["code"]: b["total_rooms"] for b in bldgs}

    for row in data:
        code = row["building_code"]
        reported_rooms = row["total_rooms"]
        expected_rooms = b_map.get(code)
        assert reported_rooms == expected_rooms, (
            f"Building {code} room count was {reported_rooms}, expected {expected_rooms}. "
            "Possible Cartesian product in JOIN."
        )

def test_dashboard_view_regression():
    """
    Regression test for v_dashboard_summary view existence.
    Ensures that the view exists and returns valid building occupancy data.
    """
    res = client.post("/api/analytics/execute/view_query")
    assert res.status_code == 200, f"View query failed: {res.text}"
    result = res.json()
    assert result["row_count"] >= 4
    for row in result["data"]:
        assert "building_code" in row
        assert "occupancy_rate" in row
