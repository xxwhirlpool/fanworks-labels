{
  lib,
  writeScriptBin,
  buildNpmPackage,
  nodejs_20,
  makeWrapper,
  importNpmLock,
  ...
}:  let
    package-json = lib.importJSON (lib.snowfall.fs.get-file "./feed-server/package.json");
    labels = lib.snowfall.fs.get-file "./labels.ts";
in
  buildNpmPackage {
    pname = "fanworks-feed-server";
	inherit (package-json) version;
	
    src = lib.snowfall.fs.get-file "./feed-server";

    npmDeps = importNpmLock {
    	npmRoot = lib.snowfall.fs.get-file "./feed-server";
    };

    npmConfigHook = importNpmLock.npmConfigHook;

    nodejs = nodejs_20;

    dontNpmBuild = true;

    nativeBuildInputs = [makeWrapper];

	postUnpack = ''
		cp --no-preserve=mode --remove-destination ${labels} $sourceRoot/labels.ts
	'';

    postInstall = ''
      makeWrapper ${nodejs_20}/bin/node $out/bin/fanworks-feed-server --add-flags $out/lib/node_modules/feed-server/node_modules/.bin/tsx --add-flags $out/lib/node_modules/feed-server/src/index.ts
    '';
  }
