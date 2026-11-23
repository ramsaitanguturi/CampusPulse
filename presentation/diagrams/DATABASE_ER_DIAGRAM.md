# Relational Entity-Relationship (ER) Diagram

This document provides the formal Entity-Relationship model for the CampusPulse database schema across its 6 normalized relations.

---

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "reserves (1:N)"
    USERS ||--o{ MAINTENANCE_TICKETS : "reports (1:N)"
    BUILDINGS ||--o{ ROOMS : "contains (1:N)"
    BUILDINGS ||--o{ EVENTS : "hosts (1:N)"
    ROOMS ||--o{ BOOKINGS : "allocated_for (1:N)"
    ROOMS ||--o{ MAINTENANCE_TICKETS : "requires (1:N)"
    ROOMS ||--o{ EVENTS : "holds (0..1:N)"

    USERS {
        int id PK "IDENTITY"
        string name "VARCHAR2(100)"
        string email UK "VARCHAR2(120)"
        string role "CHECK: STUDENT, FACULTY, ADMIN, STAFF"
        string department "VARCHAR2(100)"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    BUILDINGS {
        int id PK "IDENTITY"
        string code UK "VARCHAR2(20)"
        string name "VARCHAR2(100)"
        int floors "CHECK: floors > 0"
        float map_x "FLOAT (0-1000)"
        float map_y "FLOAT (0-650)"
        text description "CLOB"
        string status "CHECK: OPERATIONAL, PARTIAL, MAINTENANCE"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    ROOMS {
        int id PK "IDENTITY"
        int building_id FK "REFERENCES BUILDINGS(id) ON DELETE CASCADE"
        string room_number "VARCHAR2(20)"
        int floor "NUMBER"
        int capacity "CHECK: capacity > 0"
        string room_type "CHECK: CLASSROOM, LAB, AUDITORIUM..."
        string status "CHECK: AVAILABLE, OCCUPIED, MAINTENANCE"
        bool has_projector "NUMBER(1) CHECK IN (0,1)"
        bool has_ac "NUMBER(1) CHECK IN (0,1)"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    BOOKINGS {
        int id PK "IDENTITY"
        int room_id FK "REFERENCES ROOMS(id) ON DELETE CASCADE"
        int user_id FK "REFERENCES USERS(id) ON DELETE CASCADE"
        string title "VARCHAR2(150)"
        timestamp start_time "TIMESTAMP WITH TIME ZONE"
        timestamp end_time "CHECK: end_time > start_time"
        string status "CHECK: CONFIRMED, CANCELLED, COMPLETED"
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }

    MAINTENANCE_TICKETS {
        int id PK "IDENTITY"
        int room_id FK "REFERENCES ROOMS(id) ON DELETE CASCADE"
        int user_id FK "REFERENCES USERS(id) ON DELETE SET NULL"
        string title "VARCHAR2(150)"
        text description "CLOB"
        string priority "CHECK: LOW, MEDIUM, HIGH, CRITICAL"
        string status "CHECK: OPEN, IN_PROGRESS, RESOLVED"
        timestamp reported_at "TIMESTAMP WITH TIME ZONE"
        timestamp resolved_at "TIMESTAMP WITH TIME ZONE"
    }

    EVENTS {
        int id PK "IDENTITY"
        string title "VARCHAR2(150)"
        text description "CLOB"
        int building_id FK "REFERENCES BUILDINGS(id) ON DELETE CASCADE"
        int room_id FK "REFERENCES ROOMS(id) ON DELETE SET NULL"
        timestamp start_time "TIMESTAMP WITH TIME ZONE"
        timestamp end_time "CHECK: end_time > start_time"
        string category "CHECK: ACADEMIC, TECH, WORKSHOP..."
        timestamp created_at "TIMESTAMP WITH TIME ZONE"
    }
```

---

## Key Cardinalities & Constraints
1. **Composite Uniqueness**: In `ROOMS`, `UNIQUE(building_id, room_number)` ensures no duplicate room numbers within the same building.
2. **Cascading Purge**: When a `BUILDING` or `ROOM` is permanently removed, dependent `BOOKINGS` and `ROOMS` are purged automatically via `ON DELETE CASCADE`.
3. **Audit Preservation**: When a `USER` account is deleted, foreign keys in `MAINTENANCE_TICKETS` are set to `NULL` via `ON DELETE SET NULL`, preserving the facility repair history.
