<div align="center">

# ClipScorer

**AI-powered viral clip finder for any YouTube channel.**

Crawl any channel → fetch transcripts → score viral segments with NVIDIA NIM → search semantically → get share-ready captions.

[![GitHub Stars](https://img.shields.io/github/stars/DanielDeshmukh/ClipScorer?style=flat-square&logo=github&label=Stars)](https://github.com/DanielDeshmukh/ClipScorer)
[![GitHub Issues](https://img.shields.io/github/issues/DanielDeshmukh/ClipScorer?style=flat-square&logo=github&label=Issues)](https://github.com/DanielDeshmukh/ClipScorer/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/DanielDeshmukh/ClipScorer?style=flat-square&logo=github&label=PRs)](https://github.com/DanielDeshmukh/ClipScorer/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA_NIM-AI-76B900?style=flat-square&logo=nvidia)](https://build.nvidia.com/)
[![YouTube](https://img.shields.io/badge/YouTube-API-FF0000?style=flat-square&logo=youtube)](https://developers.google.com/youtube)

---

</div>

## What it does

ClipScorer automatically finds the most viral-worthy moments in any YouTube channel's content. Feed it a channel handle, and it will:

1. **Crawl** the channel's top videos and fetch metadata + transcripts
2. **Score** every transcript using NVIDIA NIM AI to surface contrarian takes, vulnerable stories, and high-conviction predictions
3. **Search** across all indexed videos semantically — ask a question, get the most relevant clips
4. **Deliver** copy-ready captions for LinkedIn/X with one click

## How it works

```
@handle → Crawl videos → Fetch transcripts → Embed with NIM → Score viral segments → Search & share
```

| Step | What happens | Tech |
|------|-------------|------|
| **Discover** | Resolve channel handle to video list | YouTube Data API / yt-dlp |
| **Fetch** | Pull transcripts for each video | youtube-transcript-api / yt-dlp |
| **Embed** | Generate 1536-dim vectors for semantic search | NVIDIA NIM Embeddings |
| **Score** | Find 3 viral segments per video (score, label, caption, reasoning) | NVIDIA NIM LLM |
| **Search** | Cosine similarity across all embeddings | Custom Python engine |
| **Display** | Dashboard with cards, search, and copy buttons | Next.js + Tailwind |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Lucide Icons |
| Backend API | FastAPI, Uvicorn |
| Database | SQLite (WAL mode, foreign keys) |
| AI Models | NVIDIA NIM (embeddings + LLM scoring) |
| YouTube | YouTube Data API, yt-dlp, youtube-transcript-api |
| Language | TypeScript (frontend), Python 3.11+ (engine) |

## Key Features

- **Channel crawling** — enter any `@handle`, get all top videos indexed
- **Transcript fetching** — with cookie-enabled fallback for rate-limited channels
- **Viral scoring** — AI labels each segment as Hook, Controversial, or Insight with a 1-100 score
- **Semantic search** — natural language queries across all indexed content
- **One-click captions** — copy-ready text for LinkedIn, X, or any platform
- **Timestamped links** — jump directly to the viral moment on YouTube
- **Live status** — backend health indicator, crawl progress, transcript status badges

## Project Structure

```
ClipScorer/
├── src/                    # Next.js app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── VideoCard.tsx
│   │   ├── SearchBar.tsx
│   │   └── SegmentCard.tsx
│   └── lib/
│       └── api.ts
├── engine/                 # Python AI engine
│   ├── api.py              # FastAPI routes
│   ├── engine.py           # YouTube crawler
│   ├── scorer.py           # NVIDIA NIM scoring
│   ├── search.py           # Semantic search
│   ├── db.py               # SQLite operations
│   └── scout.py            # Cookie-enabled transcript fetcher
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── requirements.txt
└── README.md
```

## License

[MIT](LICENSE)
