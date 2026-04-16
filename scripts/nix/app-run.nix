{ writeShellApplication, webEnv, serverEnv }:
let
  webPort = 3000;
  apiPort = 8000;
in
writeShellApplication {
  name = "edein-run";
  runtimeInputs = [
    webEnv
    serverEnv
  ];
  text = ''
    set -euo pipefail
    if [ ! -f "./scripts/nix/run-dev.sh" ]; then
      echo "error: run this command from repository root so ./scripts/nix/run-dev.sh is available" >&2
      exit 1
    fi
    exec bash ./scripts/nix/run-dev.sh ${toString webPort} ${toString apiPort}
  '';
}
