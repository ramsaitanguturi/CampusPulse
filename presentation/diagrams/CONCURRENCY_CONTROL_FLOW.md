# Concurrency Control & Row-Locking Sequence Diagram

This sequence diagram illustrates how two simultaneous transactions targeting the same room are serialized without race conditions.

---

```mermaid
sequenceDiagram
    autonumber
    actor Client_A as Client A (User 1)
    actor Client_B as Client B (User 2)
    participant Engine as FastAPI Service Layer
    participant Oracle as Oracle Database 21c Kernel

    Note over Client_A,Client_B: Simultaneous Request: Same Room, Overlapping Slot
    Client_A->>Engine: POST /api/bookings (10:00 - 12:00)
    Client_B->>Engine: POST /api/bookings (11:00 - 13:00)

    Note over Engine,Oracle: Step 1: Lock Acquisition Race
    Engine->>Oracle: [Tx A] SELECT * FROM rooms WHERE id = 1 FOR UPDATE
    Engine->>Oracle: [Tx B] SELECT * FROM rooms WHERE id = 1 FOR UPDATE

    Oracle-->>Engine: [Tx A] Lock GRANTED on Room 1
    Note over Oracle: [Tx B] BLOCKED in Oracle Lock Queue waiting for Room 1 lock

    Note over Engine,Oracle: Step 2: Tx A Proceeds to Completion
    Engine->>Oracle: [Tx A] Query bookings: 0 conflicts found
    Engine->>Oracle: [Tx A] INSERT INTO bookings (Room 1, 10:00 - 12:00, CONFIRMED)
    Engine->>Oracle: [Tx A] COMMIT Transaction
    Oracle-->>Engine: [Tx A] Commit Successful -> Row Lock RELEASED
    Engine-->>Client_A: HTTP 201 Created (Booking Confirmed)

    Note over Oracle,Engine: Step 3: Tx B Unblocks and Evaluates
    Oracle-->>Engine: [Tx B] Lock GRANTED on Room 1 (Tx B Unblocks)
    Engine->>Oracle: [Tx B] Query bookings for Room 1 overlapping [11:00, 13:00)
    Oracle-->>Engine: [Tx B] Conflict FOUND! (Returns Client A's committed booking)
    Engine->>Oracle: [Tx B] ROLLBACK Transaction
    Oracle-->>Engine: [Tx B] Rollback Complete -> Lock RELEASED

    Note over Engine,Client_B: Step 4: Conflict Rejection
    Engine-->>Client_B: HTTP 409 Conflict ("Room 1 already booked by Client A")
```

---

## Concurrency Guarantees Highlighted
1. **No Lost Updates**: Client A and Client B cannot both commit.
2. **No Dirty Reads**: Client B only sees Client A's data after Client A has committed.
3. **No Phantom Inserts**: Because the parent `Room` row is locked, Client B cannot insert a child booking until Client A completes.
