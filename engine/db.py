import sqlite3
import json
import threading
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "clipscore.db"
_local = threading.local()


def get_connection() -> sqlite3.Connection:
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, timeout=30)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA foreign_keys=ON")
    return _local.conn


def close_connection():
    if hasattr(_local, "conn") and _local.conn is not None:
        _local.conn.close()
        _local.conn = None


def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS podcast_catalog (
            video_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            duration_seconds INTEGER,
            view_count INTEGER,
            transcript TEXT,
            transcript_status TEXT NOT NULL DEFAULT 'ok',
            deleted_on_youtube INTEGER NOT NULL DEFAULT 0,
            vector_embedding TEXT,
            source_channel TEXT NOT NULL DEFAULT '@20VC',
            video_url TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS viral_segments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id TEXT NOT NULL REFERENCES podcast_catalog(video_id) ON DELETE CASCADE,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            viral_score INTEGER NOT NULL CHECK (viral_score BETWEEN 1 AND 100),
            label TEXT NOT NULL,
            caption TEXT NOT NULL,
            reasoning TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(video_id, start_time)
        );
    """)
    conn.commit()


def upsert_video(video: dict):
    conn = get_connection()
    conn.execute("""
        INSERT INTO podcast_catalog (video_id, title, duration_seconds, view_count, transcript, transcript_status, source_channel, video_url, updated_at)
        VALUES (:video_id, :title, :duration_seconds, :view_count, :transcript, :transcript_status, :source_channel, :video_url, datetime('now'))
        ON CONFLICT(video_id) DO UPDATE SET
            title=excluded.title,
            duration_seconds=excluded.duration_seconds,
            view_count=excluded.view_count,
            transcript=COALESCE(excluded.transcript, podcast_catalog.transcript),
            transcript_status=excluded.transcript_status,
            source_channel=excluded.source_channel,
            video_url=excluded.video_url,
            updated_at=datetime('now')
    """, video)
    conn.commit()


def update_embedding(video_id: str, embedding: list[float]):
    conn = get_connection()
    conn.execute(
        "UPDATE podcast_catalog SET vector_embedding=?, updated_at=datetime('now') WHERE video_id=?",
        (json.dumps(embedding), video_id)
    )
    conn.commit()


def update_transcript(video_id: str, transcript: str, status: str = "ok"):
    conn = get_connection()
    conn.execute(
        "UPDATE podcast_catalog SET transcript=?, transcript_status=?, updated_at=datetime('now') WHERE video_id=?",
        (transcript, status, video_id)
    )
    conn.commit()


def get_video(video_id: str) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM podcast_catalog WHERE video_id=?", (video_id,)).fetchone()
    return dict(row) if row else None


def get_all_videos(limit: int = 50, offset: int = 0, channel: str = "", status: str = "") -> list[dict]:
    conn = get_connection()
    query = "SELECT * FROM podcast_catalog WHERE 1=1"
    params = []

    if channel:
        query += " AND source_channel LIKE ?"
        params.append(f"%{channel}%")

    if status:
        if status == "transcript":
            query += " AND transcript IS NOT NULL AND transcript != ''"
        elif status == "no_transcript":
            query += " AND (transcript IS NULL OR transcript = '')"
        elif status == "scored":
            query += " AND vector_embedding IS NOT NULL"

    query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def get_video_count(channel: str = "", status: str = "") -> int:
    conn = get_connection()
    query = "SELECT COUNT(*) FROM podcast_catalog WHERE 1=1"
    params = []

    if channel:
        query += " AND source_channel LIKE ?"
        params.append(f"%{channel}%")

    if status:
        if status == "transcript":
            query += " AND transcript IS NOT NULL AND transcript != ''"
        elif status == "no_transcript":
            query += " AND (transcript IS NULL OR transcript = '')"
        elif status == "scored":
            query += " AND vector_embedding IS NOT NULL"

    return conn.execute(query, params).fetchone()[0]


def get_videos_with_embeddings() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT video_id, title, vector_embedding, source_channel FROM podcast_catalog WHERE vector_embedding IS NOT NULL AND deleted_on_youtube=0"
    ).fetchall()
    return [dict(r) for r in rows]


def insert_segment(segment: dict):
    conn = get_connection()
    conn.execute("""
        INSERT OR REPLACE INTO viral_segments (video_id, start_time, end_time, viral_score, label, caption, reasoning)
        VALUES (:video_id, :start_time, :end_time, :viral_score, :label, :caption, :reasoning)
    """, segment)
    conn.commit()


def get_segments_for_video(video_id: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM viral_segments WHERE video_id=? ORDER BY viral_score DESC", (video_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def get_all_segments() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("""
        SELECT vs.*, pc.title, pc.video_url
        FROM viral_segments vs
        JOIN podcast_catalog pc ON vs.video_id = pc.video_id
        ORDER BY vs.viral_score DESC
    """).fetchall()
    return [dict(r) for r in rows]


def get_stats() -> dict:
    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) FROM podcast_catalog").fetchone()[0]
    with_transcript = conn.execute(
        "SELECT COUNT(*) FROM podcast_catalog WHERE transcript IS NOT NULL AND transcript != ''"
    ).fetchone()[0]
    segments = conn.execute("SELECT COUNT(*) FROM viral_segments").fetchone()[0]
    last_crawl = conn.execute(
        "SELECT MAX(updated_at) FROM podcast_catalog"
    ).fetchone()[0]
    return {
        "total_videos": total,
        "with_transcript": with_transcript,
        "total_segments": segments,
        "last_crawl": last_crawl,
    }


def delete_video(video_id: str) -> bool:
    conn = get_connection()
    conn.execute("DELETE FROM viral_segments WHERE video_id=?", (video_id,))
    cursor = conn.execute("DELETE FROM podcast_catalog WHERE video_id=?", (video_id,))
    conn.commit()
    return cursor.rowcount > 0
