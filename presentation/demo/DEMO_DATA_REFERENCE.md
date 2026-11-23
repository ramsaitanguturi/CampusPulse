# Demonstration Data Reference Sheet

Keep this cheat-sheet visible during your presentation so you never hesitate or mistype entity names, room numbers, or times.

---

## 1. Prime Demonstration Building & Rooms

| Building Code | Building Name | Target Room | Capacity | Room Type | Equipment |
|---|---|---|---|---|---|
| **`TURING`** | Turing Computing & AI Hub | **Room 101** | 180 seats | AUDITORIUM | Projector, AC |
| `TURING` | Turing Computing & AI Hub | Room 205 | 40 seats | LAB | Projector, AC |
| **`ENG`** | Engineering & Robotics Complex | **Room 101** | 60 seats | CLASSROOM | Projector, AC |
| `SCIENCE` | Natural Sciences Center | Room 101 | 90 seats | CLASSROOM | Projector, AC |
| `LIBRARY` | Digital Library Complex | Room 101 | 250 seats | AUDITORIUM | Projector, AC |

---

## 2. Target Demonstration Users

| User ID | Full Name | Email | Role | Department |
|---|---|---|---|---|
| **1** | **Dr. Evelyn Reed** | `evelyn.reed@univ.edu` | FACULTY | Computer Science |
| **2** | **Prof. Marcus Vance** | `marcus.vance@univ.edu` | FACULTY | Robotics & Automation |
| 3 | Sarah Jenkins | `sarah.j@univ.edu` | STUDENT | Artificial Intelligence |
| 4 | David Chen | `david.chen@univ.edu` | STUDENT | Data Engineering |
| 5 | Elena Rostova | `elena.r@univ.edu` | ADMIN | Campus Facilities |

---

## 3. The Rehearsed Booking Conflict Scenario

Use these exact values during the demo:

### Step 1: Base Booking (Succeeds — HTTP 201)
- **Room**: `101 (Engineering & Robotics Complex)`
- **User**: `Dr. Evelyn Reed`
- **Title**: `DBMS Professor Evaluation Session`
- **Date**: Tomorrow's Date
- **Time**: `10:00` to `12:00`

### Step 2: Overlapping Booking (Rejected — HTTP 409 Conflict)
- **Room**: `101 (Engineering & Robotics Complex)`
- **User**: `Prof. Marcus Vance`
- **Title**: `Robotics Seminar`
- **Date**: Tomorrow's Date
- **Time**: `11:00` to `13:00` *(Overlaps between 11:00 and 12:00)*
- **Expected Message**: *"Booking conflict: Room 101 is already booked for 'DBMS Professor Evaluation Session' by Dr. Evelyn Reed from 10:00 to 12:00."*

### Step 3: Adjacent Back-to-Back Booking (Succeeds — HTTP 201)
- **Room**: `101 (Engineering & Robotics Complex)`
- **User**: `Prof. Marcus Vance`
- **Title**: `Robotics Seminar`
- **Date**: Tomorrow's Date
- **Time**: `12:00` to `14:00` *(Ends exactly when Booking 1 concludes)*
- **Expected Result**: Confirmed with HTTP 201 Created.

---

## 4. Rehearsed Maintenance Ticket Scenario

- **Room**: `101 (Turing Computing Hub)`
- **User**: `Elena Rostova`
- **Title**: `AC Unit Refrigerant Leak`
- **Priority**: `CRITICAL`
- **Description**: `Coolant pressure dropped below safe thresholds; emergency maintenance required.`
- **Result**: Room status automatically transitions to `MAINTENANCE`.
