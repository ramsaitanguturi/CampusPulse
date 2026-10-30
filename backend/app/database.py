import logging
import sqlite3
import sys
from sqlite3 import Connection as SQLite3Connection
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings, mask_database_url

logger = logging.getLogger("campuspulse.database")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter("[%(levelname)s] %(name)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Register SQLite foreign key enforcement before any connection/engine is created.
# This ensures PRAGMA foreign_keys = ON is executed for all SQLite connections,
# including connections created via pooling.
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, SQLite3Connection) or type(dbapi_connection).__module__ == "sqlite3":
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

Base = declarative_base()

def create_app_engine(database_url: str = None):
    url = database_url or settings.get_database_url()
    
    if not url:
        masked = "<None>"
        err_msg = (
            "CRITICAL: No database configuration provided!\n"
            "CampusPulse requires Oracle Database as its primary authoritative backend.\n"
            "Please set DATABASE_URL (e.g. 'oracle+oracledb://USER:PASSWORD@HOST:PORT/?service_name=SERVICE')\n"
            "or set DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_SERVICE_NAME in .env.\n"
            "For offline unit testing only, set DATABASE_URL=sqlite:///./campuspulse.db explicitly."
        )
        logger.error(err_msg)
        raise RuntimeError(err_msg)

    masked_url = mask_database_url(url)
    is_oracle = "oracle" in url
    is_sqlite = "sqlite" in url
    is_postgres = "postgres" in url

    dialect_name = (
        "Oracle SQL 21c (oracledb)" if is_oracle 
        else "PostgreSQL (psycopg)" if is_postgres 
        else "SQLite" if is_sqlite 
        else "Unknown"
    )

    engine_kwargs = {"echo": False}
    if is_oracle:
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_size"] = 10
        engine_kwargs["max_overflow"] = 20
    elif is_sqlite:
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    try:
        engine = create_engine(url, **engine_kwargs)
        
        # Test connection actively
        ping_sql = "SELECT 1 FROM dual" if is_oracle else "SELECT 1"
        with engine.connect() as conn:
            conn.execute(text(ping_sql))

        logger.info(f"Database connected successfully. Dialect: {dialect_name} | Target: {masked_url}")
        return engine

    except Exception as e:
        logger.error(f"FATAL: Database connection failed for {masked_url}: {e}")
        if is_oracle:
            raise ConnectionError(
                f"Oracle Database connection failed ({masked_url}).\n"
                f"Underlying error: {e}\n"
                "Actionable steps:\n"
                "1. Ensure the Oracle Database service (e.g., OracleServiceXE) and TNS Listener are running.\n"
                "2. Verify host, port, credentials, and service name (e.g., XEPDB1) in your .env file.\n"
                "3. Ensure the Oracle user has CONNECT and RESOURCE privileges.\n"
                "4. Note: Silent fallback to SQLite is disallowed for Oracle-targeted runs."
            ) from e
        raise

engine = create_app_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
