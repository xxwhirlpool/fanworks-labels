{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.11";
    unstable.url = "github:nixos/nixpkgs/nixos-unstable";
 
   snowfall-lib = {
       	url = "github:snowfallorg/lib";
       	inputs.nixpkgs.follows = "nixpkgs";
       };
       
   snowfall-flake = {
		url = "github:snowfallorg/flake";
		inputs.nixpkgs.follows = "nixpkgs";
	};

  };

  outputs = inputs:
	inputs.snowfall-lib.mkFlake {
	    inherit inputs;

      src = ./.;
      
      snowfall.namespace = "fujocoded";
    
	};
}
