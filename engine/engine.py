import os
import time
import json
import subprocess
import requests
from typing import Optional
from engine.db import upsert_video, update_transcript, update_embedding, init_db
from engine.scout import fetch_transcript
from engine.scorer import generate_embedding

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


def resolve_channel_id(handle: str) -> Optional[str]:
    handle = handle.lstrip("@")

    if YOUTUBE_API_KEY:
        resp = requests.get(
            f"{YOUTUBE_API_BASE}/channels",
            params={
                "part": "id",
                "forHandle": f"@{handle}",
                "key": YOUTUBE_API_KEY,
            },
            timeout=15,
        )
        if resp.ok:
            items = resp.json().get("items", [])
            if items:
                return items[0]["id"]

    try:
        result = subprocess.run(
            ["yt-dlp", "--print", "channel_id", f"https://www.youtube.com/@{handle}", "--playlist-items", "0"],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split("\n")[0]
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    return None


def fetch_channel_videos(channel_id: str, max_results: int = 50) -> list[dict]:
    if YOUTUBE_API_KEY:
        return _fetch_via_api(channel_id, max_results)
    return _fetch_via_ytdlp(channel_id, max_results)


def _fetch_via_api(channel_id: str, max_results: int) -> list[dict]:
    resp = requests.get(
        f"{YOUTUBE_API_BASE}/search",
        params={
            "part": "snippet",
            "channelId": channel_id,
            "type": "video",
            "order": "viewCount",
            "maxResults": min(max_results, 50),
            "key": YOUTUBE_API_KEY,
        },
        timeout=15,
    )
    resp.raise_for_status()
    search_items = resp.json().get("items", [])

    video_ids = [item["id"]["videoId"] for item in search_items]
    if not video_ids:
        return []

    details_resp = requests.get(
        f"{YOUTUBE_API_BASE}/videos",
        params={
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(video_ids),
            "key": YOUTUBE_API_KEY,
        },
        timeout=15,
    )
    details_resp.raise_for_status()
    details = {v["id"]: v for v in details_resp.json().get("items", [])}

    videos = []
    for vid in video_ids:
        d = details.get(vid, {})
        snippet = d.get("snippet", {})
        stats = d.get("statistics", {})
        content = d.get("contentDetails", {})

        duration_secs = _parse_duration(content.get("duration", "PT0S"))
        videos.append({
            "video_id": vid,
            "title": snippet.get("title", "Untitled"),
            "duration_seconds": duration_secs,
            "view_count": int(stats.get("viewCount", 0)),
            "video_url": f"https://www.youtube.com/watch?v={vid}",
            "transcript": None,
            "transcript_status": "pending",
            "source_channel": snippet.get("channelTitle", ""),
        })

    return videos


def _fetch_via_ytdlp(channel_id: str, max_results: int) -> list[dict]:
    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "--flat-playlist",
                "--print", "%(id)s|||%(title)s|||%(duration)s|||%(view_count)s",
                "--playlist-end", str(max_results),
                f"https://www.youtube.com/channel/{channel_id}/videos",
            ],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            return []

        videos = []
        for line in result.stdout.strip().split("\n"):
            if not line or "|||" not in line:
                continue
            parts = line.split("|||")
            if len(parts) < 4:
                continue
            vid, title, duration, views = parts
            videos.append({
                "video_id": vid,
                "title": title,
                "duration_seconds": int(float(duration)) if duration and duration != "NA" else 0,
                "view_count": int(float(views)) if views and views != "NA" else 0,
                "video_url": f"https://www.youtube.com/watch?v={vid}",
                "transcript": None,
                "transcript_status": "pending",
                "source_channel": channel_id,
            })
        return videos
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []


