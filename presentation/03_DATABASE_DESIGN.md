# 03 — Database Design, ER Model & Normalization

## 1. Relational Entities Summary (6 Primary Relations)

The CampusPulse schema consists of exactly 6 normalized relations:

| Relation | Primary Key | Key Attributes | Constraints Enforced |
| :--- | :--- | :--- | :--- |
| **`USERS`** | `id` (Identity) | `name`, `email`, `role`, `department` | `email` UNIQUE; `role IN ('STUDENT','FACULTY','ADMIN','STAFF')` |
| **`BUILDINGS`** | `id` (Identity) | `code`, `name`, `floors`, `map_x`, `map_y`, `status` | `code` UNIQUE; `floors > 0`; `status IN ('OPERATIONAL','PARTIAL','MAINTENANCE')` |
| **`ROOMS`** | `id` (Identity) | `building_id`, `room_number`, `floor`, `capacity`, `room_type`, `status`, `has_projector`, `has_ac` | FK $\to$ `BUILDINGS(id)` ON DELETE CASCADE; UNIQUE(`building_id`, `room_number`); `capacity > 0`; `room_type` CHECK; `status` CHECK; `has_projector/has_ac IN (0,1)` |
| **`BOOKINGS`** | `id` (Identity) | `room_id`, `user_id`, `title`, `start_time`, `end_time`, `status` | FK $\to$ `ROOMS(id)` CASCADE; FK $\to$ `USERS(id)` CASCADE; `CHECK (end_time > start_time)`; `status IN ('CONFIRMED','CANCELLED','COMPLETED')` |
| **`MAINTENANCE_TICKETS`** | `id` (Identity) | `room_id`, `user_id`, `title`, `description`, `priority`, `status`, `reported_at`, `resolved_at` | FK $\to$ `ROOMS(id)` CASCADE; FK $\to$ `USERS(id)` SET NULL; `priority IN ('LOW','MEDIUM','HIGH','CRITICAL')`; `status IN ('OPEN','IN_PROGRESS','RESOLVED')` |
| **`EVENTS`** | `id` (Identity) | `title`, `building_id`, `room_id`, `start_time`, `end_time`, `category` | FK $\to$ `BUILDINGS(id)` CASCADE; FK $\to$ `ROOMS(id)` SET NULL; `CHECK (end_time > start_time)`; `category` CHECK |

---

## 2. Entity-Relationship (ER) Cardinalities

```
USERS (1) --------------< (N) BOOKINGS
USERS (1) --------------< (N) MAINTENANCE_TICKETS (ON DELETE SET NULL)
BUILDINGS (1) ----------< (N) ROOMS (ON DELETE CASCADE)
BUILDINGS (1) ----------< (N) EVENTS (ON DELETE CASCADE)
ROOMS (1) --------------< (N) BOOKINGS (ON DELETE CASCADE)
ROOMS (1) --------------< (N) MAINTENANCE_TICKETS (ON DELETE CASCADE)
ROOMS (1) --------------< (0..N) EVENTS (ON DELETE SET NULL)
```

### Referential Actions Defense
1. **`ON DELETE CASCADE` on `ROOMS -> BUILDINGS`**: A room is physically bounded by its parent building. Demolishing a building destroys its constituent rooms.
2. **`ON DELETE CASCADE` on `BOOKINGS -> ROOMS`**: Decommissioning a room invalidates future schedules for that room.
3. **`ON DELETE SET NULL` on `MAINTENANCE_TICKETS -> USERS`**: Preserves historical maintenance records even if the reporting employee departs the university.
4. **`ON DELETE SET NULL` on `EVENTS -> ROOMS`**: If a specific room becomes unavailable, the campus event remains scheduled at the parent building complex.

---

## 3. Functional Dependencies (FDs) & Candidate Keys

### Relation 1: `USERS`
- $FD_1: \{id\} \to \{name, email, role, department, created\_at\}$
- $FD_2: \{email\} \to \{id, name, role, department, created\_at\}$
- **Candidate Keys**: $\{id\}$, $\{email\}$ | **Primary Key**: $\{id\}$

### Relation 2: `BUILDINGS`
- $FD_1: \{id\} \to \{code, name, floors, map\_x, map\_y, description, status, created\_at\}$
- $FD_2: \{code\} \to \{id, name, floors, map\_x, map\_y, description, status, created\_at\}$
- **Candidate Keys**: $\{id\}$, $\{code\}$ | **Primary Key**: $\{id\}$

