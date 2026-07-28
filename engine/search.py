import json
import math
from engine.db import get_videos_with_embeddings, get_segments_for_video
from engine.scorer import embed_query


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def search(query: str, top_n: int = 10, min_score: int = 0, max_score: int = 100, label: str = "", heatmap_only: bool = False) -> list[dict]:
    try:
        query_embedding = embed_query(query)
    except Exception:
        return []
    if not query_embedding:
        return []

    videos = get_videos_with_embeddings()
    results = []

    for video in videos:
        try:
            stored = json.loads(video["vector_embedding"])
        except (json.JSONDecodeError, TypeError):
            continue

        sim_score = cosine_similarity(query_embedding, stored)
        if sim_score > 0:
            segments = get_segments_for_video(video["video_id"])
            filtered = []
            for seg in segments:
                if seg["viral_score"] < min_score or seg["viral_score"] > max_score:
                    continue
                if label and seg["label"] != label:
                    continue
                if heatmap_only and seg.get("heatmap_score", 0) <= 0.4:
                    continue
                filtered.append(seg)
            if filtered:
                results.append({
                    "video_id": video["video_id"],
                    "title": video["title"],
                    "source_channel": video["source_channel"],
                    "match_score": round(sim_score * 100, 1),
                    "segments": filtered,
                })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:top_n]
