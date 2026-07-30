{ pkgs }: {
  deps = [
    pkgs.bash
    pkgs.coreutils
    pkgs.git
    pkgs.gnutar
    pkgs.gzip
    pkgs.curl
    pkgs.python311Full
    pkgs.nodejs-18_x
    pkgs.ffmpeg
    pkgs.nix
  ];
}
