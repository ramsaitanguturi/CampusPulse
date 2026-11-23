# Database Viva: Theory, Modeling, Keys & Normalization (Questions 1–20)

---

### Q1: What is a Relational Database Management System (RDBMS)?
- **Direct Answer**: A software system based on Edgar F. Codd's relational model that organizes data into two-dimensional tables (relations) of rows (tuples) and columns (attributes), enforcing integrity constraints and providing declarative querying via SQL.
- **Detailed Explanation**: An RDBMS separates physical storage from logical data independence. It enforces primary keys, foreign keys, domain checks, and provides ACID transaction guarantees.
- **CampusPulse Example**: Oracle Database 21c manages our 6 relations (`USERS`, `BUILDINGS`, `ROOMS`, `BOOKINGS`, `MAINTENANCE_TICKETS`, `EVENTS`).
- **Follow-up Question**: *How does an RDBMS differ from a NoSQL document database?* (Answer: RDBMS enforces strict schema, relational joins, and ACID compliance; document stores favor denormalized nested JSON and horizontal scaling).

---

### Q2: What is the difference between a Candidate Key, Primary Key, and Superkey?
- **Direct Answer**: A Superkey is any set of attributes that uniquely identifies a tuple. A Candidate Key is a minimal superkey (no extraneous attributes). The Primary Key is the candidate key chosen by the database architect as the principal identifier.
- **Detailed Explanation**: If $K$ is a candidate key, adding attribute $A$ makes $\{K, A\}$ a superkey. All candidate keys have uniqueness and minimality properties.
- **CampusPulse Example**: In `USERS`, $\{id\}$ and $\{email\}$ are candidate keys. We chose $\{id\}$ as Primary Key and enforced $\{email\}$ as a unique candidate key.
- **Follow-up Question**: *Why did you prefer surrogate identity keys over natural keys?* (Answer: Integer surrogate keys provide compact, fixed-size 4-byte foreign key indexes and remain immune to changes in real-world business attributes).

---

### Q3: What is a Foreign Key and what referential actions did you implement?
- **Direct Answer**: An attribute in a child relation that references a candidate key (typically the primary key) of a parent relation, enforcing referential integrity.
- **Detailed Explanation**: When parent tuples are deleted, the RDBMS can execute: `CASCADE` (delete child tuples), `SET NULL` (set FK to null), `RESTRICT`/`NO ACTION` (block deletion), or `SET DEFAULT`.
- **CampusPulse Example**: `ROOMS(building_id)` uses `ON DELETE CASCADE` because a room cannot exist without its building. `MAINTENANCE_TICKETS(user_id)` uses `ON DELETE SET NULL` to preserve historical maintenance work orders even if an employee departs.
- **Follow-up Question**: *What error does Oracle throw if a foreign key is violated?* (Answer: `ORA-02291: integrity constraint violated - parent key not found`).

---

### Q4: Explain First Normal Form (1NF) with respect to CampusPulse.
- **Direct Answer**: A relation is in 1NF if and only if all underlying attribute domains contain only atomic (indivisible) scalar values, with no repeating groups or multivalued attributes.
- **CampusPulse Example**: In `ROOMS`, multimedia equipment is modeled as discrete boolean columns (`has_projector`, `has_ac`) rather than a comma-separated string like `amenities = 'projector,ac'`. In `BOOKINGS`, reservations are separate tuples, not embedded arrays in `ROOMS`.
- **Follow-up Question**: *Why is storing comma-separated values in a column bad for DBMS performance?* (Answer: It violates 1NF, prevents index usage, requires expensive `LIKE '%term%'` full table scans, and makes relational joins impossible).

---

### Q5: Explain Second Normal Form (2NF) and partial functional dependencies.
- **Direct Answer**: A relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on every candidate key (no partial functional dependency).
- **CampusPulse Example**: In relations with a single surrogate primary key (`id`), a proper subset of a single attribute cannot exist, so partial dependencies are mathematically impossible. In `ROOMS`, where the candidate key is composite `{building_id, room_number}`, room attributes like `capacity` depend on the specific room in that specific building, not on `building_id` alone.
- **Follow-up Question**: *Can a table with a single-column primary key violate 2NF?* (Answer: No, because partial dependencies require a composite candidate key).

---

### Q6: Explain Third Normal Form (3NF) and transitive functional dependencies.
- **Direct Answer**: A relation is in 3NF if it is in 2NF and for every non-trivial functional dependency $X \to Y$, either $X$ is a superkey or $Y$ is a prime attribute (no transitive dependency $X \to Z \to Y$).
- **CampusPulse Example**: In `BUILDINGS`, $\{id\} \to code \to name$. Since $code$ is declared `UNIQUE`, it is an alternate candidate key (superkey). Under the formal definition of 3NF, since $X$ ($code$) is a superkey, 3NF is preserved.
- **Follow-up Question**: *What kind of anomaly does 3NF eliminate?* (Answer: Update anomalies, where changing a transitive attribute requires modifying multiple redundant tuples).

