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
        serverSpec = import ./scripts/nix/build-env-server.nix { };

        overlays = [
          (nixpkgs.lib.composeManyExtensions [
            rust-overlay.overlays.default
            (import ./scripts/nix/overlay.nix)
          ])
        ];

        pkgs = import nixpkgs {
          inherit system overlays;
          config.allowUnfreePredicate = pkg:
            builtins.elem (nixpkgs.lib.getName pkg) serverSpec.unfreePackageNames;
        };
      in {
        packages.default = pkgs.baseEnv;
        packages.run = pkgs.edeinRun;

        apps.default = {
          type = "app";
          program = "${pkgs.edeinRun}/bin/edein-run";
        };

        devShells.default = pkgs.mkShell {
          packages = [ pkgs.baseEnv ];
        };
      }
    );
}