### Relation 3: `ROOMS`
- $FD_1: \{id\} \to \{building\_id, room\_number, floor, capacity, room\_type, status, has\_projector, has\_ac, created\_at\}$
- $FD_2: \{building\_id, room\_number\} \to \{id, floor, capacity, room\_type, status, has\_projector, has\_ac, created\_at\}$
- **Candidate Keys**: $\{id\}$, $\{building\_id, room\_number\}$ | **Primary Key**: $\{id\}$

### Relation 4: `BOOKINGS`
- $FD_1: \{id\} \to \{room\_id, user\_id, title, start\_time, end\_time, status, created\_at\}$
- **Candidate Key / Primary Key**: $\{id\}$

### Relation 5: `MAINTENANCE_TICKETS`
- $FD_1: \{id\} \to \{room\_id, user\_id, title, description, priority, status, reported\_at, resolved\_at\}$
- **Candidate Key / Primary Key**: $\{id\}$

### Relation 6: `EVENTS`
- $FD_1: \{id\} \to \{title, description, building\_id, room\_id, start\_time, end\_time, category, created\_at\}$
- **Candidate Key / Primary Key**: $\{id\}$

---

## 4. Formal Normalization Proofs (1NF to BCNF)

### First Normal Form (1NF)
- **Criterion**: All attribute values are atomic; no repeating groups or multivalued columns.
- **Proof**: 
  - Multimedia equipment is modeled as discrete columns (`has_projector`, `has_ac`) rather than comma-separated lists (`equipment = 'projector,ac'`).
  - Bookings are stored as separate tuples in `BOOKINGS`, never as embedded arrays in `ROOMS`.

### Second Normal Form (2NF)
- **Criterion**: Must be in 1NF and contain **no partial functional dependencies** (every non-prime attribute must depend on the whole candidate key).
- **Proof**:
  - Relations `USERS`, `BUILDINGS`, `BOOKINGS`, `MAINTENANCE_TICKETS`, and `EVENTS` have single-attribute surrogate keys (`id`). A single attribute has no proper subsets; partial dependencies are impossible.
  - In `ROOMS`, candidate keys are $\{id\}$ and $\{building\_id, room\_number\}$. Room attributes (`capacity`, `room_type`) depend on the specific room within that specific building; neither $building\_id$ alone nor $room\_number$ alone determines capacity.

### Third Normal Form (3NF)
- **Criterion**: Must be in 2NF and contain **no transitive functional dependencies** ($X \to Z \to Y$ where neither $X$ nor $Z$ is a candidate key).
- **Proof**:
  - In `BUILDINGS`, $\{id\} \to code \to name$. Since $code$ is a candidate key (`UNIQUE`), it is a superkey. Under 3NF formal definition, for $X \to Y$, $X$ is a superkey.
  - In all other relations, non-prime attributes do not determine each other (e.g., $capacity$ does not determine $room\_type$ or $status$).

### Boyce-Codd Normal Form (BCNF)
- **Criterion**: For every non-trivial functional dependency $X \to Y$, determinant $X$ **must be a superkey**.
- **Proof**:
  - Across all 6 relations, the only active determinants are:
    - `USERS`: $\{id\}$ and $\{email\}$ (both candidate keys).
    - `BUILDINGS`: $\{id\}$ and $\{code\}$ (both candidate keys).
    - `ROOMS`: $\{id\}$ and $\{building\_id, room\_number\}$ (both candidate keys).
    - `BOOKINGS`, `MAINTENANCE_TICKETS`, `EVENTS`: $\{id\}$ (candidate keys).
  - Since every determinant is a superkey, the schema satisfies **BCNF**.

---

## 5. Relational Anomalies Resolved

| Anomaly | Risk if Unnormalized | CampusPulse Solution |
| :--- | :--- | :--- |
| **Insertion Anomaly** | Cannot create a new building without assigning rooms or bookings. | Standalone `BUILDINGS` table allows empty buildings. |
| **Deletion Anomaly** | Deleting a cancelled reservation deletes the room or user record. | Separate `BOOKINGS` associative entity; deleting bookings leaves users and rooms intact. |
| **Update Anomaly** | Renaming a building requires updating thousands of booking records. | Building name stored once in `BUILDINGS`; other tables reference surrogate `building_id`. |
