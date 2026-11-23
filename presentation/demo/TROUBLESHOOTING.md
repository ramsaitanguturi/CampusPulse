# Demonstration Troubleshooting Guide

If an issue occurs right before or during your evaluation, consult this troubleshooting guide for instant resolution.

---

## Problem 1: "Database connection failed" or Oracle Listener Inactive
**Symptom**: FastAPI server logs `ConnectionError: Oracle Database connection failed`.
**Root Cause**: Oracle Windows services (`OracleServiceXE` or `OracleOraDB21Home1TNSListener`) are stopped.
**Resolution**:
1. Open PowerShell as Administrator and run:
   ```powershell
   Start-Service OracleServiceXE
   Start-Service OracleOraDB21Home1TNSListener
   ```
2. Verify services:
   ```powershell
   Get-Service *oracle*
   ```
3. Test listener ping:
   ```powershell
   lsnrctl status
   ```

---

## Problem 2: Port 8000 Already in Use (FastAPI)
**Symptom**: `[Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000): only one usage of each socket address is normally permitted`.
**Root Cause**: A previous uvicorn process is still running in the background.
**Resolution**:
1. Find and terminate the process holding port 8000:
   ```powershell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
   ```
2. Restart backend:
   ```powershell
   backend\venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000
   ```

---

## Problem 3: Port 5173 Already in Use (Vite / Frontend)
**Symptom**: Vite starts on port `5174` instead of `5173`, causing CORS warnings.
**Resolution**:
1. Terminate existing Node processes:
   ```powershell
   Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```
2. Restart frontend:
   ```powershell
   Set-Location frontend; npm.cmd run dev
   ```

---

## Problem 4: Browser Shows "Failed to connect to CampusPulse backend API"
**Symptom**: Red error banner on top of dashboard.
**Resolution**:
1. Check if backend terminal is open and showing `Uvicorn running on http://127.0.0.1:8000`.
2. Open [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) in a new browser tab.
3. If healthy, click **RETRY** on the frontend banner or refresh the browser.

---

## Problem 5: Database Seeding / Missing Demo Data
**Symptom**: Dashboard shows 0 rooms or missing buildings.
**Resolution**:
Run the idempotent database seeder to repopulate seed data without dropping schema:
```powershell
backend\venv\Scripts\python.exe backend\scripts\init_db.py
```
