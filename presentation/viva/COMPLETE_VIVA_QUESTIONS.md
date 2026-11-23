# Master Viva Defense Bank: 105 Categorized Examination Questions

This master question bank contains **105 technically rigorous viva questions** organized across 18 DBMS syllabus categories. Each question includes a concise direct answer, detailed theoretical justification, a CampusPulse-specific example, and a likely examiner follow-up question.

---

## Master Category Index & File Map

| Category # | Syllabus Domain | Detailed File | Question Count |
|---|---|---|---|
| **Cat 1–7** | **DBMS Fundamentals, ER Modeling, Relational Algebra, Normalization, FDs, Keys & Constraints** | [DATABASE_VIVA.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/viva/DATABASE_VIVA.md) | 20 Questions |
| **Cat 8–10** | **SQL Queries, Joins, Aggregations, Correlated Subqueries, Semi-Joins & ACID Transactions** | [SQL_VIVA.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/viva/SQL_VIVA.md) | 20 Questions |
| **Cat 11–13**| **Oracle 21c, Concurrency Control, Row Locks, Mutating Tables & Compound Triggers** | [ORACLE_VIVA.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/viva/ORACLE_VIVA.md) | 20 Questions |
| **Cat 14–16**| **FastAPI Backend, SQLAlchemy 2.0 ORM, Pydantic, Session Lifecycles & REST APIs** | [BACKEND_VIVA.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/viva/BACKEND_VIVA.md) | 15 Questions |
| **Cat 15–16**| **React 19 Frontend, TypeScript, Vector SVG Canvas, Recharts & HTTP State** | [FRONTEND_VIVA.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/viva/FRONTEND_VIVA.md) | 15 Questions |
| **Cat 17–18**| **Project Defense, Automated Testing, Architectural Trade-offs & Weaknesses Exposed** | [PROJECT_DEFENSE.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/viva/PROJECT_DEFENSE.md) | 15 Questions |
| **Summary** | **Rapid 10-Minute Cram Sheet (Formulas, Invariants, Trigger Phases)** | [RAPID_REVISION.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/viva/RAPID_REVISION.md) | High-Yield Reference |

**Total In-Depth Questions in Bank**: **105 Questions**

---

## The Top 5 Most Frequently Asked Viva Questions

### 1. "How does your system mathematically prevent overlapping bookings while permitting back-to-back bookings?"
- **Direct Answer**: *"We model reservations as half-open intervals $[s, e)$. Two bookings do NOT overlap if $(e_1 \le s_2) \lor (s_1 \ge e_2)$. By De Morgan's Law, an overlap occurs if $(e_1 > s_2) \land (s_1 < e_2)$. Because the boundary inequality is strict, adjacent bookings like 10:00–11:00 and 11:00–12:00 are accepted without collision."*
- **Source**: [07_ADVANCED_DATABASE_FEATURES.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/07_ADVANCED_DATABASE_FEATURES.md).

### 2. "Why did you lock the ROOM row instead of locking the BOOKINGS table during reservation?"
- **Direct Answer**: *"Locking the parent Room row via `SELECT ... FOR UPDATE` isolates concurrency to that specific physical room. Users booking Room 101 never block users booking Room 205. Furthermore, in READ COMMITTED isolation, we cannot lock a booking row that has not been inserted yet. Locking the parent room row serializes all concurrent insert attempts for that room."*
- **Source**: [backend/app/services/campus_service.py:368-372](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/app/services/campus_service.py).

### 3. "What is an ORA-04091 mutating-table error and how does your compound trigger prevent it?"
- **Direct Answer**: *"In Oracle, a row-level trigger cannot query the table currently being modified (`ORA-04091`). We resolve this using an Oracle COMPOUND TRIGGER: in `AFTER EACH ROW`, we record new booking times in memory without querying the table; in `AFTER STATEMENT`, when the table is no longer mutating, the trigger locks the rooms in sorted order and safely executes the overlap query."*
- **Source**: [backend/scripts/oracle_schema.sql:207-298](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/scripts/oracle_schema.sql).

### 4. "Why did you use pre-aggregated subqueries in your building analytics SQL?"
- **Direct Answer**: *"Joining Buildings to Rooms and Maintenance Tickets directly produces a Cartesian row explosion where building capacity is multiplied by the number of tickets. By pre-aggregating rooms and tickets in independent subqueries grouped by `building_id`, we join only aggregated scalar totals, preventing row duplication."*
- **Source**: [backend/scripts/sql_demonstrations.sql:785-816](file:///c:/Users/ramsa/Desktop/CampusPulse/backend/scripts/sql_demonstrations.sql).

### 5. "Prove that your schema satisfies Boyce-Codd Normal Form (BCNF)."
- **Direct Answer**: *"A relation is in BCNF if for every non-trivial functional dependency $X \to Y$, determinant $X$ is a superkey. In CampusPulse, all functional dependencies are determined strictly by candidate keys: $\{id\}$, $\{email\}$, $\{code\}$, or $\{building\_id, room\_number\}$. Since every determinant is a superkey, the entire schema is in BCNF."*
- **Source**: [03_DATABASE_DESIGN.md](file:///c:/Users/ramsa/Desktop/CampusPulse/presentation/03_DATABASE_DESIGN.md).
