# Docker Deploy Scripts

## Commands

- Build images:
  - `./scripts/docker/build.py`
- Deploy (build + up):
  - `./scripts/docker/deploy.py`
- Package repository tarball:
  - `./scripts/docker/package.py`

## New Environment Deploy

1. Copy the generated tarball in `scripts/docker/dist/` to target machine.
2. Extract it:
   - `tar -xzf edein-<timestamp>.tar.gz`
3. Run:
   - `./scripts/docker/deploy.py`

