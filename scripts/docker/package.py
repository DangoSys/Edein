#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from datetime import datetime
from pathlib import Path


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = repo_root / "scripts" / "docker" / "dist"
    out_dir.mkdir(parents=True, exist_ok=True)
    archive = out_dir / f"edein-{ts}.tar.gz"

    exclude = [
        "--exclude=.git",
        "--exclude=.venv",
        "--exclude=server/.venv",
        "--exclude=web/node_modules",
        "--exclude=target",
        "--exclude=.local",
        "--exclude=**/__pycache__",
        "--exclude=*.pyc",
    ]
    command = [
        "tar",
        "-czf",
        str(archive),
        *exclude,
        "-C",
        str(repo_root),
        ".",
    ]
    subprocess.run(command, check=True)
    print(archive)


if __name__ == "__main__":
    main()

