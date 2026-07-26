import threading
import time
from typing import Optional

_lock = threading.Lock()
_progress: dict = {
    "active": False,
    "channel": "",
    "current": 0,
    "total": 0,
    "phase": "",
    "message": "",
    "errors": [],
    "started_at": None,
    "finished_at": None,
}


def start(channel: str, total: int = 0):
    with _lock:
        _progress.update({
            "active": True,
            "channel": channel,
            "current": 0,
            "total": total,
            "phase": "starting",
            "message": f"Starting crawl for {channel}...",
            "errors": [],
            "started_at": time.time(),
            "finished_at": None,
        })


def update(current: int, total: int, phase: str, message: str):
    with _lock:
        _progress["current"] = current
        _progress["total"] = total
        _progress["phase"] = phase
        _progress["message"] = message


def add_error(video_id: str, error: str):
    with _lock:
        _progress["errors"].append({"video_id": video_id, "error": error})


def finish(message: str = "Crawl complete"):
    with _lock:
        _progress["active"] = False
        _progress["phase"] = "done"
        _progress["message"] = message
        _progress["finished_at"] = time.time()


def get_progress() -> dict:
    with _lock:
        return dict(_progress)
