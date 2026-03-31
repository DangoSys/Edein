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
        devPort = 3000;
      in {
        packages.default = rustPlatform.buildRustPackage {
          pname = "edein-web";
          version = "0.1.0";
          src = ./.;
          cargoLock.lockFile = ./Cargo.lock;
          cargoBuildFlags = [ "--package" "edein-wasm" ];
          nativeBuildInputs = with pkgs; [ rustToolchain wasm-bindgen-cli ];
          dontCargoBuild = true;
          buildPhase = ''
            runHook preBuild
            export CARGO_NET_OFFLINE=true
            cargo build --release --target wasm32-unknown-unknown --package edein-wasm
            shopt -s nullglob
            wasm=(target/wasm32-unknown-unknown/release/*.wasm)
            if [[ ''${#wasm[@]} -eq 0 ]]; then
              echo "no wasm artifact under target/wasm32-unknown-unknown/release" >&2
              exit 1
            fi
            ${pkgs.wasm-bindgen-cli}/bin/wasm-bindgen "''${wasm[0]}" --out-dir web/pkg --target web
            runHook postBuild
          '';
          installPhase = ''
            mkdir -p $out
            cp -r web $out/
          '';
          doCheck = false;
        };

        apps.default = {
          type = "app";
          program = toString (pkgs.writeShellScript "edein-run" ''
            set -e
            export PATH="${rustToolchain}/bin:${pkgs.wasm-pack}/bin:${pkgs.nodejs}/bin:${pkgs.pnpm}/bin:$PATH"
            wasm-pack build --target web --out-dir web/pkg
            cd web
            pnpm install --frozen-lockfile 2>/dev/null || pnpm install
            exec pnpm exec vite --host 0.0.0.0 --port ${toString devPort}
          '');
        };
      }
    );
}
