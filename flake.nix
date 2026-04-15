{
  description = "Edein";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, rust-overlay, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          targets = [ "wasm32-unknown-unknown" ];
        };
        rustPlatform = pkgs.makeRustPlatform {
          cargo = rustToolchain;
          rustc = rustToolchain;
        };

        webPort = 3000;
        apiPort = 8000;

        # Step 1: compile Rust → wasm .wasm file
        # src = web/wasm so Cargo.lock is at the root of src, as buildRustPackage expects
        wasmBin = rustPlatform.buildRustPackage {
          pname = "edein-wasm";
          version = "0.1.0";
          src = ./web/wasm;
          cargoLock.lockFile = ./web/wasm/Cargo.lock;
          nativeBuildInputs = [ rustToolchain ];
          buildPhase = ''
            runHook preBuild
            cargo build --release --target wasm32-unknown-unknown
            runHook postBuild
          '';
          installPhase = ''
            mkdir -p $out
            cp target/wasm32-unknown-unknown/release/*.wasm $out/
          '';
          doCheck = false;
        };

        # Step 2: run wasm-bindgen over the .wasm to produce JS + .wasm bindings
        wasmPkg = pkgs.stdenv.mkDerivation {
          name = "edein-wasm-pkg";
          src = wasmBin;
          nativeBuildInputs = [ pkgs.wasm-bindgen-cli ];
          buildPhase = ''
            wasm-bindgen *.wasm --out-dir pkg --target web
          '';
          installPhase = ''
            cp -r pkg $out
          '';
        };

      in {
        # nix build — wasm + frontend (vite build) + python env
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "edein";
          version = "0.1.0";
          src = ./.;
          nativeBuildInputs = with pkgs; [
            nodejs
            pnpm
            uv
          ];
          buildPhase = ''
            runHook preBuild

            # inject wasm bindings into web/pkg
            mkdir -p web/pkg
            cp -r ${wasmPkg}/* web/pkg/

            # build frontend
            export HOME=$(mktemp -d)
            cd web
            pnpm install --frozen-lockfile
            pnpm exec vite build
            cd ..

            # install python deps into server/.venv
            export UV_NO_CACHE=1
            cd server
            uv sync --frozen --no-dev
            cd ..

            runHook postBuild
          '';
          installPhase = ''
            mkdir -p $out
            cp -r web/dist $out/web
            cp -r server $out/server
          '';
          doCheck = false;
        };

        # nix run — dev mode: wasm-pack + vite dev + uvicorn
        apps.default = {
          type = "app";
          program = toString (pkgs.writeShellScript "edein-run" ''
            set -e
            export PATH="${rustToolchain}/bin:${pkgs.wasm-pack}/bin:${pkgs.nodejs}/bin:${pkgs.pnpm}/bin:${pkgs.uv}/bin:${pkgs.mongodb}/bin:$PATH"

            MONGO_DBPATH=".local/mongo"
            MONGO_LOG="$MONGO_DBPATH/mongod.log"
            MONGO_STARTED=0

            mkdir -p "$MONGO_DBPATH"

            echo "==> building wasm..."
            wasm-pack build web/wasm --target web --out-dir ../pkg

            echo "==> installing frontend deps..."
            cd web
            pnpm install --frozen-lockfile 2>/dev/null || pnpm install
            cd ..

            echo "==> installing python deps..."
            cd server
            uv sync --no-dev
            cd ..

            if mongod --dbpath "$MONGO_DBPATH" --bind_ip 127.0.0.1 --port 27017 --logpath "$MONGO_LOG" --fork; then
              MONGO_STARTED=1
              echo "==> started mongo on :27017"
            else
              echo "==> mongo already running or failed to start (see $MONGO_LOG)"
            fi

            echo "==> starting servers  web=:${toString webPort}  api=:${toString apiPort}"

            cd server
            uv run uvicorn main:app --host 0.0.0.0 --port ${toString apiPort} &
            API_PID=$!
            cd ..

            cleanup() {
              kill "$API_PID" 2>/dev/null || true
              if [ "$MONGO_STARTED" -eq 1 ]; then
                mongod --shutdown --dbpath "$MONGO_DBPATH" >/dev/null 2>&1 || true
              fi
              exit
            }

            trap cleanup INT TERM

            cd web
            pnpm exec vite --host 0.0.0.0 --port ${toString webPort}
          '');
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            rustToolchain
            wasm-pack
            nodejs
            pnpm
            uv
            mongodb
          ];
        };
      }
    );
}