---

### Q7: Explain Boyce-Codd Normal Form (BCNF) and prove CampusPulse satisfies it.
- **Direct Answer**: A relation is in BCNF if for every non-trivial functional dependency $X \to Y$, determinant $X$ is strictly a superkey.
- **CampusPulse Example**: Across all 6 relations, the only active determinants are:
  - `USERS`: $\{id\}$, $\{email\}$
  - `BUILDINGS`: $\{id\}$, $\{code\}$
  - `ROOMS`: $\{id\}$, $\{building\_id, room\_number\}$
  - `BOOKINGS`, `MAINTENANCE_TICKETS`, `EVENTS`: $\{id\}$
  Every one of these determinants is a candidate key. Therefore, every determinant is a superkey, proving BCNF compliance.
- **Follow-up Question**: *Can a schema be in 3NF but not in BCNF?* (Answer: Yes, when a dependency $X \to Y$ has a non-superkey determinant $X$ and $Y$ is a prime attribute belonging to overlapping candidate keys).

---

### Q8: What are Relational Anomalies? Give examples of how your schema prevents them.
- **Direct Answer**: Inconsistencies that arise in poorly normalized relations: Insertion, Deletion, and Update anomalies.
- **CampusPulse Example**:
  - *Insertion Anomaly*: Having a separate `BUILDINGS` relation allows registering a newly constructed building before any rooms or bookings are created.
  - *Deletion Anomaly*: Having `BOOKINGS` as an associative entity ensures that deleting a cancelled reservation does not delete the room or user record.
  - *Update Anomaly*: Renaming a building requires modifying only one tuple in `BUILDINGS`; child tables reference `building_id`.
- **Follow-up Question**: *What is an Integrity Anomaly?* (Answer: Storing impossible domain values, such as negative room capacity or end times earlier than start times, prevented via `CHECK` constraints).

---

### Q9: What is Relational Algebra and how does it relate to SQL?
- **Direct Answer**: A formal procedural query language consisting of mathematical operators ($\sigma$ Selection, $\pi$ Projection, $\times$ Cartesian Product, $\cup$ Union, $-$ Set Difference, $\bowtie$ Natural Join, $\rho$ Rename) that serve as the theoretical foundation for SQL query planning and optimization.
- **CampusPulse Example**: SQL `SELECT room_number, capacity FROM rooms WHERE capacity >= 50` maps to relational algebra expression: $\pi_{room\_number, capacity} (\sigma_{capacity \ge 50} (ROOMS))$.
- **Follow-up Question**: *How does an RDBMS query optimizer use relational algebra?* (Answer: It transforms SQL into an algebraic operator tree and applies rewrite heuristics, such as pushing selections ($\sigma$) below joins ($\bowtie$) to minimize intermediate row sets).

---

### Q10: What is Domain Integrity and how is it enforced in CampusPulse?
- **Direct Answer**: Ensuring that values stored in an attribute belong to the legitimate defined set of valid values for that attribute domain.
- **CampusPulse Example**: Enforced via Oracle `CHECK` constraints:
  - `chk_user_role`: `role IN ('STUDENT', 'FACULTY', 'ADMIN', 'STAFF')`
  - `chk_building_status`: `status IN ('OPERATIONAL', 'PARTIAL', 'MAINTENANCE')`
  - `chk_room_capacity_positive`: `capacity > 0`
  - `chk_booking_times_valid`: `end_time > start_time`
- **Follow-up Question**: *What happens if an API bug sends capacity = -5?* (Answer: The database kernel rejects the statement with `ORA-02290: check constraint violated`).

---

### Q11: What is Referential Integrity and what does "Orphaned Tuple" mean?
- **Direct Answer**: The rule that every foreign key value in a child table must match an existing primary key value in the referenced parent table, or be NULL. An orphaned tuple is a child record whose parent foreign key references a non-existent parent ID.
- **CampusPulse Example**: In `verify_db.py`, Check 8 executes:
  `SELECT COUNT(*) FROM bookings WHERE room_id NOT IN (SELECT id FROM rooms);`
  Returning 0 confirms zero orphaned tuples exist.
- **Follow-up Question**: *Can an orphaned tuple be created if foreign keys are disabled?* (Answer: Yes, during bulk loads or in systems lacking foreign keys).

---

### Q12: Why did you choose surrogate auto-incrementing identity columns?
- **Direct Answer**: Oracle 21c identity columns (`GENERATED BY DEFAULT AS IDENTITY`) generate unique numeric keys automatically using native database sequences.
- **Detailed Explanation**: Surrogate keys decouple table relationships from mutable business attributes (such as user email changes), maintain compact 4-byte/8-byte B-Tree index structures, and eliminate composite foreign keys in child relations.
- **Follow-up Question**: *What happens if you supply an explicit ID during an insert on an identity column?* (Answer: `GENERATED BY DEFAULT` allows inserting an explicit ID if provided, falling back to sequence generation when omitted).

