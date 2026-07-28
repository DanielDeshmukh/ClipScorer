import os
import re
import subprocess
import tempfile
from pathlib import Path


EXPORT_DIR = Path(__file__).parent.parent / "exports"


def _parse_time(time_str: str) -> int:
    parts = time_str.split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    elif len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    return 0


def _check_ffmpeg() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def export_clip(video_url: str, start_time: str, end_time: str, video_id: str) -> dict:
    if not _check_ffmpeg():
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
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            tmp_file = f.name

        cmd_download = [
            "yt-dlp",
            "--force-ipv4",
            "--quiet", "--no-warnings",
            "--downloader", "ffmpeg",
            "--downloader-args", f"ffmpeg_i:-ss {start_sec} -to {end_sec}",
            "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "-o", tmp_file,
            video_url,
        ]
        result = subprocess.run(cmd_download, capture_output=True, text=True, timeout=120)
        if result.returncode != 0 or not os.path.exists(tmp_file):
            return {"error": f"Download failed: {result.stderr[:200]}"}

        cmd_crop = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", tmp_file,
            "-vf", "scale=-2:1280,crop=720:1280:(iw-720)/2:(ih-1280)/2",
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26",
            "-c:a", "aac", "-b:a", "128k",
            str(output_file),
        ]
        result = subprocess.run(cmd_crop, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            return {"error": f"Crop failed: {result.stderr[:200]}"}

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
