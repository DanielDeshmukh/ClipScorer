{ pkgs }: {
  deps = [
    pkgs.python311Full
    pkgs.nodejs-18_x
    pkgs.ffmpeg
    pkgs.coreutils
    pkgs.gnugrep
    pkgs.findutils
  ];
}
