# 06 — Frontend Implementation & User Interface

## 1. Frontend Architecture & Technology Stack
- **Framework**: React 19 Single Page Application (SPA)
- **Language**: TypeScript (strict type checking enabled)
- **Build Tool**: Vite 8.3+ (instant HMR and production bundle optimization)
- **Styling**: Tailwind CSS v4 with custom dark cyberpunk aesthetic
- **Charts & Telemetry**: Recharts 3.x (responsive Area and Bar charts)
- **Icons**: Lucide React

---

## 2. Component Hierarchy & Navigation Matrix

```
App.tsx (Root State, Master View Controller & Global Error Boundary)
├── Navbar.tsx (Dialect Indicator, Live Connection Badge & Manual Refresh)
├── Sidebar.tsx (Tab Switcher with Real-Time Telemetry Counters)
│
└── Main Workspace (<main>)
    ├── [Tab 1] DashboardView.tsx
    │   ├── Telemetry Metric Cards (Buildings, Rooms, Bookings, Tickets)
    │   ├── Recharts AreaChart (Weekly Booking Volume Trends)
    │   ├── Recharts BarChart (Building-by-Building Occupancy Rates)
    │   └── Live Activity Feeds (Recent Bookings, Tickets, Upcoming Events)
    │
    ├── [Tab 2] CampusMap.tsx
    │   ├── Vector SVG Campus Digital Twin Canvas
    │   ├── Interactive Building Polygons (TURING, ENG, SCIENCE, etc.)
    │   └── Multi-Floor Spatial Room Inspector with Quick-Book Action
    │
    ├── [Tab 3] RoomsView.tsx
    │   ├── Filter Toolbar (Building, Type, Status, Min Capacity, Search)
    │   ├── Room Grid Cards (Capacity, AV Projector, AC, Status badges)
    │   └── Room Detail Modal (Live schedule, tickets, active session)
    │
    ├── [Tab 4] BookingsView.tsx
    │   ├── Reservation Schedule Table with Status Filters
    │   ├── "+ New Reservation" Modal with Form Validation
    │   ├── Prominent Red HTTP 409 Conflict Banner & Conflicting Booking Details
    │   └── "Cancel Booking" Action with Immediate Availability Restoration
    │
    ├── [Tab 5] MaintenanceView.tsx
    │   ├── Work Order Dispatch Kanban / Cards
    │   ├── Priority Badges (Critical, High, Medium, Low)
    │   └── In-line Status State Machine Transition Buttons (Open -> In Progress -> Resolved)
    │
    ├── [Tab 6] EventsView.tsx
    │   ├── Chronological Campus Event Horizon
    │   ├── Category Filter Chips (Tech, Academic, Workshop, Cultural)
    │   └── "+ Add Campus Event" Modal with Building-Room Validation
    │
    └── [Tab 7] DbmsStudioView.tsx
        ├── Query Selector Pills (Joins, Aggregation, NOT EXISTS, Subqueries, Views)
        ├── Live SQL Statement Syntax Highlighter
        ├── Millisecond Execution Latency Badge
        ├── One-Click "Copy SQL" Button
        └── Tabular Query Results Data Grid
```

---

## 3. UI State Management & API Integration
State management in CampusPulse is lightweight, robust, and clean:
- **Centralized Master State in `App.tsx`**: Holds `dashboardData`, `buildings`, `rooms`, `users`, and modal visibility flags.
- **Atomic API Client (`api.ts`)**: Encapsulates `fetch` calls, parses JSON responses, formats query parameters, and transforms HTTP error codes into typed `ApiError` instances.
- **Graceful Conflict Handling in `BookingsView.tsx`**: When a booking request returns HTTP 409, `api.ts` extracts the structured error payload containing the conflicting booking's title, organizer, and time window. The UI displays this directly in a prominent alert banner without crashing or losing form inputs.
- **Production Build Performance**: Compiled via `tsc -b && vite build` in ~1.3 seconds, generating an optimized client bundle.
