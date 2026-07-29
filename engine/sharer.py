import urllib.parse
from pathlib import Path
from typing import Optional

PLATFORMS = {
    "youtube": {
        "name": "YouTube Shorts",
        "max_duration": 60,
        "aspect_ratio": "9:16",
        "color": "#FF0000",
    },
    "tiktok": {
        "name": "TikTok",
        "max_duration": 60,
        "aspect_ratio": "9:16",
        "color": "#000000",
    },
    "instagram": {
        "name": "Instagram Reels",
        "max_duration": 90,
        "aspect_ratio": "9:16",
        "color": "#E4405F",
    },
    "x": {
        "name": "X (Twitter)",
        "max_duration": 140,
        "aspect_ratio": "any",
        "color": "#1DA1F2",
    },
}

HASHTAG_SUGGESTIONS = {
    "Hook": ["#viral", "#mustwatch", "#attention"],
    "Controversial": ["#hot take", "#debate", "#unpopular"],
    "Insight": ["#knowledge", "#mindblown", "#learn"],
    "Vulnerable": ["#reallife", "#authentic", "#storytime"],
}


def generate_share_links(
    caption: str,
    video_url: str,
    label: str = "",
    title: str = "",
    hashtags: list[str] | None = None,
) -> dict:
    if not hashtags:
        hashtags = HASHTAG_SUGGESTIONS.get(label, ["#viral"])
    hashtag_str = " ".join(hashtags[:3])

    full_caption = f"{caption}\n\n{hashtag_str}" if caption else hashtag_str

    x_text = f"{caption}\n\n{hashtag_str}" if caption else hashtag_str
    if video_url:
        x_text += f"\n\n{video_url}"

    return {
        "caption": full_caption,
        "platforms": {
            "x": {
                "url": f"https://twitter.com/intent/tweet?text={urllib.parse.quote(x_text)}",
                "method": "link",
                "label": "Share on X",
            },
            "youtube": {
                "url": "https://www.youtube.com/shorts",
                "method": "download",
                "label": "Upload to YouTube Shorts",
                "instructions": "Download the clip, open YouTube, tap '+' → 'Create a Short', upload the video, paste the caption.",
            },
            "tiktok": {
                "url": "https://www.tiktok.com/upload",
                "method": "download",
                "label": "Upload to TikTok",
                "instructions": "Download the clip, open TikTok, tap '+' → upload the video, paste the caption.",
            },
            "instagram": {
                "url": "https://www.instagram.com/reels/create/",
                "method": "download",
                "label": "Upload to Instagram Reels",
                "instructions": "Download the clip, open Instagram → Reels → upload, paste the caption in the description.",
            },
        },
    }


def get_platform_info() -> dict:
    return PLATFORMS


def get_download_path(filename: str) -> Optional[str]:
    export_dir = Path(__file__).parent.parent / "exports"
    file_path = export_dir / filename
    if file_path.exists():
        return str(file_path)
    return None
