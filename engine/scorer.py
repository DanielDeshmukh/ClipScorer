import os
import json
import requests
from typing import Optional

NIM_API_KEY = os.getenv("NVIDIA_NIM_API_KEY", "")
NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"

EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5"
SCORING_MODEL = "meta/llama-3.1-8b-instruct"


def generate_embedding(text: str) -> Optional[list[float]]:
    if not NIM_API_KEY:
        raise ValueError("NVIDIA_NIM_API_KEY not set")

    text = text[:1000]

    resp = requests.post(
        f"{NIM_BASE_URL}/embeddings",
        headers={
            "Authorization": f"Bearer {NIM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "input": text,
            "model": EMBEDDING_MODEL,
            "input_type": "passage",
            "encoding_format": "float",
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["data"][0]["embedding"]


def embed_query(text: str) -> Optional[list[float]]:
    if not NIM_API_KEY:
        raise ValueError("NVIDIA_NIM_API_KEY not set")

    resp = requests.post(
        f"{NIM_BASE_URL}/embeddings",
        headers={
            "Authorization": f"Bearer {NIM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "input": text,
            "model": EMBEDDING_MODEL,
            "input_type": "query",
            "encoding_format": "float",
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["data"][0]["embedding"]


SCORING_PROMPT = """You are a viral content analyst. Analyze this transcript and find the 8 most viral-worthy segments for short-form clips (Reels/Shorts/TikTok).

CRITICAL RULES:
- Each segment MUST be at least 10 seconds long and at most 60 seconds
- Segments shorter than 10 seconds are NOT valid clips
- Spread segments across the ENTIRE video timeline. Do not cluster.
- Each clip should be a complete, self-contained moment that makes sense on its own
{heatmap_context}
- When an ENGAGEMENT ZONE is given, your clip timestamps MUST start at or before the zone start and end at or after the zone end. Cover the full zone.
- If no zone applies, pick natural conversation breaks that form a complete thought (15-45s is ideal for most content)

For each segment, provide:
- start_time: MM:SS format timestamp (start of clip)
- end_time: MM:SS format timestamp (end of clip, must be >= 10s after start)
- viral_score: 1-100 (how likely to go viral as a standalone clip)
- label: one of "Hook", "Controversial", "Insight", or "Vulnerable"
- caption: a ready-to-post caption for LinkedIn/X (max 280 chars)
- reasoning: why this clip is viral-worthy (1-2 sentences)

Transcript:
{transcript}

Return ONLY valid JSON array, no markdown:
[
  {{
    "start_time": "MM:SS",
    "end_time": "MM:SS",
    "viral_score": 85,
    "label": "Hook",
    "caption": "...",
    "reasoning": "..."
  }}
]"""


def _clean_json_response(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
    if "```" in content:
        start = content.find("[")
        end = content.rfind("]")
        if start != -1 and end != -1:
            content = content[start:end + 1]
    return content


def score_transcript(transcript: str, heatmap: list[dict] | None = None, max_chars: int = 12000, retries: int = 2) -> list[dict]:
    if not NIM_API_KEY:
        raise ValueError("NVIDIA_NIM_API_KEY not set")

    truncated = transcript[:max_chars]

    heatmap_context = ""
    if heatmap:
        from engine.heatmap import merge_heatmap_zones
        zones = merge_heatmap_zones(heatmap)[:5]
        if zones:
            lines = []
            for z in zones:
                start_min = int(z["start"] // 60)
                start_sec = int(z["start"] % 60)
                end_min = int(z["end"] // 60)
                end_sec = int(z["end"] % 60)
                dur = int(z["duration"])
                peak = z["peak_score"]
                lines.append(f"  - {start_min:02d}:{start_sec:02d} to {end_min:02d}:{end_sec:02d} ({dur}s zone, peak intensity: {peak:.0%})")
            heatmap_context = (
                "\nAUDIENCE ENGAGEMENT ZONES — these are broad regions where viewers rewatched heavily.\n"
                "CRITICAL: When a zone is 20+ seconds, your clip MUST span the ENTIRE zone from start to end.\n"
                "Do NOT chop a wide engagement zone into a tiny 9s clip. The whole zone is the viral moment.\n"
                "Zones (sorted by engagement):\n" + "\n".join(lines)
            )

    prompt = SCORING_PROMPT.format(transcript=truncated, heatmap_context=heatmap_context)

    last_error = None
    for attempt in range(retries + 1):
        resp = requests.post(
            f"{NIM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {NIM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": SCORING_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 4096,
            },
            timeout=120,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        cleaned = _clean_json_response(content)

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
            last_error = ValueError(f"Expected non-empty array, got {type(parsed).__name__}")
        except json.JSONDecodeError as e:
            last_error = e
            if attempt < retries:
                prompt += "\n\nIMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation."

    raise ValueError(f"Failed to parse scoring response after {retries + 1} attempts: {last_error}")
