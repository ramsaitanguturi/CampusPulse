# Repository Codebase Audit Report

This document presents a comprehensive audit of the entire CampusPulse repository, detailing directory structures, components, and code observations.

---

## 1. Repository Inventory & File Categorization

### A. Root Configuration & Documentation Files
- `README.md`: Primary academic documentation covering architecture, setup, testing, and screenshots.
- `DATABASE_DESIGN.md`: Formal relational design, entity descriptions, functional dependencies, and 1NF–BCNF proofs.
- `ORACLE_DATABASE_GUIDE.md`: Oracle 21c XE deployment guide (`XEPDB1`, pooling, user provisioning).
- `TRANSACTION_AND_CONCURRENCY.md`: Theoretical and practical analysis of row-locking, compound triggers, and ACID proofs.
- `SQL_CONCEPTS.md`: Guide to the 20 syllabus SQL concepts.
- `TESTING_REPORT.md`: Audit of automated test suites.
- `PROJECT_DEMONSTRATION.md`: Step-by-step presentation walkthrough.
- `conftest.py`: Pytest bootstrap dynamically detecting live Oracle connection or spinning up throwaway SQLite.
- `pytest.ini`: Pytest configuration flags and filter warnings.
- `.env.example`: Configuration template for database connection URLs and CORS allowlists.

### B. Backend Architecture (`backend/app/`)
- `config.py`: Pydantic BaseSettings class loading `.env`, assembling CORS origins, and masking database credentials.
- `database.py`: Centralized SQLAlchemy engine creator with `pool_size=10, max_overflow=20`, `pool_pre_ping=True`, and connection event listener registering `PRAGMA foreign_keys = ON` for SQLite.
- `main.py`: FastAPI entrypoint with global exception handler, CORS allowlist middleware, and router registrations.
- `models/entities.py`: 6 declarative SQLAlchemy ORM classes: `User`, `Building`, `Room`, `Booking`, `MaintenanceTicket`, `Event`.
- `schemas/schemas.py`: Pydantic v2 schemas for all requests, responses, and dashboard telemetry metrics.
- `services/campus_service.py`: Service layer containing all business logic, multi-table joins, pessimistic row locks (`with_for_update()`), interval checks, and maintenance state machine.
- `routers/`: 8 modular API routers:
  - `dashboard.py`: Endpoint `/api/dashboard`.
  - `buildings.py`: Endpoints `/api/buildings` and `/api/buildings/{id}`.
  - `rooms.py`: Endpoints `/api/rooms`, `/api/rooms/available`, `/api/rooms/{id}`.
  - `bookings.py`: Endpoints `/api/bookings`, `/api/bookings` (POST), `/api/bookings/{id}/cancel`.
  - `maintenance.py`: Endpoints `/api/maintenance`, `/api/maintenance` (POST), `/api/maintenance/{id}/status`.
  - `events.py`: Endpoints `/api/events`, `/api/events` (POST).
  - `users.py`: Endpoint `/api/users`.
  - `analytics.py`: Endpoints `/api/analytics/queries`, `/api/analytics/execute/{id}`.

### C. Database Scripts (`backend/scripts/`)
- `oracle_schema.sql`: Authoritative Oracle 21c DDL script (6 tables, compound trigger, 2 views, 8 indexes).
- `sql_demonstrations.sql`: 20 syllabus SQL demonstration queries for SQL*Plus viva demo.
- `init_db.py`: Database initializer that compiles DDL and populates seed data idempotently.
- `verify_db.py`: 9-point integrity audit script testing connectivity, tables, views, triggers, constraints, indexes, record counts, and zero orphans.
- `drop_tables.sql`: Safe cascade drop helper.
- `create_oracle_user.sql`: User provisioning script for user `campuspulse`.
- `package_submission.py`: Clean academic submission packager.

### D. Automated Test Suites (`backend/tests/`)
- `test_api.py` (16 tests): API routes, filters, error codes, and regressions.
- `test_concurrency.py` (4 tests): Multi-threaded concurrent booking race conditions.
- `test_database_integrity.py` (12 tests): FK cascades, unique/check constraints, atomic rollbacks.
- `test_oracle_integration.py` (9 tests): Real cross-session locking, trigger enforcement, and data dictionary audits.
- `test_sql_demonstrations.py` (4 tests): Automated execution of syllabus SQL queries.

### E. Frontend Application (`frontend/src/`)
- `App.tsx`: Root view switcher, master state coordinator, and error banner.
- `services/api.ts`: Typed REST API client with custom `ApiError`.
- `types/index.ts`: TypeScript interfaces matching backend response models.
- `components/`: 8 UI view components:
  - `DashboardView.tsx`: Telemetry cards, Recharts Area/Bar charts, and recent activity feeds.
  - `CampusMap.tsx`: Vector SVG canvas with clickable building polygons and floor room selector.
  - `RoomsView.tsx`: Multi-parameter room search grid with detailed inspect modal.
  - `BookingsView.tsx`: Reservation matrix, booking modal with prominent red conflict alert.
  - `MaintenanceView.tsx`: Incident work order Kanban with status transition buttons.
  - `EventsView.tsx`: Campus event itinerary with category filters.
  - `DbmsStudioView.tsx`: SQL Viva workbench with latency display and one-click copy.
  - `Navbar.tsx` & `Sidebar.tsx`: Navigation chrome with live dialect status indicator.

---

## 2. Technical Observations & Codebase Health
- **Code Hygiene**: Zero hardcoded passwords found in source code; URL masking implemented across all loggers.
- **ORM-Database Harmony**: Column data types in `entities.py` perfectly match Oracle DDL in `oracle_schema.sql`.
- **Dialect Portability**: Code contains dialect-aware branches (`is_oracle = "oracle" in url`) to safely support both Oracle 21c and SQLite offline testing without compromising Oracle-specific features.
- **Zero Placeholder Files**: All files contain substantive, production-grade implementations.
