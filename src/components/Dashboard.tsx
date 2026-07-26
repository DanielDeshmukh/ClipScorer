"use client";

import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, Video, FileText, Sparkles, RefreshCw, Filter } from "lucide-react";
import { getHealth, getVideos, crawlChannel, getCrawlProgress, cancelCrawl, scoreAllPending, HealthResponse, Video, CrawlProgress } from "@/lib/api";
import SearchBar from "./SearchBar";
import VideoCard from "./VideoCard";
import { SkeletonGrid, SkeletonStat } from "./Skeleton";

export default function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [channel, setChannel] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState<string | null>(null);
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [h, v] = await Promise.all([getHealth(), getVideos(50, 0, filterChannel, filterStatus)]);
      setHealth(h);
      setVideos(v.videos);
      setTotalVideos(v.total);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [filterChannel, filterStatus]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const v = await getVideos(50, videos.length, filterChannel, filterStatus);
      setVideos((prev) => [...prev, ...v.videos]);
      setTotalVideos(v.total);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!crawling && !scoring) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [crawling, scoring, fetchData]);

  const handleCrawl = async () => {
    if (!channel.trim()) return;
    setCrawling(true);
    setCrawlMsg(null);
    try {
      const result = await crawlChannel(channel);
      setCrawlMsg(result.message);

      const poll = setInterval(async () => {
        try {
          const p = await getCrawlProgress();
          setCrawlProgress(p);
          if (!p.active) {
            clearInterval(poll);
            setCrawling(false);
            fetchData();
          }
        } catch {
          clearInterval(poll);
          setCrawling(false);
          fetchData();
        }
      }, 2000);

      setTimeout(() => { clearInterval(poll); setCrawling(false); }, 600000);
    } catch (e) {
      setCrawlMsg(e instanceof Error ? e.message : "Crawl failed");
      setCrawling(false);
    }
  };

  const handleScoreAll = async () => {
    setScoring(true);
    setScoreMsg(null);
    try {
      const result = await scoreAllPending();
      setScoreMsg(`Scored ${result.scored}/${result.total} videos`);
      fetchData();
    } catch (e) {
      setScoreMsg(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setScoring(false);
    }
  };

  const handleCancelCrawl = async () => {
    try {
      await cancelCrawl();
      setCrawlMsg("Crawl cancellation requested");
    } catch {
      // ignore
    }
  };

  const isOnline = health?.status === "ok";

  return (
    <div className="min-h-screen bg-surface-dark text-on-dark">
      <header className="border-b border-surface-dark-elevated px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-on-dark">ClipScorer</h1>
            <span className="flex items-center gap-1.5 text-xs">
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-success" /> : <WifiOff className="w-3.5 h-3.5 text-error" />}
              <span className={isOnline ? "text-success" : "text-error"}>{isOnline ? "Online" : "Offline"}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="@channel"
              className="px-3 py-1.5 bg-surface-dark-elevated border border-surface-dark-soft rounded-md text-sm text-on-dark placeholder-muted-soft focus:outline-none focus:border-primary w-full sm:w-48"
              onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
            />
            <button
              onClick={handleCrawl}
              disabled={crawling || !channel.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-active disabled:bg-surface-dark-elevated disabled:text-muted-soft text-on-primary text-sm font-medium rounded-md transition-colors"
            >
              {crawling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
              {crawling ? "Crawling..." : "Crawl"}
            </button>
            <button
              onClick={handleScoreAll}
              disabled={scoring}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-teal hover:opacity-90 disabled:bg-surface-dark-elevated disabled:text-muted-soft text-surface-dark text-sm font-medium rounded-md transition-colors"
            >
              {scoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {scoring ? "Scoring..." : "Score All"}
            </button>
          </div>
        </div>
        {crawlMsg && <p className="max-w-7xl mx-auto mt-2 text-xs text-blue-400">{crawlMsg}</p>}
        {scoreMsg && <p className="max-w-7xl mx-auto mt-2 text-xs text-purple-400">{scoreMsg}</p>}
        {crawlProgress && crawlProgress.active && (
          <div className="max-w-7xl mx-auto mt-3">
            <div className="flex items-center justify-between text-xs text-muted-soft mb-1">
              <span>{crawlProgress.message}</span>
              <div className="flex items-center gap-3">
                <span>{crawlProgress.current}/{crawlProgress.total}</span>
                <button
                  onClick={handleCancelCrawl}
                  className="text-error hover:text-error/80 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="w-full bg-surface-dark-elevated rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${crawlProgress.total > 0 ? (crawlProgress.current / crawlProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {loading ? (
            <>
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </>
          ) : (
            <>
              <div className="bg-surface-dark-elevated border border-surface-dark-soft rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted text-xs mb-1"><Video className="w-3.5 h-3.5" /> Videos Indexed</div>
                <p className="text-2xl font-bold text-on-dark">{health?.stats.total_videos ?? 0}</p>
              </div>
              <div className="bg-surface-dark-elevated border border-surface-dark-soft rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted text-xs mb-1"><FileText className="w-3.5 h-3.5" /> Transcripts Ready</div>
                <p className="text-2xl font-bold text-on-dark">{health?.stats.with_transcript ?? 0}</p>
              </div>
              <div className="bg-surface-dark-elevated border border-surface-dark-soft rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted text-xs mb-1"><Sparkles className="w-3.5 h-3.5" /> Viral Segments</div>
                <p className="text-2xl font-bold text-on-dark">{health?.stats.total_segments ?? 0}</p>
              </div>
            </>
          )}
        </div>

        <div className="mb-8">
          <SearchBar />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Videos</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted">
              <Filter className="w-3 h-3" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-surface-dark-elevated border border-surface-dark-soft rounded-md px-2 py-1 text-on-dark text-xs focus:outline-none focus:border-primary"
              >
                <option value="">All Status</option>
                <option value="transcript">Has Transcript</option>
                <option value="no_transcript">No Transcript</option>
                <option value="scored">Scored</option>
              </select>
            </div>
            <input
              type="text"
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              placeholder="Filter channel..."
              className="px-2 py-1 bg-surface-dark-elevated border border-surface-dark-soft rounded-md text-on-dark text-xs placeholder-muted-soft focus:outline-none focus:border-primary w-32"
            />
            <button onClick={fetchData} className="text-xs text-muted-soft hover:text-on-dark flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : videos.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No videos indexed yet. Enter a channel handle above to get started.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((v) => <VideoCard key={v.video_id} video={v} />)}
            </div>
            {videos.length < totalVideos && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 bg-surface-dark-elevated hover:bg-surface-dark-soft text-on-dark text-sm rounded-md transition-colors"
                >
                  {loadingMore ? "Loading..." : `Load More (${videos.length}/${totalVideos})`}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
