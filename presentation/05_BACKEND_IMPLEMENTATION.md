# 05 — Backend Implementation & API Reference

## 1. Backend Architecture & Technology Stack
- **Framework**: FastAPI (Python 3.12)
- **ORM / Query Engine**: SQLAlchemy 2.0 Declarative Engine
- **Oracle Driver**: `python-oracledb` 26.0+ (Thin Mode)
- **Validation**: Pydantic v2 Settings & Schemas
- **Design Pattern**: Service-Repository Layer (`CampusService`) separating API endpoints from database execution and transaction boundaries.

---

## 2. Complete REST API Endpoint Reference

| Method | Endpoint | Purpose | Key Parameters | Response Model | Database Operations |
|---|---|---|---|---|---|
| `GET` | `/` | API status & metadata | None | JSON | None |
| `GET` | `/health` | Application healthcheck | None | `{"status": "healthy"}` | None |
| `GET` | `/api/dashboard` | Aggregated telemetry & occupancy | None | `DashboardResponse` | Aggregations, joins, trends across all 6 tables |
| `GET` | `/api/buildings` | All campus buildings | None | `List[BuildingResponse]` | `Building` with aggregated room status counts |
| `GET` | `/api/buildings/{id}` | Building & constituent rooms | `id: int` | `BuildingWithRooms` | Single building lookup + child rooms |
| `GET` | `/api/rooms` | Search & filter campus rooms | `building_id`, `room_type`, `status`, `min_capacity`, `search` | `List[RoomResponse]` | `rooms JOIN buildings` with dynamic `WHERE` |
| `GET` | `/api/rooms/available` | Time-slot room availability | `start_time`, `end_time`, `min_capacity`, `room_type` | `List[RoomResponse]` | Correlated `NOT EXISTS` subquery |
| `GET` | `/api/rooms/{id}` | Deep room telemetry & schedule | `id: int` | `RoomDetailResponse` | Room, active booking, tickets & upcoming bookings |
| `GET` | `/api/bookings` | Filterable reservation list | `status`, `room_id`, `user_id`, `limit` | `List[BookingResponse]` | 4-way join (`Bookings` + `Rooms` + `Buildings` + `Users`) |
| `POST`| `/api/bookings` | Create conflict-free booking | `room_id`, `user_id`, `title`, `start_time`, `end_time` | `BookingResponse` (201) | **Pessimistic lock (`SELECT FOR UPDATE`)**, interval check, insert |
| `POST`| `/api/bookings/{id}/cancel` | Cancel active reservation | `id: int` | `BookingCancelResponse` | Atomic update: `status = 'CANCELLED'` |
| `GET` | `/api/maintenance` | Facility tickets list | `status`, `priority`, `room_id`, `limit` | `List[MaintenanceTicketResponse]`| `Tickets` joined with `Rooms`, `Buildings`, `Users` |
| `POST`| `/api/maintenance` | File work order / ticket | `room_id`, `user_id`, `title`, `description`, `priority` | `MaintenanceTicketResponse` (201) | Insert ticket; if `CRITICAL`, marks room `MAINTENANCE` |
| `PATCH`| `/api/maintenance/{id}/status` | Transition ticket state | `id: int`, `{"status": "..."}` | `MaintenanceTicketResponse` | Updates ticket; if `RESOLVED`, evaluates remaining tickets & restores room |
| `GET` | `/api/events` | Campus event itinerary | `limit`, `upcoming_only` | `List[EventResponse]` | `Events` joined with `Buildings` and `Rooms` |
| `POST`| `/api/events` | Create new event | `title`, `building_id`, `room_id`, `start_time`, `end_time`, `category` | `EventResponse` (201) | Time check, building-room consistency check, insert |
| `GET` | `/api/users` | University stakeholders | None | `List[UserResponse]` | `SELECT FROM users ORDER BY name` |
| `GET` | `/api/analytics/queries` | SQL viva showcase catalogue | None | `List[QueryCatalogueItem]` | Query registry dictionary |
| `POST`| `/api/analytics/execute/{id}` | Live SQL query execution | `query_id: str` | `QueryExecutionResult` | Raw SQL execution with `time.perf_counter()` latency |

---

## 3. Session Lifecycle & Transaction Boundaries

Database sessions are managed via FastAPI dependency injection:
```python
def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Transaction Boundary Pattern in `CampusService.create_booking`:
1. Session is opened.
2. Target room row is locked: `db.query(Room).filter(Room.id == data.room_id).with_for_update().one_or_none()`.
3. Overlap check evaluates existing `CONFIRMED` bookings.
4. If conflict exists: `db.rollback()` is executed immediately, releasing locks and returning HTTP 409.
5. If clean: `db.add(new_booking)` followed by `db.commit()`.
6. If the database raises an unexpected error (or Oracle trigger raises `ORA-20001`): `db.rollback()` executes safely in the `except` block.

---

## 4. Maintenance State Machine & Availability Restoration
In [backend/app/services/campus_service.py](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/app/services/campus_service.py), ticket status transitions obey strict state machine rules:
- **OPEN / IN_PROGRESS**: When a ticket is created with `priority = 'CRITICAL'`, `Room.status` is automatically set to `MAINTENANCE`.
- **RESOLVED**: When a ticket is updated to `RESOLVED`, `CampusService.update_ticket_status` queries whether **any OTHER active tickets** exist for that room (`OPEN` or `IN_PROGRESS`).
  - If other active tickets exist $\to$ room remains `MAINTENANCE`.
  - If zero active tickets remain $\to$ checks if a confirmed booking is currently ongoing.
    - If ongoing $\to$ `OCCUPIED`.
    - Else $\to$ `AVAILABLE`.
