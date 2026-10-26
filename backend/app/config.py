import os
import re
from typing import Optional, List, Union
from urllib.parse import quote_plus
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

def mask_database_url(url: Optional[str]) -> str:
    """Returns a sanitized copy of a database URL with passwords masked."""
    if not url:
        return "<None>"
    # Matches ://user:password@
    return re.sub(r"://([^:@]+):([^@]+)@", r"://\1:***@", url)

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusPulse — Smart Campus Digital Twin"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Primary Database configuration (Oracle 21c XE / Free)
    # Prefer configuring via DATABASE_URL or discrete DB_* variables
    DATABASE_URL: Optional[str] = None
    
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_HOST: Optional[str] = "localhost"
    DB_PORT: Optional[int] = 1521
    DB_SERVICE_NAME: Optional[str] = "XEPDB1"
    
    # Explicit SQLite fallback/test URL (only used if explicitly requested)
    SQLITE_URL: str = "sqlite:///./campuspulse.db"
    
    # Explicit flag or dialect choice: 'oracle', 'sqlite', 'postgres'
    DB_DIALECT: Optional[str] = None
    
    # CORS Allowlist - explicit origins only (no wildcard when credentials enabled)
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            # Strip any accidental wildcards if credentials will be enabled
            return [origin.strip() for origin in v if origin.strip() != "*"]
        return v

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_database_url(self) -> str:
        """
        Determines the authoritative database connection URL without hardcoded fallback credentials.
        Fails fast if Oracle credentials are required but missing.
        """
        # 1. Direct DATABASE_URL has highest precedence
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            return self.DATABASE_URL.strip()

        # 2. Discrete DB_* fields for Oracle
        if self.DB_USER and self.DB_PASSWORD:
            user_esc = quote_plus(self.DB_USER)
            pwd_esc = quote_plus(self.DB_PASSWORD)
            host = self.DB_HOST or "localhost"
            port = self.DB_PORT or 1521
            service = self.DB_SERVICE_NAME or "XEPDB1"
            return f"oracle+oracledb://{user_esc}:{pwd_esc}@{host}:{port}/?service_name={service}"

        # 3. Explicit SQLite mode
        if self.DB_DIALECT == "sqlite":
            return self.SQLITE_URL

        # 4. If nothing is specified, return empty string so database.py can produce an actionable error
        return ""

settings = Settings()
