import os
import sys
from dotenv import load_dotenv

load_dotenv()

REQUIRED_VARS = {
    "NVIDIA_NIM_API_KEY": "Needed for embeddings and viral scoring",
}

OPTIONAL_VARS = {
    "YOUTUBE_API_KEY": "Needed for YouTube Data API. Without it, falls back to yt-dlp.",
}


def validate_env() -> list[str]:
    warnings = []

    for var, reason in REQUIRED_VARS.items():
        if not os.getenv(var):
            warnings.append(f"MISSING REQUIRED: {var} - {reason}")

    for var, reason in OPTIONAL_VARS.items():
        if not os.getenv(var):
            warnings.append(f"optional: {var} - {reason}")

    return warnings


def print_startup_warnings():
    warnings = validate_env()
    if warnings:
        print("\n" + "=" * 50)
        print("ClipScorer Environment Check")
        print("=" * 50)
        for w in warnings:
            prefix = "!!" if w.startswith("MISSING REQUIRED") else "  "
            print(f"{prefix} {w}")
        print("=" * 50 + "\n")

    return warnings
