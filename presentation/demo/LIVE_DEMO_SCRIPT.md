# Live Demo Script — Click-by-Click Presentation Cheat Sheet

Use this cheat sheet while standing in front of the professors. It tells you exactly what to click and what to say at each second.

---

| Time | Action on Screen | Exact Words to Say | Expected Result |
|---|---|---|---|
| **0:00** | Browser at `http://localhost:5173` | *"Professors, here is our live CampusPulse Operations Control Center connected to Oracle Database 21c."* | Dashboard loads with live counters |
| **0:30** | Hover over Navbar badge | *"Notice the dialect indicator confirming active oracledb Thin Mode connection to service XEPDB1."* | Badge shows `ORACLE SQL 21c • ORACLEDB` |
| **0:45** | Click **Campus Map** tab | *"Here is our Spatial Digital Twin. Each campus building is rendered with SVG geometry."* | Interactive campus map opens |
| **1:00** | Click **Turing Computing Hub** | *"Selecting Turing Hub retrieves its constituent rooms on Floors 1, 2, and 3."* | Right panel displays rooms |
| **1:15** | Click **Room 101 (Turing Auditorium)** | *"Room 101 shows 180 seats, projector, AC, and upcoming scheduled reservations."* | Room metadata and schedule load |
| **1:30** | Click **Bookings** tab | *"Now let us demonstrate our most critical feature: Concurrency Control and Conflict Rejection."* | Bookings matrix opens |
| **1:45** | Click **+ New Reservation** | *"I will create a confirmed booking for Dr. Evelyn Reed tomorrow from 10:00 to 12:00."* | Form opens; fill Room 101, Evelyn, 10:00–12:00 |
| **2:00** | Click **Confirm Reservation** | *"Transaction committed. Booking appears in the schedule table with status CONFIRMED."* | Booking appears; table updates |
| **2:15** | Click **+ New Reservation** again | *"Now a second faculty member, Prof. Marcus Vance, attempts an overlapping reservation: 11:00 to 13:00."* | Fill Room 101, Marcus, 11:00–13:00 |
| **2:30** | Click **Confirm Reservation** | *"Watch the result: The transaction is rejected with HTTP 409 Conflict. Our row lock serialized the check."* | **Prominent Red Alert** with conflict details |
| **2:45** | Change time: `12:00` to `14:00` | *"Now I adjust the start time to 12:00. Under half-open interval $[s, e)$, this is valid back-to-back."* | Fill 12:00–14:00 |
| **3:00** | Click **Confirm Reservation** | *"It succeeds instantly without false collision."* | New booking confirmed |
| **3:15** | Click **Cancel** on Booking 1 | *"When Dr. Reed cancels her booking, transaction rollback restores slot availability immediately."* | Status changes to CANCELLED |
| **3:30** | Click **Maintenance** tab | *"In Maintenance Dispatch, filing a CRITICAL ticket automatically marks the target room MAINTENANCE."* | Maintenance Kanban loads |
| **3:45** | Click **Resolve** on ticket | *"When the ticket is resolved, the room state machine automatically restores it to AVAILABLE."* | Room status restored |
| **4:00** | Click **DBMS Studio** tab | *"Finally, our DBMS Studio allows live inspection of syllabus queries with real-time execution telemetry."* | Studio loads |
| **4:15** | Click **Multi-Table Join** tab | *"Here is an ANSI 4-way join across Bookings, Rooms, Buildings, and Users executing in ~1.2 milliseconds."* | SQL displays; results grid populates |
| **4:30** | Click **Aggregation** tab | *"Notice our pre-aggregated subqueries: they prevent Cartesian row multiplication on multi-ticket rooms."* | Pre-aggregated SQL runs |
| **4:45** | Open Terminal, run `pytest` | *"Lastly, all 45 automated test cases pass 100% against our live Oracle 21c database."* | Terminal shows `45 passed in 5.7s` |
