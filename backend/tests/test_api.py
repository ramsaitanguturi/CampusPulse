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
    # Query for a future slot (30 days ahead)
    t_start = (now + timedelta(days=30, hours=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
    t_end = (now + timedelta(days=30, hours=12)).strftime("%Y-%m-%dT%H:%M:%SZ")

    res = client.get(f"/api/rooms/available?start_time={t_start}&end_time={t_end}")
    assert res.status_code == 200, res.text
    avail_rooms = res.json()
    # At 30 days ahead, all non-maintenance rooms should be available
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

def test_maintenance_ticket_lifecycle():
    users = client.get("/api/users").json()
    rooms = client.get("/api/rooms").json()

    # 1. Create ticket
    payload = {
        "room_id": rooms[0]["id"],
        "user_id": users[0]["id"],
        "title": "Air Quality Sensor Drift",
        "description": "CO2 readings elevated due to calibration drift.",
        "priority": "LOW"
    }
    res_create = client.post("/api/maintenance", json=payload)
    assert res_create.status_code == 201
    ticket = res_create.json()
    ticket_id = ticket["id"]
    assert ticket["status"] == "OPEN"

    # 2. Update to IN_PROGRESS
    res_progress = client.patch(f"/api/maintenance/{ticket_id}/status", json={"status": "IN_PROGRESS"})
    assert res_progress.status_code == 200
    assert res_progress.json()["status"] == "IN_PROGRESS"

    # 3. Update to RESOLVED
    res_resolved = client.patch(f"/api/maintenance/{ticket_id}/status", json={"status": "RESOLVED"})
    assert res_resolved.status_code == 200
    assert res_resolved.json()["status"] == "RESOLVED"
    assert res_resolved.json()["resolved_at"] is not None

def test_event_creation():
    buildings = client.get("/api/buildings").json()
    now = datetime.now(timezone.utc)

    payload = {
        "title": "Smart Campus Demo Day",
        "description": "Live presentation of student semester projects.",
        "building_id": buildings[0]["id"],
        "start_time": (now + timedelta(days=12, hours=10)).isoformat(),
        "end_time": (now + timedelta(days=12, hours=14)).isoformat(),
        "category": "ACADEMIC"
    }
    res = client.post("/api/events", json=payload)
    assert res.status_code == 201
    assert res.json()["title"] == "Smart Campus Demo Day"

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
