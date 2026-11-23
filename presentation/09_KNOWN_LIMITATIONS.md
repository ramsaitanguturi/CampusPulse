# 09 — Known Technical Limitations & Design Trade-offs

Academic evaluation panels value intellectual honesty. Acknowledging architectural boundaries, design trade-offs, and genuine project limitations demonstrates mature engineering understanding.

---

## 1. Concurrency & Locking Trade-offs

### Limitation 1: Room-Level Locking Serializes Requests on That Specific Room
- **Implementation Choice**: In `CampusService.create_booking`, we lock the parent `ROOMS` row via `SELECT ... FROM rooms WHERE id = :room_id FOR UPDATE`.
- **Trade-off**: While this prevents phantom reads and race conditions for that room with zero impact on other rooms, multiple users attempting to book *different non-overlapping slots in the same room* are serialized one after another.
- **Why It Was Chosen**: Table-level locking would kill concurrency campus-wide; slot-level locking is impossible before the row exists. Locking the parent room row provides the ideal balance between safety and performance.

### Limitation 2: Compound Trigger Statement-Level Overhead
- **Implementation Choice**: The Oracle compound trigger buffers affected room IDs and locks them during `AFTER STATEMENT`.
- **Trade-off**: For high-volume batch inserts (e.g., bulk importing 10,000 bookings), the associative array memory footprint and statement-level loop add measurable execution latency.
- **Remediation**: For bulk imports, the trigger can be temporarily disabled and batch conflict validation run via set-based SQL.

---

## 2. Functional & Scope Boundaries

### Limitation 3: Authentication & Role-Based Access Control (RBAC)
- **Current State**: Users are selected from a dropdown of registered institutional stakeholders (`USERS` table). Passwords and JWT tokens are deliberately not implemented.
- **Justification**: CampusPulse is an academic **DBMS semester project** evaluating relational modeling, SQL proficiency, transaction management, and concurrency control. Implementing full OAuth2/JWT auth would shift the evaluation focus away from database engineering.

### Limitation 4: Single-Slot Bookings vs Recurring Rule Expansion
- **Current State**: Bookings represent discrete temporal intervals $[start\_time, end\_time)$. Recurring reservations (e.g., "Every Monday 10:00–12:00 for the semester") must be inserted as individual tuples.
- **Future Enhancement**: Implement an automated recurring schedule generator with batch conflict checking.

### Limitation 5: Manual vs Sensor-Driven Maintenance Triggers
- **Current State**: Maintenance tickets are submitted through the web UI by campus users or administrators.
- **Future Enhancement**: Integration with campus IoT hardware sensors (temperature, HVAC fault detectors) to automatically open tickets via webhook.

---

## 3. Schema & Referential Decisions

### Limitation 6: Hard Cascading Deletes on Buildings and Rooms
- **Implementation Choice**: Deleting a building cascades to delete all constituent rooms and their historical bookings (`ON DELETE CASCADE`).
- **Trade-off**: Historical analytical data regarding past room bookings is lost if an old building is decommissioned.
- **Production Alternative**: In an enterprise production deployment, a soft-delete pattern (`is_deleted` flag or `ARCHIVED` status) would be preferred to preserve historical analytics.

### Limitation 7: Fixed Canvas Coordinate Space
- **Current State**: Building spatial coordinates (`map_x`, `map_y`) are normalized to a 1000x650 SVG canvas space.
- **Future Enhancement**: Migration to true GIS spatial data types (Oracle Spatial & Graph / PostGIS) using longitude and latitude coordinates.
