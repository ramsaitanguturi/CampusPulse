# Frontend Viva: React 19, TypeScript & Vector Digital Twin (Questions 76–90)

---

### Q76: What is React 19 and what features are utilized in CampusPulse?
- **Direct Answer**: The latest major release of the React user interface library, offering enhanced client rendering performance, fine-grained state updates, and improved hydration. CampusPulse utilizes modular functional components with React Hooks (`useState`, `useEffect`).

---

### Q77: Why was TypeScript chosen over plain JavaScript for the frontend?
- **Direct Answer**: TypeScript provides compile-time type safety. All database models, API responses, and form inputs are defined in `types/index.ts`. If an API response model changes, the TypeScript compiler (`tsc -b`) immediately flags discrepancies during build time.

---

### Q78: How is the vector Campus Map implemented?
- **Direct Answer**: In [frontend/src/components/CampusMap.tsx](file:///c:/Users/ramsa/Desktop/CampusPulse/frontend/src/components/CampusMap.tsx), the campus map is rendered using **pure inline SVG elements** (`<polygon>`, `<rect>`, `<path>`). Building coordinates (`map_x`, `map_y`) from Oracle dynamically position interactive building nodes on the vector canvas.

---

### Q79: What happens when a user clicks a building on the Campus Map?
- **Direct Answer**: An `onClick` handler selects the building, triggers an API request to `/api/buildings/{id}` to fetch its constituent rooms floor-by-floor, and populates the right-hand spatial inspector panel.

---

### Q80: How does the UI display booking conflicts to the user?
- **Direct Answer**: When `api.createBooking` throws an `ApiError` with `status === 409`, `BookingsView.tsx` extracts `err.message` and `err.data.conflicting_booking` and renders a prominent red alert banner displaying the title, organizer name, and overlapping time window.

---

### Q81: What charting library powers the Operations Dashboard?
- **Direct Answer**: **Recharts 3.x**. We render an `AreaChart` with neon gradients for weekly booking volume trends, and a `BarChart` for building-by-building room occupancy rates.

---

### Q82: How does the UI prevent double-clicking / form spam during booking submission?
- **Direct Answer**: A `submitting` boolean state disables the submit button and renders a spinner (`submitting ? 'Confirming...' : 'Confirm Reservation'`) until the API response is received.

---

### Q83: How does the frontend communicate with the backend?
- **Direct Answer**: Through a centralized HTTP client in `src/services/api.ts` using the native browser `fetch` API. In development, Vite proxies `/api` requests to `http://localhost:8000`.

---

### Q84: What is the purpose of the `DbmsStudioView.tsx` component?
- **Direct Answer**: It serves as an academic viva workbench. Professors can click through 5 pre-compiled SQL queries, inspect the live SQL syntax, and click "Execute Query" to measure real-time latency and observe tabular results returned by Oracle.

---

### Q85: How does the one-click "Copy SQL" button work in DBMS Studio?
- **Direct Answer**: Uses the browser's `navigator.clipboard.writeText()` API to copy the active SQL query string to the system clipboard, transitioning a button icon to a green checkmark for 2 seconds.

---

### Q86: How does the Navbar indicate the database engine?
- **Direct Answer**: Displays a live connection badge reading `ORACLE SQL 21c • ORACLEDB` with a pulsating green status indicator, signaling active connectivity to the authoritative backend.

---

### Q87: What is Tailwind CSS v4 and how is it used?
- **Direct Answer**: A utility-first CSS framework. CampusPulse uses Tailwind CSS v4 to enforce a cohesive cyberpunk dark-mode theme (`bg-black`, `text-zinc-100`, `border-violet-800/60`, `text-emerald-400`).

---

### Q88: How are date and time inputs formatted for the backend?
- **Direct Answer**: Date picker (`<input type="date">`) and time select (`<select>`) values are formatted into ISO 8601 strings (e.g. `2026-11-24T10:00:00Z`) before being sent in JSON payloads.

---

### Q89: How does the frontend handle backend disconnection?
- **Direct Answer**: In `App.tsx`, if the initial `Promise.all` fails, `error` state is populated with an alert reading: *"Failed to connect to CampusPulse backend API. Ensure FastAPI server is running on port 8000."* A **RETRY** button allows re-attempting connection.

---

### Q90: How fast is the production frontend compilation?
- **Direct Answer**: Running `tsc -b && vite build` completes in **~1.36 seconds**, creating an optimized client bundle of ~700 KB minified JavaScript.
