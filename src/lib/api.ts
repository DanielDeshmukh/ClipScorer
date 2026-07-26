const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Video {
  video_id: string;
  title: string;
  duration_seconds: number;
  view_count: number;
  transcript: string | null;
  transcript_status: string;
  source_channel: string;
  video_url: string;
  vector_embedding: string | null;
  updated_at: string;
}

export interface ViralSegment {
  id: number;
  video_id: string;
  start_time: string;
  end_time: string;
  viral_score: number;
  label: string;
  caption: string;
  reasoning: string;
  title: string;
  video_url: string;
  created_at: string;
}

export interface SearchResult {
  video_id: string;
  title: string;
  source_channel: string;
  match_score: number;
  segments: ViralSegment[];
}

export interface HealthResponse {
  status: string;
  stats: {
    total_videos: number;
    with_transcript: number;
    total_segments: number;
    last_crawl: string | null;
  };
}

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || error.error || "Request failed");
  }
  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  return fetcher("/health");
}

export interface CrawlProgress {
  active: boolean;
  channel: string;
  current: number;
  total: number;
  phase: string;
  message: string;
  errors: { video_id: string; error: string }[];
  started_at: number | null;
  finished_at: number | null;
}

export async function getCrawlProgress(): Promise<CrawlProgress> {
  return fetcher("/api/crawl/progress");
}

export async function cancelCrawl(): Promise<{ status: string; message: string }> {
  return fetcher("/api/crawl/cancel", { method: "POST" });
}

export async function getVideos(limit = 50, offset = 0, channel = "", status = ""): Promise<{ videos: Video[]; total: number; limit: number; offset: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (channel) params.set("channel", channel);
  if (status) params.set("status", status);
  return fetcher(`/api/videos?${params.toString()}`);
}

export async function getVideo(videoId: string): Promise<Video> {
  return fetcher(`/api/videos/${videoId}`);
}

export async function deleteVideo(videoId: string): Promise<{ status: string; video_id: string }> {
  return fetcher(`/api/videos/${videoId}`, { method: "DELETE" });
}

export async function deleteVideos(videoIds: string[]): Promise<{ status: string; deleted: number }> {
  let deleted = 0;
  for (const id of videoIds) {
    try {
      await deleteVideo(id);
      deleted++;
    } catch {
      // continue on error
    }
  }
  return { status: "ok", deleted };
}

export async function getSegments(): Promise<{ segments: ViralSegment[] }> {
  return fetcher("/api/segments");
}

export async function searchVideos(q: string, top_n = 10): Promise<{ query: string; results: SearchResult[] }> {
  return fetcher(`/api/search?q=${encodeURIComponent(q)}&top_n=${top_n}`);
}

export async function crawlChannel(channel: string, maxVideos = 30, force = false): Promise<{ status: string; message: string }> {
  return fetcher("/crawl/channel", {
    method: "POST",
    body: JSON.stringify({ channel, max_videos: maxVideos, force }),
  });
}

export async function scoreVideo(videoId: string): Promise<{ video_id: string; segments: ViralSegment[] } | { error: string }> {
  return fetcher(`/score/${videoId}`, { method: "POST" });
}

export async function scoreAllPending(): Promise<{ status: string; message: string }> {
  return fetcher("/score/all", { method: "POST" });
}

export async function embedAll(): Promise<{ embedded: number; errors: unknown[] }> {
  return fetcher("/embed/all", { method: "POST" });
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function getTimestampUrl(videoUrl: string, timestamp: string): string {
  const [mins, secs] = timestamp.split(":").map(Number);
  const totalSeconds = mins * 60 + secs;
  return `${videoUrl}&t=${totalSeconds}`;
}
