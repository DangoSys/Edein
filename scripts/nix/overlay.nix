final: prev:
let
  serverSpec = import ./build-env-server.nix { };
in {
  webEnv = final.callPackage ./build-env-web.nix {
    rust-bin = final.rust-bin;
  };
  serverEnv = final.callPackage serverSpec.mkEnv { };

  #===--- Environment including both web and server ---===#
  baseEnv = final.buildEnv {
    name = "edein-base-env";
    paths = [
      final.webEnv
      final.serverEnv
    ];
  };

  #===--- Application Run ---===#
  edeinRun = final.callPackage ./app-run.nix { };
}
