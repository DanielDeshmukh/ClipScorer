{ pkgs }: {
  deps = [
    pkgs.python311
    pkgs.nodejs-18_x
    pkgs.ffmpeg
    pkgs.stdenv
  ];
}
