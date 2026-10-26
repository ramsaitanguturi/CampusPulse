import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import (
    dashboard,
    buildings,
    rooms,
    bookings,
    maintenance,
    events,
    users,
    analytics,
)

logger = logging.getLogger("campuspulse.api")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CampusPulse: Smart Campus Digital Twin DBMS Semester Project API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS using explicit environment allowlist (no wildcard with credentials)
origins = [origin for origin in settings.CORS_ORIGINS if origin != "*"]
if not origins:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register routers under /api
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(buildings.router, prefix=settings.API_PREFIX)
app.include_router(rooms.router, prefix=settings.API_PREFIX)
app.include_router(bookings.router, prefix=settings.API_PREFIX)
app.include_router(maintenance.router, prefix=settings.API_PREFIX)
app.include_router(events.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please consult server logs."}
    )

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "api": "/api"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
