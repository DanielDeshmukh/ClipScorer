from engine.db import (
    upsert_video, get_video, get_all_videos, get_video_count,
    update_transcript, update_embedding, delete_video,
    insert_segment, get_segments_for_video, get_all_segments, get_stats,
)


def _make_video(video_id="test123", title="Test Video", channel="@TestChannel"):
    return {
        "video_id": video_id,
        "title": title,
        "duration_seconds": 300,
        "view_count": 1000,
        "transcript": None,
        "transcript_status": "pending",
        "source_channel": channel,
        "video_url": f"https://youtube.com/watch?v={video_id}",
    }


def test_upsert_and_get_video():
    video = _make_video()
    upsert_video(video)
    result = get_video("test123")
    assert result is not None
    assert result["title"] == "Test Video"
    assert result["source_channel"] == "@TestChannel"


def test_upsert_updates_on_conflict():
    upsert_video(_make_video(title="Original"))
    upsert_video(_make_video(title="Updated"))
    result = get_video("test123")
    assert result["title"] == "Updated"


def test_get_all_videos():
    upsert_video(_make_video("v1", "Video 1"))
    upsert_video(_make_video("v2", "Video 2"))
    videos = get_all_videos()
    assert len(videos) == 2


def test_get_all_videos_with_limit():
    for i in range(5):
        upsert_video(_make_video(f"v{i}", f"Video {i}"))
    videos = get_all_videos(limit=2)
    assert len(videos) == 2


def test_get_video_count():
    upsert_video(_make_video("v1"))
    upsert_video(_make_video("v2"))
    assert get_video_count() == 2


def test_get_video_count_with_channel_filter():
    upsert_video(_make_video("v1", channel="@ChannelA"))
    upsert_video(_make_video("v2", channel="@ChannelB"))
    upsert_video(_make_video("v3", channel="@ChannelA"))
    assert get_video_count(channel="ChannelA") == 2


def test_get_video_count_with_status_filter():
    upsert_video(_make_video("v1"))
    upsert_video(_make_video("v2"))
    update_transcript("v1", "Hello world", "ok")
    assert get_video_count(status="transcript") == 1
    assert get_video_count(status="no_transcript") == 1


def test_update_transcript():
    upsert_video(_make_video())
    update_transcript("test123", "Hello world transcript", "ok")
    video = get_video("test123")
    assert video["transcript"] == "Hello world transcript"
    assert video["transcript_status"] == "ok"


def test_update_embedding():
    upsert_video(_make_video())
    embedding = [0.1] * 1536
    update_embedding("test123", embedding)
    video = get_video("test123")
    assert video["vector_embedding"] is not None


def test_delete_video():
    upsert_video(_make_video())
    assert get_video("test123") is not None
    deleted = delete_video("test123")
    assert deleted is True
    assert get_video("test123") is None


def test_delete_video_cascades_segments():
    upsert_video(_make_video())
    insert_segment({
        "video_id": "test123",
        "start_time": "01:00",
        "end_time": "02:00",
        "viral_score": 80,
        "label": "Hook",
        "caption": "Test caption",
        "reasoning": "Test reasoning",
    })
    delete_video("test123")
    segments = get_segments_for_video("test123")
    assert len(segments) == 0


def test_insert_and_get_segments():
    upsert_video(_make_video())
    insert_segment({
        "video_id": "test123",
        "start_time": "01:00",
        "end_time": "02:00",
        "viral_score": 80,
        "label": "Hook",
        "caption": "Test caption",
        "reasoning": "Test reasoning",
    })
    segments = get_segments_for_video("test123")
    assert len(segments) == 1
    assert segments[0]["viral_score"] == 80


def test_get_all_segments():
    upsert_video(_make_video("v1"))
    upsert_video(_make_video("v2"))
    insert_segment({
        "video_id": "v1", "start_time": "01:00", "end_time": "02:00",
        "viral_score": 90, "label": "Hook", "caption": "Cap1", "reasoning": "R1",
    })
    insert_segment({
        "video_id": "v2", "start_time": "03:00", "end_time": "04:00",
        "viral_score": 70, "label": "Insight", "caption": "Cap2", "reasoning": "R2",
    })
    all_segs = get_all_segments()
    assert len(all_segs) == 2
    assert all_segs[0]["viral_score"] == 90


def test_get_stats():
    upsert_video(_make_video("v1"))
    update_transcript("v1", "transcript", "ok")
    insert_segment({
        "video_id": "v1", "start_time": "01:00", "end_time": "02:00",
        "viral_score": 85, "label": "Hook", "caption": "C", "reasoning": "R",
    })
    stats = get_stats()
    assert stats["total_videos"] == 1
    assert stats["with_transcript"] == 1
    assert stats["total_segments"] == 1
    assert stats["last_crawl"] is not None
