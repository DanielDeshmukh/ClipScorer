import os
import subprocess
import tempfile
from pathlib import Path

_disk_path = os.environ.get("RENDER_DISK_PATH", "")
EXPORT_DIR = Path(_disk_path) / "exports" if _disk_path else Path(__file__).parent.parent / "exports"


def _parse_time(time_str: str) -> int:
    parts = time_str.split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    elif len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    return 0


def _check_ffmpeg() -> str | None:
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        if result.returncode == 0:
            return "ffmpeg"
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    local_app = os.environ.get("LOCALAPPDATA", "")
    candidates = [
        os.path.join(local_app, "Microsoft", "WinGet", "Packages",
                     "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
                     "ffmpeg-8.1.2-full_build", "bin", "ffmpeg.exe"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path

    return None


def export_clip(video_url: str, start_time: str, end_time: str, video_id: str, notes: str | None = None) -> dict:
    ffmpeg_path = _check_ffmpeg()
    if not ffmpeg_path:
        return {"error": "ffmpeg not installed. Install it from https://ffmpeg.org/download.html"}

    EXPORT_DIR.mkdir(exist_ok=True)

    start_sec = _parse_time(start_time)
    end_sec = _parse_time(end_time)
    duration = end_sec - start_sec

    if duration <= 0 or duration > 120:
        return {"error": f"Invalid duration: {duration}s. Must be 1-120 seconds."}

    output_file = EXPORT_DIR / f"{video_id}_{start_sec}_{end_sec}.mp4"

    if output_file.exists():
        return {"file": str(output_file), "filename": output_file.name}

    tmp_file = None
    try:
        tmp_file = tempfile.mktemp(suffix=".mp4")

        cmd_download = [
            "yt-dlp",
            "--force-ipv4",
            "--quiet", "--no-warnings",
            "--ffmpeg-location", os.path.dirname(ffmpeg_path),
            "--download-sections", f"*{start_sec}-{end_sec}",
            "-f", "best",
            "-o", tmp_file,
            video_url,
        ]
        result = subprocess.run(cmd_download, capture_output=True, text=True, timeout=300)
        if result.returncode != 0 or not os.path.exists(tmp_file):
            return {"error": f"Download failed: {result.stderr[:200]}"}

        cmd_crop = [
            ffmpeg_path, "-y", "-hide_banner", "-loglevel", "error",
            "-i", tmp_file,
            "-vf", "scale=-2:1280,crop=720:1280:(iw-720)/2:(ih-1280)/2",
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
            "-c:a", "aac", "-b:a", "128k",
            str(output_file),
        ]
        result = subprocess.run(cmd_crop, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            return {"error": f"Crop failed: {result.stderr[:200]}"}

        if notes:
            notes_file = output_file.with_suffix(".txt")
            notes_file.write_text(notes, encoding="utf-8")

        return {"file": str(output_file), "filename": output_file.name}

    except subprocess.TimeoutExpired:
        return {"error": "Export timed out"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if tmp_file and os.path.exists(tmp_file):
            try:
                os.remove(tmp_file)
            except Exception:
                pass


def compile_clips(video_url: str, video_id: str, clips: list[dict]) -> dict:
    ffmpeg_path = _check_ffmpeg()
    if not ffmpeg_path:
        return {"error": "ffmpeg not installed"}

    if len(clips) < 2:
        return {"error": "Need at least 2 clips to compile"}

    EXPORT_DIR.mkdir(exist_ok=True)
    output_name = f"{video_id}_compilation_{len(clips)}clips.mp4"
    output_file = EXPORT_DIR / output_name

    if output_file.exists():
        return {"file": str(output_file), "filename": output_name}

    tmp_segments = []
    concat_list = None

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            for i, clip in enumerate(clips):
                start_sec = _parse_time(clip["start_time"])
                end_sec = _parse_time(clip["end_time"])
                seg_file = os.path.join(tmpdir, f"seg_{i:03d}.mp4")

                cmd_download = [
                    "yt-dlp", "--force-ipv4", "--quiet", "--no-warnings",
                    "--ffmpeg-location", os.path.dirname(ffmpeg_path),
                    "--download-sections", f"*{start_sec}-{end_sec}",
                    "-f", "best", "-o", seg_file, video_url,
                ]
                result = subprocess.run(cmd_download, capture_output=True, text=True, timeout=300)
                if result.returncode != 0 or not os.path.exists(seg_file):
                    return {"error": f"Download failed for clip {i + 1}: {result.stderr[:200]}"}

                cropped = os.path.join(tmpdir, f"crop_{i:03d}.mp4")
                cmd_crop = [
                    ffmpeg_path, "-y", "-hide_banner", "-loglevel", "error",
                    "-i", seg_file,
                    "-vf", "scale=-2:1280,crop=720:1280:(iw-720)/2:(ih-1280)/2",
                    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
                    "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
                    cropped,
                ]
                result = subprocess.run(cmd_crop, capture_output=True, text=True, timeout=120)
                if result.returncode != 0:
                    return {"error": f"Crop failed for clip {i + 1}: {result.stderr[:200]}"}
                tmp_segments.append(cropped)

            concat_list = os.path.join(tmpdir, "concat.txt")
            with open(concat_list, "w") as f:
                for seg in tmp_segments:
                    f.write(f"file '{seg}'\n")

            cmd_concat = [
                ffmpeg_path, "-y", "-hide_banner", "-loglevel", "error",
                "-f", "concat", "-safe", "0", "-i", concat_list,
                "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
                "-c:a", "aac", "-b:a", "128k",
                str(output_file),
            ]
            result = subprocess.run(cmd_concat, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                return {"error": f"Concat failed: {result.stderr[:200]}"}

        return {"file": str(output_file), "filename": output_name}

    except subprocess.TimeoutExpired:
        return {"error": "Compilation timed out"}
    except Exception as e:
        return {"error": str(e)}
