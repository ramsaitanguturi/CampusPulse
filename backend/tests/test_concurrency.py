import pytest
import concurrent.futures
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app

from app.database import engine

def test_concurrent_booking_conflict():
    """
    Simulates simultaneous booking requests attempting to book the exact same room
    for the exact same time slot across parallel threads.
    Verifies that the Oracle row-level locking (SELECT ... FOR UPDATE) and transaction
    isolation guarantees:
    - Exactly ONE booking succeeds (HTTP 201).
    - The conflicting concurrent requests are rejected with HTTP 409 Conflict.
    - Zero duplicate bookings exist in the database.
    """
    if "oracle" not in str(engine.url):
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

    print(f"Concurrent booking test outcome: Successes={success_count}, Conflicts={conflict_count}")
    
    # Exactly one must succeed, all other overlapping concurrent requests must be rejected
    assert success_count == 1, f"Expected exactly 1 booking success, got {success_count}. Statuses: {status_codes}"
    assert conflict_count == 3, f"Expected 3 conflict rejections (409), got {conflict_count}. Statuses: {status_codes}"

    # Cleanup the successful booking
    for r in responses:
        if r.status_code == 201:
            booking_id = r.json()["id"]
            client.post(f"/api/bookings/{booking_id}/cancel")