---

### Q13: What is the purpose of the associative entity `BOOKINGS`?
- **Direct Answer**: `BOOKINGS` acts as an associative entity modeling the Many-to-Many ($M:N$) temporal relationship between `USERS` and `ROOMS`.
- **CampusPulse Example**: One user can book many rooms over time; one room can be booked by many users over time. `BOOKINGS` resolves this $M:N$ relationship into two $1:N$ relationships: `USERS (1) -> (N) BOOKINGS` and `ROOMS (1) -> (N) BOOKINGS`.
- **Follow-up Question**: *Why can't we store user_id directly inside ROOMS?* (Answer: Because that would restrict each room to having at most one user for all time, violating 1NF repeating groups).

---

### Q14: Explain the difference between physical data independence and logical data independence.
- **Direct Answer**:
  - *Physical Data Independence*: The ability to modify physical storage structures (e.g. creating B-Tree indexes, changing tablespaces) without altering conceptual schemas or application code.
  - *Logical Data Independence*: The ability to modify conceptual schemas (e.g. splitting tables, adding columns) without rewriting external views or user queries.
- **CampusPulse Example**: Creating index `idx_bk_room_time` improved query performance without requiring changes to our FastAPI queries (physical independence). Querying view `v_dashboard_summary` insulates the frontend from changes to underlying table structures (logical independence).

---

### Q15: How does CampusPulse model temporal time zones?
- **Direct Answer**: Using Oracle's native `TIMESTAMP WITH TIME ZONE` data type.
- **Detailed Explanation**: Storing timestamps with explicit time zone offsets prevents daylight saving ambiguities and ensures accurate interval comparisons between web clients operating in UTC and Oracle database servers operating in local system time.
- **Follow-up Question**: *What is the difference between TIMESTAMP and TIMESTAMP WITH TIME ZONE in Oracle?* (Answer: `TIMESTAMP` stores year to fractional seconds without time zone offset; `TIMESTAMP WITH TIME ZONE` includes displacement from UTC).

---

### Q16: What is a Unique Constraint versus a Primary Key?
- **Direct Answer**: A Primary Key uniquely identifies tuples and strictly disallows `NULL` values (only one primary key per table). A Unique Constraint enforces uniqueness across non-null values (multiple unique constraints permitted per table).
- **CampusPulse Example**: In `USERS`, `id` is the Primary Key, while `email` has a `UNIQUE` constraint (`uq_users_email`). In `ROOMS`, `(building_id, room_number)` has a composite `UNIQUE` constraint (`uq_building_room_number`).

---

### Q17: What is Lossless-Join Decomposition?
- **Direct Answer**: Decomposing a relation $R$ into sub-relations $R_1$ and $R_2$ such that a natural join reconstructs the exact original relation without producing spurious (ghost) tuples ($R_1 \bowtie R_2 = R$).
- **CampusPulse Example**: Decomposing facility management into `BUILDINGS` and `ROOMS` where $R_1 \cap R_2 = \{building\_id\}$, which is the primary key of `BUILDINGS`. Since the intersection is a superkey of $R_1$, the decomposition is mathematically lossless.

---

### Q18: What is Dependency Preservation?
- **Direct Answer**: A decomposition preserves dependencies if the union of functional dependencies in the decomposed relations logically implies all functional dependencies in the original relation ($F^+ = (F_1 \cup F_2)^+$).
- **CampusPulse Example**: All functional dependencies in our project (such as $\{code\} \to \{name\}$ in `BUILDINGS` and $\{building\_id, room\_number\} \to \{capacity\}$ in `ROOMS`) can be checked inside individual tables without requiring cross-table joins.

---

### Q19: What is the difference between a CLOB and a VARCHAR2 in Oracle?
- **Direct Answer**: `VARCHAR2` stores variable-length character data up to 4,000 bytes (or 32,767 bytes in extended mode) inline in table blocks. `CLOB` (Character Large Object) stores up to 128 terabytes out-of-line in separate LOB segments.
- **CampusPulse Example**: In `MAINTENANCE_TICKETS` and `BUILDINGS`, detailed incident reports and facility overviews are stored as `CLOB` to accommodate comprehensive technical logs, while short titles use `VARCHAR2(150)`.
- **Follow-up Question**: *Can you group by a CLOB column in Oracle SQL?* (Answer: No, Oracle raises `ORA-00932: inconsistent datatypes: expected - got CLOB` when CLOB columns appear in `GROUP BY` or `DISTINCT` clauses).

---

### Q20: How did you avoid ORA-00932 when aggregating building data?
- **Direct Answer**: In `CampusService.get_buildings`, `BUILDINGS.description` is a `CLOB`. Instead of grouping by all building attributes, we group `ROOMS` by `building_id` first in a sub-query, and join the aggregated room metrics back to `BUILDINGS` without placing the `CLOB` column into the `GROUP BY` clause.
