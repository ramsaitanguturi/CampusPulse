# Presentation Outline & Timing Guide

## 1. Target Presentation Duration
- **Recommended Total Time**: **12 to 15 Minutes**
  - **Slide Deck Presentation**: 7–8 Minutes
  - **Live Application & SQL Demo**: 4–5 Minutes
  - **Q&A and Viva Defense**: 3–5 Minutes

---

## 2. 20-Slide Structure & Agenda Breakdown

| Slide # | Slide Title | Key Academic Focus | Target Time |
|---|---|---|---|
| **Slide 1** | **Title & Introduction** | Project identity, authors & Oracle 21c primary backend | 0:30 |
| **Slide 2** | **Problem Statement** | Campus scheduling conflicts, race conditions, maintenance disconnect | 0:45 |
| **Slide 3** | **Objectives & Scope** | Relational integrity, concurrency control, spatial twin | 0:30 |
| **Slide 4** | **System Architecture** | 3-tier architecture: React 19 + FastAPI + Oracle 21c | 0:45 |
| **Slide 5** | **Technology Stack** | Driver, ORM, REST, SPA, and database rationale | 0:30 |
| **Slide 6** | **Relational Schema (6 Entities)** | The 6 core relations and their institutional roles | 0:45 |
| **Slide 7** | **Entity-Relationship (ER) Model** | Cardinalities, primary keys & cascading delete actions | 0:45 |
| **Slide 8** | **Formal Normalization Proofs** | 1NF, 2NF, 3NF, and BCNF mathematical proofs | 1:00 |
| **Slide 9** | **Integrity Constraints & Domain Rules** | PK, FK, Unique, and Check constraints | 0:30 |
| **Slide 10**| **Core SQL Concepts Implemented** | Summary of all 20 applied SQL syllabus topics | 0:45 |
| **Slide 11**| **Advanced SQL: Subqueries & Joins** | 4-way joins, pre-aggregated subqueries & NOT EXISTS | 0:45 |
| **Slide 12**| **Database Analytics Views** | `v_dashboard_summary` & `v_room_live_status` | 0:30 |
| **Slide 13**| **Transaction Management & ACID** | Atomicity, consistency, isolation, durability proofs | 0:45 |
| **Slide 14**| **Half-Open Interval Scheduling** | Mathematical proof of $[start\_time, end\_time)$ non-overlap | 0:45 |
| **Slide 15**| **Concurrency Control & Row Locking** | `SELECT ... FOR UPDATE` on parent room row | 1:00 |
| **Slide 16**| **Oracle PL/SQL Compound Trigger** | Overcoming `ORA-04091` mutating-table error | 1:00 |
| **Slide 17**| **Live Demonstration Transition** | Seamless handoff to practical browser & SQL demo | 0:30 |
| **Slide 18**| **Testing & Quality Assurance** | 45 automated tests (100% pass) against Oracle 21c | 0:45 |
| **Slide 19**| **Limitations & Trade-offs** | Honest analysis of locking granularity & auth scope | 0:30 |
| **Slide 20**| **Conclusion & Viva Defense** | Final summary & readiness for professor examination | 0:30 |

---

## 3. Fast-Track Presentation Mode (5–7 Minute Condensed Version)
If the evaluation panel asks for a brief executive summary, condense into these 5 slides:
1. **Slide 1 (Title)** + **Slide 4 (Architecture)**: 1 minute
2. **Slide 7 (ER Model)** + **Slide 8 (BCNF Normalization)**: 1.5 minutes
3. **Slide 15 (Concurrency)** + **Slide 16 (Compound Trigger)**: 2 minutes
4. **Slide 18 (Testing & Verification)**: 30 seconds
5. **Jump straight to Live Demonstration**: 2 minutes
