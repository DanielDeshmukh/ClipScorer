import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

from engine.config import print_startup_warnings  # noqa: E402
from engine.rate_limit import RateLimitMiddleware  # noqa: E402

warnings = print_startup_warnings()

app = FastAPI(title="ClipScorer API", version="1.0.0")


@app.on_event("startup")
def startup():
    from engine.db import init_db
    init_db()

app.add_middleware(RateLimitMiddleware)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CrawlRequest(BaseModel):
    channel: str
    max_videos: int = 30
    delay: float = 3.0
    force: bool = False


class CrawlResponse(BaseModel):
    status: str
    message: str


@app.get("/health")
def health():
    from engine.db import get_stats
    stats = get_stats()
    return {"status": "ok", "stats": stats}


@app.get("/api/stats")
def get_dashboard_stats():
    import sqlite3
    from engine.db import DB_PATH
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    segments = conn.execute("SELECT * FROM viral_segments").fetchall()
    if not segments:
        return {"total_segments": 0, "avg_score": 0, "labels": {}, "top_segments": [], "score_distribution": {}}

    total = len(segments)
    scores = [s["viral_score"] for s in segments]
    avg_score = sum(scores) / total

    labels = {}
    for s in segments:
        labels[s["label"]] = labels.get(s["label"], 0) + 1

    distribution = {"90-100": 0, "80-89": 0, "70-79": 0, "60-69": 0, "below-60": 0}
    for s in scores:
        if s >= 90:
            distribution["90-100"] += 1
        elif s >= 80:
            distribution["80-89"] += 1
        elif s >= 70:
            distribution["70-79"] += 1
        elif s >= 60:
            distribution["60-69"] += 1
        else:
            distribution["below-60"] += 1

    top = conn.execute("""
        SELECT s.*, p.title FROM viral_segments s
        JOIN podcast_catalog p ON s.video_id = p.video_id
        ORDER BY s.viral_score DESC LIMIT 5
    """).fetchall()

    return {
        "total_segments": total,
        "avg_score": round(avg_score, 1),
        "labels": labels,
        "score_distribution": distribution,
        "top_segments": [dict(s) for s in top],
    }


@app.get("/api/crawl/progress")
def crawl_progress():
    from engine.progress import get_progress
    return get_progress()


@app.post("/api/crawl/cancel")
def cancel_crawl():
    from engine.progress import cancel, get_progress
    p = get_progress()
    if not p["active"]:
        return {"status": "no_active_crawl", "message": "No crawl is running"}
    cancel()
    return {"status": "cancelled", "message": "Crawl cancellation requested"}


@app.get("/api/config")
def get_config():
    from engine.config import validate_env
    return {
        "has_youtube_key": bool(os.getenv("YOUTUBE_API_KEY")),
        "has_nim_key": bool(os.getenv("NVIDIA_NIM_API_KEY")),
        "warnings": validate_env(),
    }


@app.get("/api/videos")
def list_videos(limit: int = Query(50), offset: int = Query(0), channel: str = Query(""), status: str = Query("")):
    from engine.db import get_all_videos, get_video_count
    videos = get_all_videos(limit, offset, channel, status)
    total = get_video_count(channel, status)
    return {"videos": videos, "total": total, "limit": limit, "offset": offset}


@app.get("/api/videos/{video_id}")
def get_video(video_id: str):
    from engine.db import get_video as db_get_video
    video = db_get_video(video_id)
    if not video:
        return {"error": "Video not found"}
    return video


@app.get("/api/videos/{video_id}/segments")
def get_video_segments(video_id: str):
    from engine.db import get_segments_for_video
    return {"segments": get_segments_for_video(video_id)}


@app.delete("/api/videos/{video_id}")
def delete_video(video_id: str):
    from engine.db import delete_video as db_delete_video
    deleted = db_delete_video(video_id)
    if not deleted:
        return {"error": "Video not found"}
    return {"status": "deleted", "video_id": video_id}


@app.get("/api/segments")
def list_segments():
    from engine.db import get_all_segments
    return {"segments": get_all_segments()}


@app.get("/api/search")
def search(q: str = Query(...), top_n: int = Query(10)):
    from engine.search import search as do_search
    results = do_search(q, top_n)
    return {"query": q, "results": results}


@app.post("/crawl/channel")
def crawl_channel(req: CrawlRequest, background_tasks: BackgroundTasks):
    from engine.engine import crawl_channel as do_crawl

    def _run_crawl():
        do_crawl(req.channel, req.max_videos, req.delay, req.force)

    background_tasks.add_task(_run_crawl)
    return {"status": "started", "message": f"Crawling {req.channel} in background"}


@app.post("/score/all")
def score_all(background_tasks: BackgroundTasks):
    from engine.engine import score_all_pending

    def _run_score():
        score_all_pending()

    background_tasks.add_task(_run_score)
    return {"status": "started", "message": "Scoring all pending videos in background"}


@app.post("/score/{video_id}")
def score_video(video_id: str):
    from engine.engine import score_video
    result = score_video(video_id)
    return result


@app.post("/embed/all")
def embed_all():
    from engine.engine import embed_all_videos
    result = embed_all_videos()
    return result


class ExportRequest(BaseModel):
    video_url: str
    start_time: str
    end_time: str


class BulkExportRequest(BaseModel):
    items: list[ExportRequest]


@app.get("/exports/{filename}")
def serve_export(filename: str):
    from engine.exporter import EXPORT_DIR
    file_path = EXPORT_DIR / filename
    if not file_path.exists():
        return {"error": "File not found"}
    return FileResponse(str(file_path), media_type="video/mp4", filename=filename)


@app.post("/api/export")
def export_clip(req: ExportRequest):
    from engine.exporter import export_clip as do_export
    video_id = req.video_url.split("v=")[-1].split("&")[0] if "v=" in req.video_url else "unknown"
    result = do_export(req.video_url, req.start_time, req.end_time, video_id)
    return result


@app.post("/api/export/bulk")
def export_bulk(req: BulkExportRequest):
    from engine.exporter import export_clip as do_export
    results = []
    for item in req.items:
        video_id = item.video_url.split("v=")[-1].split("&")[0] if "v=" in item.video_url else "unknown"
        result = do_export(item.video_url, item.start_time, item.end_time, video_id)
        results.append(result)
    return {"results": results, "total": len(results), "exported": sum(1 for r in results if "file" in r)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("engine.api:app", host="0.0.0.0", port=8000, reload=True)
