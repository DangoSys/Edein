#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    compose_file = repo_root / "scripts" / "docker" / "docker-compose.yml"
    command = ["docker", "compose", "-f", str(compose_file), "up", "-d", "--build"]
    subprocess.run(command, check=True, cwd=repo_root)


if __name__ == "__main__":
    main()

