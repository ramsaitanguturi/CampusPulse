"""Pytest bootstrap for CampusPulse.

Two problems this solves:

1. ``app.database`` builds its engine and pings the database at import time, so
   the suite cannot even be collected without a configured ``DATABASE_URL``.
2. The API tests mutate data (they create and cancel bookings and resolve
   maintenance tickets). Pointing them at the Oracle schema configured in
   ``.env`` would quietly corrupt the demo dataset, and Oracle is optional for
   ordinary test runs.

So unless the caller has explicitly chosen a database via ``DATABASE_URL``, this
module creates a throwaway SQLite database, seeds it through the documented
``backend/scripts/init_db.py`` path, and exports the URL before any test module
imports the app. Set ``DATABASE_URL`` yourself to test against another engine
(e.g. Oracle); the Oracle-only tests then run instead of skipping.
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INIT_SCRIPT = ROOT / "backend" / "scripts" / "init_db.py"


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


if not os.environ.get("DATABASE_URL", "").strip():
    _bootstrap_sqlite()
