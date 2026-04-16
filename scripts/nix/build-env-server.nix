{ }:
{
  unfreePackageNames = [ "mongodb" ];

  mkEnv = { buildEnv, uv, mongodb }:
    buildEnv {
      name = "edein-env-server";
      paths = [
        uv
        mongodb
      ];
    };
}
