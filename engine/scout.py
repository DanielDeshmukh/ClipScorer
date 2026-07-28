import subprocess
import json
import tempfile
import os
from pathlib import Path
from typing import Optional


def fetch_with_ytdlp(video_id: str, cookies_path: Optional[str] = None) -> Optional[str]:
    url = f"https://www.youtube.com/watch?v={video_id}"

    cmd = [
        "yt-dlp",
        "--write-auto-sub",
        "--sub-lang", "en",
        "--skip-download",
        "--sub-format", "json3",
        "-o", "%(id)s",
        url,
    ]

    if cookies_path and os.path.exists(cookies_path):
        cmd.insert(1, "--cookies")
        cmd.insert(2, cookies_path)

    with tempfile.TemporaryDirectory() as tmpdir:
        cmd[cmd.index("-o")] = "-o"
        cmd[cmd.index("%(id)s")] = os.path.join(tmpdir, "%(id)s")

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                return None

            sub_file = os.path.join(tmpdir, f"{video_id}.en.json3")
            if not os.path.exists(sub_file):
                sub_file = os.path.join(tmpdir, f"{video_id}.en.vtt")
                if not os.path.exists(sub_file):
                    return None

            with open(sub_file, "r", encoding="utf-8") as f:
                content = f.read()

            if sub_file.endswith(".json3"):
                return _parse_json3(content)
            else:
                return _parse_vtt(content)

        except (subprocess.TimeoutExpired, FileNotFoundError):
            return None


def _parse_json3(content: str) -> str:
    try:
        data = json.loads(content)
        segments = data.get("events", [])
        lines = []
        for seg in segments:
            segs = seg.get("segs", [])
            text = "".join(s.get("utf8", "") for s in segs).strip()
            if text and text != "\n":
                ts = seg.get("tStartMs", 0) // 1000
                mins, secs = divmod(ts, 60)
                lines.append(f"[{mins:02d}:{secs:02d}] {text}")
        return "\n".join(lines)
    except json.JSONDecodeError:
        return content


def _parse_vtt(content: str) -> str:
    lines = []
    for line in content.split("\n"):
        line = line.strip()
        if not line or line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:") or "-->" in line:
            continue
        if line.isdigit():
            continue
        lines.append(line)
    return " ".join(lines)


def fetch_transcript(video_id: str, cookies_path: Optional[str] = None) -> Optional[str]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id, languages=["en"])
        lines = []
        for entry in transcript.snippets:
            ts = int(entry.start)
            mins, secs = divmod(ts, 60)
            text = entry.text.strip()
            if text:
                lines.append(f"[{mins:02d}:{secs:02d}] {text}")
        return "\n".join(lines)
    except Exception:
        pass

    result = fetch_with_ytdlp(video_id, cookies_path)
    if result:
        return result

    return _fetch_with_assemblyai(video_id)


def _fetch_with_assemblyai(video_id: str) -> Optional[str]:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")

    api_key = os.getenv("ASSEMBLYAI_API_KEY", "")
    if not api_key:
        return None

    tmp_audio = None
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = os.path.join(tmpdir, f"{video_id}.mp3")
            cmd = [
                "yt-dlp",
                "--force-ipv4",
                "--no-check-certificates",
                "--quiet", "--no-warnings",
                "-f", "bestaudio/best",
                "--extract-audio",
                "--audio-format", "mp3",
                "--audio-quality", "5",
                "-o", audio_path,
                f"https://www.youtube.com/watch?v={video_id}",
            ]

            cookies_path = Path(__file__).parent / "cookies.txt"
            if cookies_path.exists():
                cmd.insert(1, "--cookies")
                cmd.insert(2, str(cookies_path))

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            if result.returncode != 0 or not os.path.exists(audio_path):
                return None

            import assemblyai as aai
            aai.settings.api_key = api_key

            config = aai.TranscriptionConfig(
                language_code="en",
                punctuate=True,
                format_text=True,
            )

            transcriber = aai.Transcriber()
            transcript = transcriber.transcribe(audio_path, config)

            if transcript.status == aai.TranscriptStatus.error:
                return None

            lines = []
            for utt in (transcript.utterances or []):
                ts = int(utt.start / 1000)
                mins, secs = divmod(ts, 60)
                text = utt.text.strip()
                if text:
                    lines.append(f"[{mins:02d}:{secs:02d}] {text}")
            return "\n".join(lines) if lines else None

    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        return None
