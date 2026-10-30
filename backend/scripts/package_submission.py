"""CampusPulse — Academic Submission Packaging Utility.

Packages the complete project into a clean distribution ZIP file suitable
for university DBMS submission, strictly excluding all unnecessary generated
files, cache artifacts, local environments, and temporary files.

Excluded from Submission ZIP:
- backend/venv/ (Virtual environment binaries)
- frontend/node_modules/ (Node packages)
- .git/ (Version control metadata)
- .pytest_cache/ (Test runner cache)
- __pycache__/ and *.pyc, *.pyo (Python bytecode)
- *.db, *.sqlite3 (Local database binaries)
- .env, backend/.env (Local secret files — .env.example is included)
- *.log, *.tmp (Temporary and log files)
"""

import os
import sys
import zipfile
from pathlib import Path

# Paths to strictly exclude from the final submission archive
EXCLUDE_DIRS = {
    "venv",
    ".venv",
    "node_modules",
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".idea",
    ".vscode",
}

EXCLUDE_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".log",
    ".tmp",
    ".db",
    ".sqlite",
    ".sqlite3",
}

EXCLUDE_EXACT_FILES = {
    ".env",
    "campuspulse_test.db",
    "CampusPulse_Submission.zip",
    "CampusPulse.zip",
}


def should_exclude(rel_path: Path) -> bool:
    # Check directory parts
    for part in rel_path.parts:
        if part in EXCLUDE_DIRS:
            return True

    # Check exact filenames
    if rel_path.name in EXCLUDE_EXACT_FILES:
        return True

    # Check backend/.env
    if rel_path.name == ".env" or rel_path.name.endswith(".env"):
        return True

    # Check file extensions
    if rel_path.suffix.lower() in EXCLUDE_EXTENSIONS:
        return True

    return False


def build_submission_zip(output_path: Path = None) -> Path:
    project_root = Path(__file__).resolve().parent.parent.parent
    if output_path is None:
        output_path = project_root / "CampusPulse_Submission.zip"

    print("=" * 65)
    print(" CampusPulse — Final Academic Submission Packager")
    print("=" * 65)
    print(f"[*] Source Root  : {project_root}")
    print(f"[*] Target ZIP   : {output_path}")

    # Remove existing zip if present
    if output_path.exists():
        output_path.unlink()

    included_count = 0
    total_size_bytes = 0

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(project_root):
            # Prune excluded directories in-place to avoid traversing them
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file_name in files:
                file_path = Path(root) / file_name
                rel_path = file_path.relative_to(project_root)

                if should_exclude(rel_path):
                    continue

                zip_file.write(file_path, arcname=rel_path.as_posix())
                included_count += 1
                total_size_bytes += file_path.stat().st_size

    zip_size_mb = output_path.stat().st_size / (1024 * 1024)
    raw_size_mb = total_size_bytes / (1024 * 1024)

    print(f"[SUCCESS] Packaged {included_count} clean source and documentation files.")
    print(f"[*] Uncompressed Size : {raw_size_mb:.2f} MB")
    print(f"[*] Compressed ZIP    : {zip_size_mb:.2f} MB ({output_path.name})")
    print("=" * 65)
    return output_path


if __name__ == "__main__":
    out_file = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    build_submission_zip(out_file)

