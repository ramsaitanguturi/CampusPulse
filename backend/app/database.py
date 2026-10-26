import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings

logger = logging.getLogger("campuspulse.database")
logging.basicConfig(level=logging.INFO)

Base = declarative_base()

def get_engine():
    primary_url = settings.DATABASE_URL
    try:
        engine = create_engine(
            primary_url,
            pool_pre_ping=True,
            echo=False
        )
        # Test connection (Oracle requires 'FROM dual')
        ping_sql = "SELECT 1 FROM dual" if "oracle" in primary_url else "SELECT 1"
        with engine.connect() as conn:
            conn.execute(text(ping_sql))
        logger.info(f"Connected to primary database: {primary_url.split('@')[-1] if '@' in primary_url else primary_url}")
        return engine
    except Exception as e:
        logger.warning(f"Could not connect to primary database ({e}). Falling back to SQLite: {settings.SQLITE_FALLBACK_URL}")
        sqlite_engine = create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False},
            echo=False
        )
        return sqlite_engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
