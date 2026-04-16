{ buildEnv, rust-bin, wasm-pack, wasm-bindgen-cli, nodejs, pnpm }:
let
  rustToolchain = rust-bin.stable.latest.default.override {
    targets = [ "wasm32-unknown-unknown" ];
  };
in
buildEnv {
  name = "edein-env-web";
  paths = [
    rustToolchain
    wasm-pack
    wasm-bindgen-cli
    nodejs
    pnpm
  ];
}
