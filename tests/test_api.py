import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from engine.api import app
    return TestClient(app)


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "stats" in data


def test_get_videos_empty(client):
    resp = client.get("/api/videos")
    assert resp.status_code == 200
    data = resp.json()
    assert data["videos"] == []
    assert data["total"] == 0


def test_get_videos_with_pagination(client):
    resp = client.get("/api/videos?limit=2&offset=0")
    assert resp.status_code == 200


def test_get_videos_with_filter(client):
    resp = client.get("/api/videos?channel=test&status=transcript")
    assert resp.status_code == 200


def test_get_segments(client):
    resp = client.get("/api/segments")
    assert resp.status_code == 200
    assert "segments" in resp.json()


def test_get_video_not_found(client):
    resp = client.get("/api/videos/nonexistent")
    assert resp.status_code == 200
    assert "error" in resp.json()


def test_delete_video_not_found(client):
    resp = client.delete("/api/videos/nonexistent")
    assert resp.status_code == 200
    assert "error" in resp.json()


def test_crawl_progress(client):
    resp = client.get("/api/crawl/progress")
    assert resp.status_code == 200
    data = resp.json()
    assert "active" in data
    assert "current" in data


def test_cancel_crawl_when_none_active(client):
    resp = client.post("/api/crawl/cancel")
    assert resp.status_code == 200
    assert resp.json()["status"] == "no_active_crawl"


def test_get_config(client):
    resp = client.get("/api/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "has_youtube_key" in data
    assert "has_nim_key" in data


def test_score_video_not_found(client):
    resp = client.post("/score/nonexistent")
    assert resp.status_code == 200
    assert "error" in resp.json()
