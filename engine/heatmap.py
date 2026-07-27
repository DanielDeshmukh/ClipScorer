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


if __name__ == "__main__":
    heatmap = fetch_heatmap("KIwcSp99PoY")
    print(f"Found {len(heatmap)} heatmap segments")
    for h in heatmap[:10]:
        mins = int(h["start"] // 60)
        secs = int(h["start"] % 60)
        print(f"  {mins:02d}:{secs:02d} - score: {h['score']:.4f} ({h['duration']:.0f}s)")
