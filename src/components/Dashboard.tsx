"use client";

import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, Video as VideoIcon, FileText, Sparkles, RefreshCw, Filter, Trash2, ChevronDown, ChevronUp, Play } from "lucide-react";
import { getHealth, getVideos, crawlChannel, crawlVideo, getCrawlProgress, cancelCrawl, scoreAllPending, embedAll, deleteVideos, getDashboardStats, getChannelAnalytics, HealthResponse, Video, CrawlProgress, DashboardStats, ChannelAnalytics } from "@/lib/api";
import SearchBar from "./SearchBar";
import VideoCard from "./VideoCard";
import { SkeletonGrid, SkeletonStat } from "./Skeleton";
import { useToast } from "./Toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [channel, setChannel] = useState("");
  const [crawlMode, setCrawlMode] = useState<"channel" | "video">("channel");
  const [videoUrl, setVideoUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState<string | null>(null);
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreMsg, setScoreMsg] = useState<string | null>(null);
  const [embedding, setEmbedding] = useState(false);
  const [embedMsg, setEmbedMsg] = useState<string | null>(null);
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [forceCrawl, setForceCrawl] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<ChannelAnalytics[]>([]);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const fetchData = useCallback(async () => {
    try {
      const [h, v, s, a] = await Promise.allSettled([getHealth(), getVideos(50, 0, filterChannel, filterStatus), getDashboardStats(), getChannelAnalytics()]);
      if (h.status === "fulfilled") setHealth(h.value);
      if (v.status === "fulfilled") {
        setVideos(v.value.videos);
        setTotalVideos(v.value.total);
      }
      if (s.status === "fulfilled") setDashStats(s.value);
      if (a.status === "fulfilled") setAnalytics(a.value.channels);
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

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    const line = `[${ts}] ${msg}`;
    setCrawlLogs((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === line) return prev;
      return [...prev.slice(-50), line];
    });
  };

  const handleCrawl = async () => {
    const input = crawlMode === "channel" ? channel.trim() : videoUrl.trim();
    if (!input) return;
    setCrawling(true);
    setCrawlMsg(null);
    setCrawlLogs([]);
    addLog(crawlMode === "channel" ? `Starting crawl for ${input}...` : `Adding video: ${input}...`);
    try {
      const result = crawlMode === "channel"
        ? await crawlChannel(input, 30, forceCrawl)
        : await crawlVideo(input, forceCrawl);
      setCrawlMsg(result.message);
      addLog(result.message);

      let seenActive = false;
      let lastPollMsg = "";
      const poll = setInterval(async () => {
        try {
          const p = await getCrawlProgress();
          setCrawlProgress(p);

          if (p.active) {
            seenActive = true;
            if (p.message && p.message !== lastPollMsg) {
              lastPollMsg = p.message;
              addLog(p.message);
            }
          }

          const isDone = !p.active && (p.phase === "done" || p.finished_at !== null);
          if ((seenActive && !p.active) || isDone) {
            clearInterval(poll);
            setCrawling(false);
            addLog(p.message || "Complete");
            toast("Complete", "success");
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
      setCrawlMsg(e instanceof Error ? e.message : "Failed");
      addLog(`Error: ${e instanceof Error ? e.message : "Failed"}`);
      toast(e instanceof Error ? e.message : "Failed", "error");
      setCrawling(false);
    }
  };

  const handleScoreAll = async () => {
    setScoring(true);
    setScoreMsg(null);
    setCrawlLogs([]);
    addLog("Starting Score All...");
    try {
      const result = await scoreAllPending();
      addLog(result.message || "Scoring started in background");

      let seenActive = false;
      let lastPollMsg = "";
      const poll = setInterval(async () => {
        try {
          const p = await getCrawlProgress();
          setCrawlProgress(p);

          if (p.active) {
            seenActive = true;
            if (p.message && p.message !== lastPollMsg) {
              lastPollMsg = p.message;
              addLog(p.message);
            }
          }

          const isDone = !p.active && (p.phase === "done" || p.finished_at !== null);
          if ((seenActive && !p.active) || isDone) {
            clearInterval(poll);
            setScoring(false);
            addLog(p.message || "Scoring complete");
            toast("Scoring complete", "success");
            fetchData();
          }
        } catch {
          clearInterval(poll);
          setScoring(false);
          fetchData();
        }
      }, 2000);

      setTimeout(() => { clearInterval(poll); setScoring(false); }, 1800000);
    } catch (e) {
      setScoreMsg(e instanceof Error ? e.message : "Scoring failed");
      addLog(`Error: ${e instanceof Error ? e.message : "Scoring failed"}`);
      setScoring(false);
    }
  };

  const handleEmbedAll = async () => {
    setEmbedding(true);
    setEmbedMsg(null);
    setCrawlLogs([]);
    addLog("Starting Embed All...");
    try {
      const result = await embedAll();
      addLog(result.message || "Embedding started in background");

      let seenActive = false;
      let lastPollMsg = "";
      const poll = setInterval(async () => {
        try {
          const p = await getCrawlProgress();
          setCrawlProgress(p);

          if (p.active) {
            seenActive = true;
            if (p.message && p.message !== lastPollMsg) {
              lastPollMsg = p.message;
              addLog(p.message);
            }
          }

          const isDone = !p.active && (p.phase === "done" || p.finished_at !== null);
          if ((seenActive && !p.active) || isDone) {
            clearInterval(poll);
            setEmbedding(false);
            addLog(p.message || "Embedding complete");
            toast("Embedding complete", "success");
            fetchData();
          }
        } catch {
          clearInterval(poll);
          setEmbedding(false);
          fetchData();
        }
      }, 2000);

      setTimeout(() => { clearInterval(poll); setEmbedding(false); }, 600000);
    } catch (e) {
      setEmbedMsg(e instanceof Error ? e.message : "Embedding failed");
      toast(e instanceof Error ? e.message : "Embedding failed", "error");
      setEmbedding(false);
    }
  };

  const handleCancelCrawl = async () => {
    try {
      await cancelCrawl();
      setCrawlMsg("Crawl cancellation requested");
      toast("Crawl cancellation requested", "info");
    } catch {
      // ignore
    }
  };

  const handleBatchDelete = async () => {
    if (selectedVideos.size === 0) return;
    if (!confirm(`Delete ${selectedVideos.size} selected videos and all their segments?`)) return;
    setDeleting(true);
    try {
      const result = await deleteVideos(Array.from(selectedVideos));
      setScoreMsg(`Deleted ${result.deleted} videos`);
      toast(`Deleted ${result.deleted} videos`, "success");
      setSelectedVideos(new Set());
      fetchData();
    } catch (e) {
      setScoreMsg(e instanceof Error ? e.message : "Delete failed");
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVideos(new Set(videos.map((v) => v.video_id)));
    } else {
      setSelectedVideos(new Set());
    }
  };

  const handleSelectVideo = (videoId: string, checked: boolean) => {
    setSelectedVideos((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(videoId);
      } else {
        next.delete(videoId);
      }
      return next;
    });
  };

  const isOnline = health?.status === "ok";

  const sortedVideos = [...videos].sort((a, b) => {
    switch (sortBy) {
      case "views": return b.view_count - a.view_count;
      case "views_asc": return a.view_count - b.view_count;
      case "title": return a.title.localeCompare(b.title);
      case "duration": return b.duration_seconds - a.duration_seconds;
      case "newest": return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "oldest": return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      default: return 0;
    }
  });

  return (
    <div className="min-h-screen bg-surface-dark text-on-dark">
      <header className="border-b border-surface-dark-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-on-dark tracking-tight">ClipScorer</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${isOnline ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <button
              onClick={fetchData}
              className="text-xs text-muted-soft hover:text-on-dark flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center bg-surface-dark-elevated border border-surface-dark-soft rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setCrawlMode("channel")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${crawlMode === "channel" ? "bg-primary text-on-primary" : "text-muted-soft hover:text-on-dark"}`}
              >
                <VideoIcon className="w-3.5 h-3.5 inline mr-1" />
                Channel
              </button>
              <button
                onClick={() => setCrawlMode("video")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${crawlMode === "video" ? "bg-primary text-on-primary" : "text-muted-soft hover:text-on-dark"}`}
              >
                <Play className="w-3.5 h-3.5 inline mr-1" />
                Single Video
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              {crawlMode === "channel" ? (
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="@channel handle"
                  className="flex-1 min-w-0 px-3 py-2 bg-surface-dark-elevated border border-surface-dark-soft rounded-lg text-sm text-on-dark placeholder-muted-soft focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
                />
              ) : (
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="YouTube URL or video ID"
                  className="flex-1 min-w-0 px-3 py-2 bg-surface-dark-elevated border border-surface-dark-soft rounded-lg text-sm text-on-dark placeholder-muted-soft focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
                />
              )}
              <label className="flex items-center gap-1.5 text-xs text-muted-soft cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={forceCrawl}
                  onChange={(e) => setForceCrawl(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-surface-dark-soft bg-surface-dark-elevated"
                />
                Force
              </label>
              <button
                onClick={handleCrawl}
                disabled={crawling || !(crawlMode === "channel" ? channel.trim() : videoUrl.trim())}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-active disabled:bg-surface-dark-elevated disabled:text-muted-soft text-on-primary text-sm font-medium rounded-lg transition-colors shrink-0"
              >
                {crawling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <VideoIcon className="w-3.5 h-3.5" />}
                {crawling ? "Working..." : crawlMode === "channel" ? (forceCrawl ? "Re-crawl" : "Crawl") : "Add Video"}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleScoreAll}
                disabled={scoring}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent-teal hover:opacity-90 disabled:bg-surface-dark-elevated disabled:text-muted-soft text-surface-dark text-sm font-medium rounded-lg transition-colors"
              >
                {scoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {scoring ? "Scoring..." : "Score All"}
              </button>
              <button
                onClick={handleEmbedAll}
                disabled={embedding}
                className="flex items-center gap-1.5 px-4 py-2 bg-surface-dark-elevated hover:bg-surface-dark-soft border border-surface-dark-soft disabled:text-muted-soft text-on-dark text-sm font-medium rounded-lg transition-colors"
              >
                {embedding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {embedding ? "Embedding..." : "Embed All"}
              </button>
            </div>
          </div>
        </div>
        {crawlMsg && <p className="max-w-7xl mx-auto mt-2 text-xs text-blue-400">{crawlMsg}</p>}
        {scoreMsg && <p className="max-w-7xl mx-auto mt-2 text-xs text-purple-400">{scoreMsg}</p>}
        {embedMsg && <p className="max-w-7xl mx-auto mt-2 text-xs text-yellow-400">{embedMsg}</p>}
        {crawling && (
          <div className="max-w-7xl mx-auto mt-3">
            <div className="flex items-center justify-between text-xs text-muted-soft mb-1">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {crawlProgress?.active ? crawlProgress.message : "Starting crawl..."}
              </span>
              <div className="flex items-center gap-3">
                {crawlProgress && crawlProgress.total > 0 && (
                  <span>{crawlProgress.current}/{crawlProgress.total}</span>
                )}
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
                style={{
                  width: crawlProgress && crawlProgress.total > 0
                    ? `${(crawlProgress.current / crawlProgress.total) * 100}%`
                    : "30%",
                  animation: crawlProgress && crawlProgress.total > 0 ? "none" : "pulse 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        )}
        {scoring && (
          <div className="max-w-7xl mx-auto mt-3">
            <div className="flex items-center justify-between text-xs text-muted-soft mb-1">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {crawlProgress?.active ? crawlProgress.message : "Starting scoring..."}
              </span>
              <div className="flex items-center gap-3">
                {crawlProgress && crawlProgress.total > 0 && (
                  <span>{crawlProgress.current}/{crawlProgress.total}</span>
                )}
              </div>
            </div>
            <div className="w-full bg-surface-dark-elevated rounded-full h-1.5">
              <div
                className="bg-accent-teal h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: crawlProgress && crawlProgress.total > 0
                    ? `${(crawlProgress.current / crawlProgress.total) * 100}%`
                    : "30%",
                  animation: crawlProgress && crawlProgress.total > 0 ? "none" : "pulse 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        )}
        {crawlLogs.length > 0 && (
          <div className="max-w-7xl mx-auto mt-3 bg-surface-dark-elevated border border-surface-dark-soft rounded-md p-3 max-h-40 overflow-y-auto">
            <div className="text-[10px] text-muted-soft mb-1.5 font-medium uppercase tracking-wider">Activity Log</div>
            <div className="space-y-0.5">
              {crawlLogs.map((log, i) => (
                <div key={i} className="text-[11px] text-muted-soft font-mono leading-relaxed">{log}</div>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {loading ? (
            <>
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </>
          ) : (
            <>
              <div className="bg-surface-dark-elevated border border-surface-dark-soft rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted-soft text-xs mb-2"><VideoIcon className="w-4 h-4" /> Videos Indexed</div>
                <p className="text-3xl font-bold text-on-dark">{health?.stats.total_videos ?? 0}</p>
              </div>
              <div className="bg-surface-dark-elevated border border-surface-dark-soft rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted-soft text-xs mb-2"><FileText className="w-4 h-4" /> Transcripts Ready</div>
                <p className="text-3xl font-bold text-on-dark">{health?.stats.with_transcript ?? 0}</p>
              </div>
              <div className="bg-surface-dark-elevated border border-surface-dark-soft rounded-xl p-5">
                <div className="flex items-center gap-2 text-muted-soft text-xs mb-2"><Sparkles className="w-4 h-4" /> Avg Score</div>
                <p className="text-3xl font-bold text-on-dark">{dashStats?.avg_score ?? "-"}</p>
              </div>
              <div className="bg-surface-dark-elevated border border-success/20 rounded-xl p-5">
                <div className="flex items-center gap-2 text-success/80 text-xs mb-2"><Sparkles className="w-4 h-4" /> 90+ Clips</div>
                <p className="text-3xl font-bold text-success">{dashStats?.score_distribution["90-100"] ?? 0}</p>
              </div>
            </>
          )}
        </div>

        {analytics.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setAnalyticsOpen(!analyticsOpen)}
              className="flex items-center gap-2 text-sm text-muted-soft hover:text-on-dark transition-colors mb-3"
            >
              {analyticsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Channel Analytics ({analytics.length} channel{analytics.length !== 1 ? "s" : ""})
            </button>
            {analyticsOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analytics.map((ch) => (
                  <div key={ch.channel} className="bg-surface-dark-elevated border border-surface-dark-soft rounded-xl p-5">
                    <h3 className="text-sm font-medium text-on-dark mb-3 truncate">{ch.channel}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-soft">Videos</span>
                        <p className="font-bold text-on-dark">{ch.total_videos}</p>
                      </div>
                      <div>
                        <span className="text-muted-soft">Segments</span>
                        <p className="font-bold text-on-dark">{ch.total_segments}</p>
                      </div>
                      <div>
                        <span className="text-muted-soft">Avg Score</span>
                        <p className="font-bold text-on-dark">{ch.avg_score}</p>
                      </div>
                      <div>
                        <span className="text-muted-soft">Views</span>
                        <p className="font-bold text-on-dark">{ch.total_views >= 1000000 ? `${(ch.total_views / 1000000).toFixed(1)}M` : ch.total_views >= 1000 ? `${(ch.total_views / 1000).toFixed(0)}K` : ch.total_views}</p>
                      </div>
                    </div>
                    {ch.top_video && (
                      <div className="mt-2 pt-2 border-t border-surface-dark-soft">
                        <p className="text-[10px] text-muted-soft uppercase">Top Clip</p>
                        <p className="text-xs text-on-dark truncate">{ch.top_video.title}</p>
                        <p className="text-xs font-bold text-success">{ch.top_video.score}/100</p>
                      </div>
                    )}
                    {Object.keys(ch.labels).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-surface-dark-soft flex flex-wrap gap-1">
                        {Object.entries(ch.labels).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
                          <span key={label} className="px-1.5 py-0.5 text-[10px] bg-surface-dark rounded text-muted-soft">{label}: {count}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-8">
          <SearchBar />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-on-dark">Videos</h2>
              <label className="flex items-center gap-1.5 text-xs text-muted-soft cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedVideos.size === sortedVideos.length && sortedVideos.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-surface-dark-soft bg-surface-dark-elevated"
                />
                All
              </label>
              {selectedVideos.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-error hover:opacity-90 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? "Deleting..." : `Delete (${selectedVideos.size})`}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted">
              <Filter className="w-3 h-3" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-surface-dark-elevated border border-surface-dark-soft rounded-lg px-2.5 py-1.5 text-on-dark text-xs focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">All Status</option>
                <option value="transcript">Has Transcript</option>
                <option value="no_transcript">No Transcript</option>
                <option value="scored">Scored</option>
              </select>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface-dark-elevated border border-surface-dark-soft rounded-lg px-2.5 py-1.5 text-on-dark text-xs focus:outline-none focus:border-primary transition-colors"
            >
              <option value="default">Default</option>
              <option value="views">Most Viewed</option>
              <option value="views_asc">Least Viewed</option>
              <option value="title">Title A-Z</option>
              <option value="duration">Longest</option>
              <option value="newest">Recently Updated</option>
              <option value="oldest">Oldest Updated</option>
            </select>
            <input
              type="text"
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              placeholder="Filter channel..."
              className="px-2.5 py-1.5 bg-surface-dark-elevated border border-surface-dark-soft rounded-lg text-on-dark text-xs placeholder-muted-soft focus:outline-none focus:border-primary transition-colors w-full sm:w-36"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : videos.length === 0 ? (
          <div className="text-center py-24 text-muted">
            <VideoIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-1">No videos indexed yet</p>
            <p className="text-sm text-muted-soft">Enter a channel handle above to get started</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedVideos.map((v) => (
                <VideoCard
                  key={v.video_id}
                  video={v}
                  onDelete={fetchData}
                  selected={selectedVideos.has(v.video_id)}
                  onSelect={(checked) => handleSelectVideo(v.video_id, checked)}
                />
              ))}
            </div>
            {videos.length < totalVideos && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-surface-dark-elevated hover:bg-surface-dark-soft border border-surface-dark-soft text-on-dark text-sm font-medium rounded-lg transition-colors"
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
