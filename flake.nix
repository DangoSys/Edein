{
  description = "edein wasm demo";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { nixpkgs, flake-utils, rust-overlay, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ (import rust-overlay) ];
        };
        rust = pkgs.rust-bin.stable.latest.default.override {
          targets = [ "wasm32-unknown-unknown" ];
        };
      in {
        packages.default = pkgs.stdenvNoCC.mkDerivation {
          pname = "edein-web";
          version = "0.1.0";
          src = ./.;
          nativeBuildInputs = [ rust pkgs.wasm-pack ];
          buildPhase = ''
            wasm-pack build --target web --out-dir web/pkg
          '';
          installPhase = ''
            mkdir -p $out
            cp -r web $out/
          '';
        };

        apps.default = {
          type = "app";
          program = toString (pkgs.writeShellScript "edein-run" ''
            set -e
            cd ${./.}
            wasm-pack build --target web --out-dir web/pkg
            cd web
            ${pkgs.nodejs}/bin/npm install
            exec ${pkgs.nodejs}/bin/npm run dev -- --host 0.0.0.0 --port 8080
          '');
        };
      }
    );
}
