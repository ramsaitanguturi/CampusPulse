# Speaker Notes — Complete Word-for-Word Script

Use these speaker notes while presenting the slides. Each slide contains the exact verbal narrative, key technical keywords to emphasize, and potential questions professors might ask.

---

### SLIDE 1: Title & Introduction
**Verbal Narrative**:
> "Good morning, respected professors and evaluation panel. Today, I am proud to present CampusPulse — an enterprise-grade Smart Campus Digital Twin and Facility Operations Control Center. While many web projects rely on mock data or lightweight in-memory databases, CampusPulse was engineered specifically to demonstrate advanced Relational Database Management Systems principles using Oracle Database 21c as our primary, authoritative backend. Over the next twelve minutes, I will walk you through our normalized relational schema, our multi-tier concurrency control architecture, our advanced SQL implementations, and our live application demonstration."

**Key Terms to Emphasize**:
*Authoritative Backend, Oracle 21c XE, BCNF Normalization, Row-Level Locking, PL/SQL Compound Trigger.*

**Potential Professor Question**:
- *Why did you choose Oracle Database 21c instead of MySQL or MongoDB?*
- **Your Answer**: *"We chose Oracle 21c because it is the industry standard for strict ACID compliance, advanced PL/SQL procedural programming, enterprise-grade pessimistic row-level locking via `SELECT ... FOR UPDATE`, and Compound Triggers that resolve mutating-table anomalies."*

---

### SLIDE 2: Problem Statement
**Verbal Narrative**:
> "In high-density university environments, managing physical facilities like lecture halls, auditoriums, and labs presents acute database engineering challenges. When registration opens, hundreds of students and faculty members concurrently attempt to book the exact same high-demand facilities. Without database-level concurrency control, systems suffer from lost updates and double bookings. Furthermore, room scheduling is frequently decoupled from facility maintenance: a classroom offline for electrical repairs might still accept reservations. Lastly, generating multi-table utilization reports often causes Cartesian product row explosions if joins are not architected carefully."

**Key Terms to Emphasize**:
*Concurrent Contention, Double Bookings, Lost Updates, Maintenance Decoupling, Cartesian Inflation.*

---

### SLIDE 3: Objectives & Scope
**Verbal Narrative**:
> "To address these challenges, our objectives were four-fold: First, engineer a 6-relation database schema strictly compliant with 3NF and BCNF. Second, model reservations as half-open mathematical intervals $[start, end)$ to eliminate double bookings while permitting valid back-to-back sessions. Third, enforce concurrency safety through a defense-in-depth model: combining application-level checks, pessimistic row locks in SQLAlchemy, and kernel-level Oracle Compound Triggers. And fourth, wrap these database guarantees in an interactive spatial digital twin featuring a dedicated DBMS Query Studio."

**Key Terms to Emphasize**:
*BCNF, Half-Open Intervals $[s, e)$, Defense-in-Depth, Spatial Twin, DBMS Query Studio.*

---

### SLIDE 4: Complete System Architecture
**Verbal Narrative**:
> "Our system adheres to a clean 3-tier enterprise architecture. At the presentation tier, we built a React 19 single-page application using TypeScript and Tailwind CSS v4, providing an interactive vector SVG campus map. The application tier is powered by FastAPI and SQLAlchemy 2.0, providing asynchronous REST endpoints and strict Pydantic validation. The authoritative data tier is Oracle Database 21c XE. We connect using `python-oracledb` in Thin Mode, which requires zero external C-client dependencies, configured with a connection pool of 10 persistent connections, 20 overflow connections, and pre-ping verification."

**Key Terms to Emphasize**:
*3-Tier Architecture, React 19, FastAPI, SQLAlchemy 2.0, python-oracledb Thin Mode, Connection Pool Pre-Ping.*

**Potential Professor Question**:
- *What is 'Thin Mode' in python-oracledb?*
- **Your Answer**: *"Thin Mode is pure Python implementation that connects directly to the Oracle database wire protocol without needing Oracle Instant Client C-libraries installed on the operating system."*

---

