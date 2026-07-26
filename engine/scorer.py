import os
import json
import requests
from typing import Optional

NIM_API_KEY = os.getenv("NVIDIA_NIM_API_KEY", "")
NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"

EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5"
SCORING_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct"


def generate_embedding(text: str) -> Optional[list[float]]:
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
            "input_type": "retrieval_document",
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
            "input_type": "retrieval_query",
            "encoding_format": "float",
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["data"][0]["embedding"]


SCORING_PROMPT = """You are a viral content analyst. Analyze this transcript and find the 3 most viral-worthy segments.

For each segment, provide:
- start_time: MM:SS format timestamp
- end_time: MM:SS format timestamp
- viral_score: 1-100 (how likely to go viral)
- label: one of "Hook", "Controversial", "Insight", or "Vulnerable"
- caption: a ready-to-post caption for LinkedIn/X (max 280 chars)
- reasoning: why this segment is viral-worthy (1-2 sentences)

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


def score_transcript(transcript: str, max_chars: int = 12000, retries: int = 2) -> list[dict]:
    if not NIM_API_KEY:
        raise ValueError("NVIDIA_NIM_API_KEY not set")

    truncated = transcript[:max_chars]
    prompt = SCORING_PROMPT.format(transcript=truncated)

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
                "max_tokens": 2048,
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
