"""Pytest bootstrap for CampusPulse.

Behavior:
1. If ``DATABASE_URL`` is explicitly passed in the process environment, use it.
2. Otherwise, check ``.env`` (or ``backend/.env``). If an Oracle database is
   configured and reachable (e.g. Oracle 21c XE), use it so that the full test
   suite, including Oracle integration, concurrency row-locking, and PL/SQL
   trigger tests, runs against the real authoritative Oracle database.
3. If no Oracle database is reachable or configured, create a temporary throwaway
   SQLite database via ``backend/scripts/init_db.py`` so that offline unit and API
   tests can still run safely.
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent
INIT_SCRIPT = ROOT / "backend" / "scripts" / "init_db.py"


def _is_oracle_reachable(url: str) -> bool:
    if "oracle" not in url:
        return False
    try:
        from sqlalchemy import create_engine, text
        test_engine = create_engine(url, pool_pre_ping=True)
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM dual"))
        test_engine.dispose()
        return True
    except Exception:
        return False


def _bootstrap_sqlite() -> None:
    db_dir = Path(tempfile.mkdtemp(prefix="campuspulse-tests-"))
    db_url = f"sqlite:///{(db_dir / 'campuspulse.db').as_posix()}"

    env = {**os.environ, "DATABASE_URL": db_url}
    result = subprocess.run(
        [sys.executable, str(INIT_SCRIPT)],
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "Failed to seed the test database via backend/scripts/init_db.py.\n"
            f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )

    os.environ["DATABASE_URL"] = db_url


# Determine authoritative database URL
current_url = os.environ.get("DATABASE_URL", "").strip()

if not current_url:
    # Check .env or backend/.env
    env_file = ROOT / ".env"
    if not env_file.exists():
        env_file = ROOT / "backend" / ".env"
    
    if env_file.exists():
        env_vars = dotenv_values(env_file)
        configured_url = env_vars.get("DATABASE_URL", "").strip()
        if configured_url and _is_oracle_reachable(configured_url):
            os.environ["DATABASE_URL"] = configured_url
            current_url = configured_url

if not current_url:
    _bootstrap_sqlite()
