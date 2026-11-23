# CampusPulse — University Project Presentation & Viva Defense Package

This package contains everything needed to present, defend, and demonstrate **CampusPulse: Smart Campus Operations & Digital Twin** in a university DBMS laboratory and viva evaluation.

---

## 📁 Package Structure

```
presentation/
├── README.md                          <- Directory index & quick-start revision
├── 01_PROJECT_OVERVIEW.md             <- Problem, objectives, motivation & scope
├── 02_COMPLETE_ARCHITECTURE.md        <- 3-tier system architecture & data flow
├── 03_DATABASE_DESIGN.md              <- 6 relations, ER model, constraints & normalization
├── 04_SQL_AND_DBMS_CONCEPTS.md        <- 20 syllabus SQL concepts with code & proofs
├── 05_BACKEND_IMPLEMENTATION.md       <- FastAPI, SQLAlchemy, services & API endpoints
├── 06_FRONTEND_IMPLEMENTATION.md      <- React 19, TypeScript, state & interactive components
├── 07_ADVANCED_DATABASE_FEATURES.md   <- Concurrency, SELECT FOR UPDATE & Compound Triggers
├── 08_TESTING_AND_VERIFICATION.md     <- 45 automated tests audit (100% pass verification)
├── 09_KNOWN_LIMITATIONS.md            <- Honest architectural trade-offs & future scope
│
├── slides/                            <- Fast presentation preparation materials
│   ├── presentation_outline.md        <- 12–15 minute slide deck timing & agenda
│   ├── slide_content.md               <- Slide-ready bullet points & visual specifications
│   └── speaker_notes.md               <- Word-for-word talking points & keywords
│
├── demo/                              <- Step-by-step practical demonstration guides
│   ├── DEMONSTRATION_GUIDE.md         <- Complete 6-phase live demonstration walkthrough
│   ├── LIVE_DEMO_SCRIPT.md            <- Exact click-by-click script for presentation
│   ├── SQL_DEMONSTRATION_GUIDE.md     <- 20 SQL queries for live execution in SQL*Plus
│   ├── DEMO_DATA_REFERENCE.md         <- Ready-to-use rooms, users, times for zero-failure demo
│   ├── EXPECTED_OUTPUTS.md            <- Anticipated outputs & terminal verification logs
│   ├── TROUBLESHOOTING.md             <- Quick fixes for port conflicts, listener, or errors
│   └── FALLBACK_DEMONSTRATION.md      <- Offline SQLite backup demo if Oracle is down
│
├── viva/                              <- Comprehensive viva examiner defense bank
│   ├── COMPLETE_VIVA_QUESTIONS.md     <- Master index of all 100+ viva questions
│   ├── DATABASE_VIVA.md               <- Core DBMS theory, ACID, keys & normalization
│   ├── SQL_VIVA.md                    <- Relational algebra, joins, subqueries & aggregation
│   ├── ORACLE_VIVA.md                 <- Oracle 21c, PL/SQL triggers, mutating tables & locking
│   ├── BACKEND_VIVA.md                <- FastAPI, async, connection pooling & ORM
│   ├── FRONTEND_VIVA.md               <- React 19, TypeScript, SVG map & state handling
│   ├── PROJECT_DEFENSE.md             <- High-difficulty defense & "Exposing Weaknesses"
│   └── RAPID_REVISION.md              <- 10-minute cram sheet before entering evaluation
│
├── diagrams/                          <- Mermaid visual diagrams for slides & reports
│   ├── SYSTEM_ARCHITECTURE.md         <- Full stack component interaction diagram
│   ├── DATABASE_ER_DIAGRAM.md         <- Entity-Relationship diagram with attributes & cardinality
│   ├── APPLICATION_DATA_FLOW.md       <- End-to-end data lifecycle diagram
│   ├── BOOKING_TRANSACTION_FLOW.md    <- Concurrency & conflict check transaction flowchart
│   └── CONCURRENCY_CONTROL_FLOW.md    <- SELECT FOR UPDATE & lock queuing diagram
│
└── audit/                             <- Verification & audit records
    ├── REPOSITORY_AUDIT.md            <- Complete scan of existing repository files
    ├── IMPLEMENTATION_TRACEABILITY.md <- Presentation claims mapped to exact source lines
    ├── CLAIMS_VERIFICATION.md         <- Code-verified facts vs non-existent claims
    └── PRESENTATION_READINESS.md      <- Final examiner readiness checklist
```

---

## ⚡ 10-Minute Rapid Revision Checklist

Before presenting to the panel, memorize these five core technical highlights:

1. **Authoritative Database**: Oracle Database 21c Enterprise/Express Edition (`XEPDB1`) using `python-oracledb` in Thin Mode. (Offline fallback to SQLite supported for testing).
2. **Normalized Relational Schema**: 6 core relations (`USERS`, `BUILDINGS`, `ROOMS`, `BOOKINGS`, `MAINTENANCE_TICKETS`, `EVENTS`) fully normalized to **3NF and BCNF**.
3. **Pessimistic Concurrency Control**: In `CampusService.create_booking`, an exclusive row-level lock (`SELECT ... FROM rooms WHERE id = :room_id FOR UPDATE`) serializes parallel booking transactions targeting the same room, preventing race conditions.
4. **Mutating-Table-Free Compound Trigger**: Oracle compound trigger `TRG_NO_OVERLAPPING_BOOKINGS` enforces half-open interval $[start\_time, end\_time)$ overlap checks at the kernel level without triggering `ORA-04091`.
5. **Verified Test Suite**: 45 automated tests in `backend/tests/` passed 100% on live Oracle 21c (API, concurrency, database integrity, Oracle integration, and SQL demos).
