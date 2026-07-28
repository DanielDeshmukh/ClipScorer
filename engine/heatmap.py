import re
import json
import requests


def fetch_heatmap(video_id: str) -> list[dict]:
    """Extract YouTube 'Most Replayed' heatmap data from watch page."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    resp = requests.get(url, headers=headers, timeout=20)
    html = resp.text

    # Find the MARKER_TYPE_HEATMAP section
    match = re.search(
        r'"MARKER_TYPE_HEATMAP","markers":\s*(\[.*?\])',
        html,
        re.DOTALL,
    )

    if not match:
        return []

    try:
        markers_raw = match.group(1)
        # YouTube uses string values for startMillis/durationMillis
        markers = json.loads(markers_raw.replace('\\"', '"'))
    except Exception:
        return []

    results = []
    for m in markers:
        try:
            score = float(m.get("intensityScoreNormalized", 0))
            start = float(m.get("startMillis", 0)) / 1000
            duration = float(m.get("durationMillis", 0)) / 1000
            if score > 0:
                results.append({
                    "start": start,
                    "end": start + duration,
                    "duration": duration,
                    "score": score,
                })
        except Exception:
            continue

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def merge_heatmap_zones(markers: list[dict], gap_threshold: float = 5.0, min_score: float = 0.15) -> list[dict]:
    """Merge adjacent/overlapping heatmap markers into continuous engagement zones.

    Args:
        markers: raw heatmap markers with start/end/score
        gap_threshold: max gap (seconds) between markers to merge them
        min_score: minimum score to include a marker

    Returns:
        list of zones with start, end, duration, peak_score, avg_score, marker_count
    """
    if not markers:
        return []

    filtered = [m for m in markers if m.get("score", 0) >= min_score]
    if not filtered:
        return []

    sorted_markers = sorted(filtered, key=lambda x: x["start"])

    zones = []
    current_zone = {
        "start": sorted_markers[0]["start"],
        "end": sorted_markers[0]["end"],
        "scores": [sorted_markers[0]["score"]],
    }

    for m in sorted_markers[1:]:
        if m["start"] <= current_zone["end"] + gap_threshold:
            current_zone["end"] = max(current_zone["end"], m["end"])
            current_zone["scores"].append(m["score"])
        else:
            zones.append(current_zone)
            current_zone = {
                "start": m["start"],
                "end": m["end"],
                "scores": [m["score"]],
            }

    zones.append(current_zone)

    result = []
    for z in zones:
        result.append({
            "start": z["start"],
            "end": z["end"],
            "duration": z["end"] - z["start"],
            "peak_score": max(z["scores"]),
            "avg_score": sum(z["scores"]) / len(z["scores"]),
            "marker_count": len(z["scores"]),
        })

    result.sort(key=lambda x: x["peak_score"], reverse=True)
    return result


if __name__ == "__main__":
    heatmap = fetch_heatmap("KIwcSp99PoY")
    print(f"Found {len(heatmap)} heatmap segments")
    for h in heatmap[:10]:
        mins = int(h["start"] // 60)
        secs = int(h["start"] % 60)
        print(f"  {mins:02d}:{secs:02d} - score: {h['score']:.4f} ({h['duration']:.0f}s)")
