#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from datetime import datetime
from pathlib import Path


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    compose_file = repo_root / "scripts" / "docker" / "docker-compose.yml"
    build_command = ["docker", "compose", "-f", str(compose_file), "build"]
    subprocess.run(build_command, check=True, cwd=repo_root)

    images = ["docker-api:latest", "docker-web:latest"]
    mongo_image = "mongo:7"
    mongo_exists = subprocess.run(
        ["docker", "image", "inspect", mongo_image],
        cwd=repo_root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ).returncode == 0
    if mongo_exists:
        images.append(mongo_image)

    dist_dir = repo_root / "scripts" / "docker" / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_file = dist_dir / f"edein-images-{ts}.tar"

    save_command = ["docker", "save", "-o", str(out_file), *images]
    subprocess.run(save_command, check=True, cwd=repo_root)
    print(out_file)


if __name__ == "__main__":
    main()
