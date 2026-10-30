import pytest
import concurrent.futures
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine

def is_oracle_db() -> bool:
    return "oracle" in str(engine.url)

def test_concurrent_booking_conflict():
    """
    Simulates simultaneous booking requests attempting to book the exact same room
    for the exact same time slot across 4 parallel threads.
    Verifies that the Oracle row-level locking (SELECT ... FOR UPDATE) and transaction
    isolation guarantees:
    - Exactly ONE booking succeeds (HTTP 201).
    - The conflicting concurrent requests are rejected with HTTP 409 Conflict.
    - Zero duplicate bookings exist in the database.
    """
    if not is_oracle_db():
        pytest.skip("Row-level concurrent locking test requires Oracle Database (Authoritative Database)")
    client = TestClient(app)
    users = client.get("/api/users").json()
    rooms = client.get("/api/rooms?status=AVAILABLE").json()
    assert len(users) >= 4
    assert len(rooms) >= 1

    test_room_id = rooms[0]["id"]
    now = datetime.now(timezone.utc)
    slot_start = now + timedelta(days=50, hours=10)
    slot_end = now + timedelta(days=50, hours=12)

    def attempt_booking(user_idx: int):
        thread_client = TestClient(app)
        payload = {
            "room_id": test_room_id,
            "user_id": users[user_idx]["id"],
            "title": f"Concurrent Attempt by User {user_idx}",
            "start_time": slot_start.isoformat(),
            "end_time": slot_end.isoformat()
        }
        return thread_client.post("/api/bookings", json=payload)

    # Launch 4 concurrent threads targeting the exact same room and slot
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(attempt_booking, i) for i in range(4)]
        responses = [f.result() for f in concurrent.futures.as_completed(futures)]

    status_codes = [r.status_code for r in responses]
    success_count = status_codes.count(201)
    conflict_count = status_codes.count(409)

    # Exactly one must succeed, all other overlapping concurrent requests must be rejected
    assert success_count == 1, f"Expected exactly 1 booking success, got {success_count}. Statuses: {status_codes}"
    assert conflict_count == 3, f"Expected 3 conflict rejections (409), got {conflict_count}. Statuses: {status_codes}"

    # Cleanup the successful booking
    for r in responses:
        if r.status_code == 201:
            booking_id = r.json()["id"]
            client.post(f"/api/bookings/{booking_id}/cancel")


def test_concurrent_two_simultaneous_api_requests_same_room_and_time():
    """
    Scenario: Two simultaneous API requests for the exact same room and time.
    Guarantees:
    - Only one conflicting booking can commit (HTTP 201).
    - The second request is rejected with HTTP 409 Conflict.
    - Zero partial data is leaked.
    """
    if not is_oracle_db():
        pytest.skip("Row-level concurrent locking test requires Oracle Database")
    client = TestClient(app)
    users = client.get("/api/users").json()
    rooms = client.get("/api/rooms?status=AVAILABLE").json()
    assert len(users) >= 2
    assert len(rooms) >= 1

    room_id = rooms[0]["id"]
    now = datetime.now(timezone.utc)
    slot_start = now + timedelta(days=51, hours=9)
    slot_end = now + timedelta(days=51, hours=11)

    def book(idx: int):
        c = TestClient(app)
        return c.post("/api/bookings", json={
            "room_id": room_id,
            "user_id": users[idx]["id"],
            "title": f"Simultaneous Pair {idx}",
            "start_time": slot_start.isoformat(),
            "end_time": slot_end.isoformat()
        })

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(book, 0)
        f2 = executor.submit(book, 1)
        r1, r2 = f1.result(), f2.result()

    statuses = [r1.status_code, r2.status_code]
    assert statuses.count(201) == 1, f"Expected exactly 1 success, got {statuses}"
    assert statuses.count(409) == 1, f"Expected exactly 1 409 conflict, got {statuses}"

    # Clean up
    for r in (r1, r2):
        if r.status_code == 201:
            client.post(f"/api/bookings/{r.json()['id']}/cancel")


def test_concurrent_different_rooms_api_bookings():
    """
    Scenario: Concurrent bookings for different rooms at the exact same time.
    Expected: Different rooms can be booked concurrently without blocking or conflict.
    """
    if not is_oracle_db():
        pytest.skip("Concurrent booking test requires Oracle Database")
    client = TestClient(app)
    users = client.get("/api/users").json()
    rooms = client.get("/api/rooms?status=AVAILABLE").json()
    assert len(rooms) >= 2
    assert len(users) >= 2

    room_a = rooms[0]["id"]
    room_b = rooms[1]["id"]
    now = datetime.now(timezone.utc)
    slot_start = now + timedelta(days=52, hours=14)
    slot_end = now + timedelta(days=52, hours=16)

    def book_room(room_id, user_id, title):
        c = TestClient(app)
        return c.post("/api/bookings", json={
            "room_id": room_id,
            "user_id": user_id,
            "title": title,
            "start_time": slot_start.isoformat(),
            "end_time": slot_end.isoformat()
        })

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(book_room, room_a, users[0]["id"], "Room A Booking")
        f2 = executor.submit(book_room, room_b, users[1]["id"], "Room B Booking")
        r1, r2 = f1.result(), f2.result()

    assert r1.status_code == 201, f"Room A booking failed: {r1.text}"
    assert r2.status_code == 201, f"Room B booking failed: {r2.text}"

    # Cleanup
    client.post(f"/api/bookings/{r1.json()['id']}/cancel")
    client.post(f"/api/bookings/{r2.json()['id']}/cancel")


def test_concurrent_adjacent_back_to_back_api_bookings():
    """
    Scenario: Back-to-back adjacent bookings for the same room ([T1, T2) and [T2, T3)).
    Expected: Adjacent bookings succeed concurrently with 201 Created under half-open semantics.
    """
    if not is_oracle_db():
        pytest.skip("Concurrent booking test requires Oracle Database")
    client = TestClient(app)
    users = client.get("/api/users").json()
    rooms = client.get("/api/rooms?status=AVAILABLE").json()
    assert len(rooms) >= 1
    assert len(users) >= 2

    room_id = rooms[0]["id"]
    now = datetime.now(timezone.utc)
    t1 = now + timedelta(days=53, hours=10)
    t2 = now + timedelta(days=53, hours=12)
    t3 = now + timedelta(days=53, hours=14)

    def book_slot(start, end, user_id, title):
        c = TestClient(app)
        return c.post("/api/bookings", json={
            "room_id": room_id,
            "user_id": user_id,
            "title": title,
            "start_time": start.isoformat(),
            "end_time": end.isoformat()
        })

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(book_slot, t1, t2, users[0]["id"], "Adjacent Slot 1")
        f2 = executor.submit(book_slot, t2, t3, users[1]["id"], "Adjacent Slot 2")
        r1, r2 = f1.result(), f2.result()

    assert r1.status_code == 201, f"Adjacent Slot 1 failed: {r1.text}"
    assert r2.status_code == 201, f"Adjacent Slot 2 failed: {r2.text}"

    # Cleanup
    client.post(f"/api/bookings/{r1.json()['id']}/cancel")
    client.post(f"/api/bookings/{r2.json()['id']}/cancel")