def _parse_duration(iso: str) -> int:
    import re
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def crawl_channel(handle: str, max_videos: int = 30, delay: float = 3.0) -> dict:
    from engine import progress

    init_db()
    progress.start(handle)

    channel_id = resolve_channel_id(handle)
    if not channel_id:
        progress.finish(f"Could not resolve channel: {handle}")
        return {"error": f"Could not resolve channel: {handle}"}

    progress.update(0, 0, "fetching", f"Fetching videos for {handle}...")
    videos = fetch_channel_videos(channel_id, max_videos)
    results = {"total": len(videos), "fetched": 0, "transcripts": 0, "errors": []}

    progress.update(0, len(videos), "crawling", f"Found {len(videos)} videos. Starting transcript fetch...")

    for i, video in enumerate(videos):
        if progress.is_cancelled():
            progress.finish(f"Crawl cancelled after {i}/{len(videos)} videos")
            return results

        try:
            progress.update(i + 1, len(videos), "crawling", f"Fetching transcript {i + 1}/{len(videos)}: {video['title'][:50]}")
            upsert_video(video)
            results["fetched"] += 1

            transcript = fetch_transcript(video["video_id"])
            if transcript:
                update_transcript(video["video_id"], transcript, "ok")
                results["transcripts"] += 1
            else:
                update_transcript(video["video_id"], "", "no_transcript_found")

            if i < len(videos) - 1:
                time.sleep(delay)

        except Exception as e:
            results["errors"].append({"video_id": video["video_id"], "error": str(e)})
            progress.add_error(video["video_id"], str(e))

    progress.update(len(videos), len(videos), "embedding", "Generating embeddings...")
    embed_all_videos()

    msg = f"Crawl complete: {results['fetched']} videos, {results['transcripts']} transcripts"
    progress.finish(msg)
    return results


def score_video(video_id: str) -> dict:
    from engine.db import get_video, insert_segment

    video = get_video(video_id)
    if not video:
        return {"error": f"Video {video_id} not found"}

    transcript = video.get("transcript", "")
    if not transcript:
        return {"error": "No transcript available"}

    try:
        segments = score_video_segments(video_id, transcript)
        return {"video_id": video_id, "segments": segments}
    except Exception as e:
        return {"error": str(e)}


def score_all_pending() -> dict:
    from engine.db import get_all_videos, get_segments_for_video
    from engine import progress

    videos = get_all_videos()
    scorable = [v for v in videos if v.get("transcript") and not get_segments_for_video(v["video_id"])]

    progress.start("bulk_score")
    results = {"total": len(scorable), "scored": 0, "errors": []}

    for i, video in enumerate(scorable):
        try:
            progress.update(i + 1, len(scorable), "scoring", f"Scoring {i + 1}/{len(scorable)}: {video['title'][:50]}")
            score_video_segments(video["video_id"], video["transcript"])
            results["scored"] += 1
        except Exception as e:
            results["errors"].append({"video_id": video["video_id"], "error": str(e)})
            progress.add_error(video["video_id"], str(e))

    msg = f"Bulk score complete: {results['scored']}/{results['total']} videos scored"
    progress.finish(msg)
    return results


def score_video_segments(video_id: str, transcript: str) -> list[dict]:
    from engine.db import insert_segment
    from engine.scorer import score_transcript

    raw = score_transcript(transcript)
    saved = []

    for seg in raw:
        segment = {
            "video_id": video_id,
            "start_time": seg["start_time"],
            "end_time": seg["end_time"],
            "viral_score": seg["viral_score"],
            "label": seg["label"],
            "caption": seg["caption"],
            "reasoning": seg["reasoning"],
        }
        insert_segment(segment)
        saved.append(segment)

    return saved


def embed_all_videos() -> dict:
    from engine.db import get_all_videos
    videos = get_all_videos()
    embedded = 0
    errors = []

    for video in videos:
        if video.get("vector_embedding"):
            continue
        if not video.get("transcript"):
            continue

        try:
            text = _truncate_at_sentence(video["transcript"], 8000)
            embedding = generate_embedding(text)
            if embedding:
                update_embedding(video["video_id"], embedding)
                embedded += 1
        except Exception as e:
            errors.append({"video_id": video["video_id"], "error": str(e)})

    return {"embedded": embedded, "errors": errors}


def _truncate_at_sentence(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_period = truncated.rfind(".")
    last_newline = truncated.rfind("\n")
    cut = max(last_period, last_newline)
    if cut > max_chars * 0.8:
        return truncated[:cut + 1]
    return truncated
