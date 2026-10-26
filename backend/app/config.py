import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusPulse — Smart Campus Digital Twin"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Primary Database URL: connects to Oracle 21c XE via oracledb
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "oracle+oracledb://campuspulse:campuspulse123@localhost:1521/?service_name=XEPDB1"
    )
    POSTGRESQL_URL: str = "postgresql+psycopg://postgres@localhost:5432/campuspulse"
    SQLITE_FALLBACK_URL: str = "sqlite:///./campuspulse.db"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

