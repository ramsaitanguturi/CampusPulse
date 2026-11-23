# Backend Viva: FastAPI, SQLAlchemy 2.0 & Services (Questions 61–75)

---

### Q61: What is FastAPI and why was it chosen for this DBMS project?
- **Direct Answer**: A modern, high-performance Python web framework based on standard Python type hints, Starlette, and Pydantic v2. It provides native asynchronous request processing, automatic OpenAPI documentation at `/docs`, and high execution speed.
- **CampusPulse Example**: All 8 application modules are registered as FastAPI routers in `backend/app/main.py`.

---

### Q62: What is the Unit of Work pattern in SQLAlchemy?
- **Direct Answer**: A design pattern that maintains a list of objects affected by a business transaction and coordinates writing out changes and resolving concurrency problems during a single `db.commit()` call.
- **CampusPulse Example**: In `create_booking`, newly instantiated `Booking` entities are staged via `db.add()`, and flushed atomically via `db.commit()`.

---

### Q63: How does FastAPI dependency injection manage database sessions?
- **Direct Answer**: Using the `Depends(get_db)` generator:
  ```python
  def get_db():
      db: Session = SessionLocal()
      try:
          yield db
      finally:
          db.close()
  ```
  This guarantees that every incoming HTTP request receives an independent database session and that `db.close()` is guaranteed to execute upon completion, returning the connection to the pool.

---

### Q64: What is the purpose of Pydantic schemas versus SQLAlchemy models?
- **Direct Answer**:
  - **SQLAlchemy Models (`entities.py`)**: Define database table structures, primary keys, foreign keys, and map Python classes to relational tables.
  - **Pydantic Schemas (`schemas.py`)**: Validate and parse incoming HTTP JSON request bodies and serialize outgoing response models.
- **CampusPulse Example**: `BookingCreate` validates that request JSON contains positive integers and valid ISO datetimes before the service layer touches the database.

---

### Q65: How does CampusPulse handle CORS and why?
- **Direct Answer**: In [backend/app/main.py](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/app/main.py), CORS is configured using an explicit allowlist from environment variables (`CORS_ORIGINS`). Accidental wildcards (`*`) with credentials enabled are stripped to enforce web security best practices.

---

### Q66: What HTTP status code is returned when a booking conflict occurs?
- **Direct Answer**: **`HTTP 409 Conflict`**.
- **Detailed Explanation**: Defined in RFC 7231, HTTP 409 indicates that the request could not be processed because of conflict in the current state of the target resource. `CampusService` raises a custom `ConflictError`, which the router translates into HTTP 409 with structured JSON details.

---

### Q67: What happens when an invalid time interval ($end\_time \le start\_time$) is submitted?
- **Direct Answer**: The application returns **`HTTP 400 Bad Request`** with `detail: "Invalid time interval: End time must be strictly after start time."`. Even if bypassed, the database `CHECK (end_time > start_time)` constraint rejects the row.

---

### Q68: How is the database password protected in application logs?
- **Direct Answer**: In [backend/app/config.py](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/app/config.py), `mask_database_url()` uses a regular expression to replace passwords matching `://user:password@` with `://user:***@` before any URL is logged or printed.

---

### Q69: Explain the maintenance state machine in `CampusService`.
- **Direct Answer**:
  1. Creating a `CRITICAL` ticket automatically updates `Room.status = 'MAINTENANCE'`.
  2. Attempting to book a room in `MAINTENANCE` raises a validation error.
  3. When the ticket is marked `RESOLVED`, `update_ticket_status` checks if any other active tickets remain. If none remain, it checks whether an active booking is ongoing right now; if yes $\to$ `OCCUPIED`, else $\to$ `AVAILABLE`.

---

### Q70: How does `CampusService.execute_analytics_query` measure execution time?
- **Direct Answer**: Uses Python's high-resolution `time.perf_counter()` immediately before and after `db.execute(text(sql))`, calculating elapsed time in milliseconds:
  ```python
  start_t = time.perf_counter()
  result = db.execute(text(sql))
  elapsed_ms = round((time.perf_counter() - start_t) * 1000, 2)
  ```

---

### Q71: What is the difference between synchronous and asynchronous database calls?
- **Direct Answer**: Synchronous calls block the executing worker thread until the database driver returns data. Asynchronous calls yield control back to the event loop while waiting for database socket I/O.
- **CampusPulse Architecture**: CampusPulse uses standard synchronous SQLAlchemy sessions within thread pool workers, optimized via connection pooling.

---

### Q72: How does CampusPulse prevent SQL injection in dynamic room searches?
- **Direct Answer**: Dynamic queries in `CampusService.get_rooms` construct SQLAlchemy query filters using ORM expressions (`query.filter(Room.room_type == room_type)`). When raw SQL is required, bound parameters (`:start_t`, `:end_t`) are used with `db.execute(sql, params)`.

---

### Q73: What is the purpose of `db.refresh(entity)`?
- **Direct Answer**: Re-reads attributes from the database row into the in-memory Python object. This populates database-generated values such as auto-incremented identity `id` and server-default `created_at` timestamps.

---

### Q74: What is the global exception handler in `main.py`?
- **Direct Answer**: An `@app.exception_handler(Exception)` catch-all that intercepts any unhandled runtime exceptions, logs the full stack trace securely to the server console, and returns a clean generic HTTP 500 JSON response, preventing internal traceback leakage to client browsers.

---

### Q75: How does the application verify that an assigned event room belongs to the assigned building?
- **Direct Answer**: In `CampusService.create_event`:
  ```python
  if room.building_id != data.building_id:
      raise ValueError(f"Room {room.room_number} belongs to building ID {room.building_id}, not {building.name}.")
  ```
  This guarantees relational consistency between events, rooms, and buildings.
