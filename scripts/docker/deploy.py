#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    compose_file = repo_root / "scripts" / "docker" / "docker-compose.yml"
    down_command = ["docker", "compose", "-f", str(compose_file), "down", "--remove-orphans"]
    subprocess.run(down_command, check=False, cwd=repo_root)

    # Ensure name-conflicting containers from other projects are removed.
    rm_command = ["docker", "rm", "-f", "edein-mongo", "edein-api", "edein-web"]
    subprocess.run(rm_command, check=False, cwd=repo_root)

    up_command = ["docker", "compose", "-f", str(compose_file), "up", "-d", "--build"]
    subprocess.run(up_command, check=True, cwd=repo_root)


if __name__ == "__main__":
    main()
