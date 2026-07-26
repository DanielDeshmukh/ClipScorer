"use client";

import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, Video, FileText, Sparkles, RefreshCw } from "lucide-react";
import { getHealth, getVideos, crawlChannel, HealthResponse, Video } from "@/lib/api";
import SearchBar from "./SearchBar";
import VideoCard from "./VideoCard";

export default function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [channel, setChannel] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [h, v] = await Promise.all([getHealth(), getVideos()]);
      setHealth(h);
      setVideos(v.videos);
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCrawl = async () => {
    if (!channel.trim()) return;
    setCrawling(true);
    setCrawlMsg(null);
    try {
      const result = await crawlChannel(channel);
      setCrawlMsg(result.message);
      setTimeout(fetchData, 5000);
    } catch (e) {
      setCrawlMsg(e instanceof Error ? e.message : "Crawl failed");
    } finally {
      setCrawling(false);
    }
  };

  const isOnline = health?.status === "ok";

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">ClipScorer</h1>
            <span className="flex items-center gap-1.5 text-xs">
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-green-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
              <span className={isOnline ? "text-green-400" : "text-red-400"}>{isOnline ? "Online" : "Offline"}</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="@channel"
                className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48"
                onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
              />
              <button
                onClick={handleCrawl}
                disabled={crawling || !channel.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {crawling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                {crawling ? "Crawling..." : "Crawl"}
              </button>
            </div>
          </div>
        </div>
        {crawlMsg && <p className="max-w-7xl mx-auto mt-2 text-xs text-blue-400">{crawlMsg}</p>}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Video className="w-3.5 h-3.5" /> Videos Indexed</div>
            <p className="text-2xl font-bold text-white">{health?.stats.total_videos ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><FileText className="w-3.5 h-3.5" /> Transcripts Ready</div>
            <p className="text-2xl font-bold text-white">{health?.stats.with_transcript ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Sparkles className="w-3.5 h-3.5" /> Viral Segments</div>
            <p className="text-2xl font-bold text-white">{health?.stats.total_segments ?? 0}</p>
          </div>
        </div>

        <div className="mb-8">
          <SearchBar />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Videos</h2>
          <button onClick={fetchData} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No videos indexed yet. Enter a channel handle above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => <VideoCard key={v.video_id} video={v} />)}
          </div>
        )}
      </main>
    </div>
  );
}