### SLIDE 5: Technology Stack & Justification
**Verbal Narrative**:
> "Every component in our stack was chosen to reinforce database engineering rigor. FastAPI provides fast asynchronous request handling with automatic OpenAPI documentation. SQLAlchemy 2.0 offers unit-of-work session boundaries and explicit row-level locking primitives. And Oracle 21c provides the transactional guarantees, index optimization, and compound triggers necessary for bulletproof scheduling."

---

### SLIDE 6 & 7: Relational Schema & ER Model
**Verbal Narrative**:
> "Our schema models university operations across six primary relations: USERS, BUILDINGS, ROOMS, BOOKINGS, MAINTENANCE_TICKETS, and EVENTS. Every entity uses an auto-incrementing identity surrogate primary key, while real-world business keys like email, building codes, and room numbers per building are protected by UNIQUE constraints. Looking at our ER diagram, notice our referential integrity actions: we enforce `ON DELETE CASCADE` between Buildings and Rooms, and between Rooms and Bookings, because a room cannot physically exist without its building. However, for Maintenance Tickets, the foreign key to Users uses `ON DELETE SET NULL` — this ensures historical facility records are preserved even if the reporting employee leaves the university."

**Key Terms to Emphasize**:
*Surrogate Keys, Natural Keys, Referential Integrity, ON DELETE CASCADE vs ON DELETE SET NULL.*

**Potential Professor Question**:
- *Why did you use surrogate keys instead of composite primary keys like (building_id, room_number)?*
- **Your Answer**: *"Surrogate integer identity keys provide high-speed 4-byte join performance and simplify foreign key definitions across child tables like Bookings and Tickets. We still strictly enforce natural business uniqueness via composite UNIQUE constraints."*

---

### SLIDE 8: Formal Normalization Proofs
**Verbal Narrative**:
> "A central requirement of our DBMS project was mathematical proof of normalization. All six relations satisfy 1NF because all attributes are atomic; equipment like projectors and air conditioning are partitioned into discrete boolean columns rather than comma-separated strings. All relations satisfy 2NF because primary keys are single-attribute surrogate keys, making partial functional dependencies mathematically impossible. In Rooms, where the composite candidate key is `{building_id, room_number}`, all attributes depend on the full combination. All relations satisfy 3NF because there are zero transitive dependencies: non-key attributes never determine other non-key attributes. Finally, all relations satisfy BCNF because every determinant in all active functional dependencies is a candidate key."

**Key Terms to Emphasize**:
*Atomicity, Partial Functional Dependencies, Transitive Dependencies, Superkey, BCNF Compliance.*

---

### SLIDE 9: Integrity Constraints & Invariants
**Verbal Narrative**:
> "Integrity is enforced directly inside the Oracle database engine via four constraint types: Primary Keys (`P`), Foreign Keys (`R`), Unique Constraints (`U`), and Domain Check Constraints (`C`). For example, `chk_booking_times_valid` prevents temporal inversion by requiring `end_time > start_time`. `chk_room_capacity_positive` guarantees capacity is strictly positive. `chk_user_role` limits stakeholder authorization to our four declared roles. These constraints mean invalid data is rejected at the database level even if application-level validation is bypassed."

---

### SLIDE 10 & 11: SQL Concepts & Advanced Query Highlights
**Verbal Narrative**:
> "We implemented and verified all 20 applied SQL concepts from the syllabus. I want to highlight two critical queries. First, our multi-table aggregation query: when joining Buildings to Rooms and Maintenance Tickets, a standard join creates a Cartesian product that multiplies building capacity by the number of open tickets! We solved this by creating pre-aggregated subqueries that compute room sums and ticket counts independently before joining to the parent building. Second, our real-time availability search uses a correlated `NOT EXISTS` subquery. `NOT EXISTS` short-circuits evaluation as soon as the first confirmed conflicting booking is encountered, providing significant performance advantages over `NOT IN`."

**Key Terms to Emphasize**:
*Pre-aggregated Subqueries, Cartesian Inflation, Semi-Join, NOT EXISTS Short-Circuit Evaluation.*

---

### SLIDE 12: Database Views
**Verbal Narrative**:
> "To accelerate our digital twin telemetry, we pre-compiled two database views in Oracle DDL: `v_dashboard_summary` and `v_room_live_status`. `v_dashboard_summary` groups room statuses and calculates building occupancy rates directly inside Oracle. This offloads aggregation overhead from Python into the database engine, ensuring sub-5-millisecond dashboard response times."

---

### SLIDE 13 & 14: ACID Guarantees & Half-Open Interval Scheduling
**Verbal Narrative**:
> "CampusPulse guarantees all four ACID properties. Atomicity is proven because any failure triggers `db.rollback()`, leaving zero partial tuples. Consistency is maintained by our schema constraints. Durability is guaranteed by Oracle Redo Logs. For Isolation, we model all bookings as half-open mathematical intervals $[start, end)$. Mathematically, two intervals overlap if and only if $end_1 > start_2 \land start_1 < end_2$. This interval rule ensures that back-to-back bookings — such as 10:00 to 11:00 and 11:00 to 12:00 — are accepted without conflict."

**Key Terms to Emphasize**:
*Half-Open Intervals $[s, e)$, De Morgan's Law, Redo Logs, Serializable Isolation.*

---

### SLIDE 15: Concurrency Control via `SELECT ... FOR UPDATE`
**Verbal Narrative**:
> "Now let us examine how we prevent concurrent race conditions. When a user requests a booking, `CampusService.create_booking` immediately issues: `SELECT * FROM rooms WHERE id = :room_id FOR UPDATE`. This places an exclusive pessimistic row lock on that room record in Oracle. If Client A and Client B submit overlapping booking requests at the exact same millisecond, Client A acquires the row lock. Client B's transaction is blocked in Oracle's lock wait queue. Client A queries existing bookings, finds no conflict, inserts the booking, and commits. When Client A commits, the lock is released. Client B unblocks, re-evaluates the query, immediately sees Client A's committed booking, and is rejected with HTTP 409 Conflict. Zero race conditions, zero duplicate bookings."

**Key Terms to Emphasize**:
*Pessimistic Row Lock, SELECT FOR UPDATE, Lock Wait Queue, HTTP 409 Conflict.*

**Potential Professor Question**:
- *Why did you lock the ROOM row instead of locking the BOOKINGS table?*
- **Your Answer**: *"Locking the parent Room row isolates concurrency to that specific physical room. Users booking Room 101 never block users booking Room 205. Furthermore, in READ COMMITTED isolation, we cannot lock a booking row that does not exist yet. Locking the existing parent room row serializes all child inserts."*

---

### SLIDE 16: Oracle PL/SQL Compound Trigger
**Verbal Narrative**:
> "What happens if someone bypasses our FastAPI backend entirely and issues a raw SQL INSERT directly into Oracle? To guarantee safety at the kernel level, we wrote `TRG_NO_OVERLAPPING_BOOKINGS`. In standard Oracle triggers, querying the table being inserted into throws `ORA-04091 mutating-table error`. We solved this using an Oracle COMPOUND TRIGGER. In `AFTER EACH ROW`, we record new booking times in memory without touching the table. Then, in `AFTER STATEMENT`, when the table is no longer mutating, the trigger locks the affected rooms in ascending order to prevent deadlocks, validates interval overlap, and raises application error `-20001` if an overlap exists."

**Key Terms to Emphasize**:
*ORA-04091 Mutating-Table Error, Compound Trigger, AFTER STATEMENT, Ascending Deadlock Prevention, ORA-20001.*

---

### SLIDE 17 & 18: Live Demo & Testing Audit
**Verbal Narrative**:
> "Every claim made in this presentation is supported by automated testing. Our test suite contains 45 automated tests across five test files: API routes, multi-threaded race conditions, database integrity, Oracle-specific integration, and SQL syllabus queries. When executed against our live Oracle 21c database, all 45 tests pass with 100% green status in under 6 seconds. Now, I invite you to observe our live application and SQL demonstration."

---

### SLIDE 19 & 20: Limitations & Conclusion
**Verbal Narrative**:
> "To conclude with honest engineering evaluation: our pessimistic room-locking model provides bulletproof safety, but serializes non-overlapping requests for the same room. We chose this deliberately because real-world room booking requires safety over microsecond throughput. In conclusion, CampusPulse demonstrates a complete, normalized, concurrency-safe smart campus digital twin running on live Oracle 21c. Thank you, and we are ready for your questions."
