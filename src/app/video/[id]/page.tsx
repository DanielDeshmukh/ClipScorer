"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Clock, Eye, Sparkles, Share2, Download, Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Video, ViralSegment, formatDuration, formatViews } from "@/lib/api";
import ShareModal from "@/components/ShareModal";
import TranscriptModal from "@/components/TranscriptModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [segments, setSegments] = useState<ViralSegment[]>([]);
  const [heatmap, setHeatmap] = useState<{ start: number; end: number; score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSegment, setShareSegment] = useState<ViralSegment | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null);

  useEffect(() => {
    if (!videoId) return;
    Promise.all([
      fetch(`${API_URL}/api/videos/${videoId}`).then((r) => r.json()),
      fetch(`${API_URL}/api/videos/${videoId}/segments`).then((r) => r.json()),
      fetch(`${API_URL}/api/videos/${videoId}/heatmap`).then((r) => r.json()).catch(() => ({ heatmap: [] })),
    ]).then(([v, s, h]) => {
      setVideo(v);
      setSegments(s.segments || []);
      setHeatmap(h.heatmap || []);
    }).finally(() => setLoading(false));
  }, [videoId]);

  const duration = video?.duration_seconds || 0;

  const timeToSeconds = (t: string) => {
    const parts = t.split(":").map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
  };

  const secondsToTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const getSegmentPosition = (seg: ViralSegment) => {
    if (!duration) return { left: 0, width: 0 };
    const start = timeToSeconds(seg.start_time);
    const end = timeToSeconds(seg.end_time);
    return {
      left: (start / duration) * 100,
      width: Math.max(((end - start) / duration) * 100, 1),
    };
  };

  const getHeatmapPosition = (h: { start: number; end: number; score: number }) => {
    if (!duration) return { left: 0, width: 0 };
    return {
      left: (h.start / duration) * 100,
      width: Math.max(((h.end - h.start) / duration) * 100, 0.5),
    };
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-accent-amber";
    return "text-primary";
  };

  const labelColor = (label: string) => {
    switch (label) {
      case "Hook": return "bg-accent-amber/20 text-accent-amber border-accent-amber/30";
      case "Controversial": return "bg-error/20 text-error border-error/30";
      case "Insight": return "bg-accent-teal/20 text-accent-teal border-accent-teal/30";
      case "Vulnerable": return "bg-primary/20 text-primary border-primary/30";
      default: return "bg-muted/20 text-muted border-muted/30";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-surface-dark flex flex-col items-center justify-center text-on-dark">
        <p className="text-lg mb-4">Video not found</p>
        <button onClick={() => router.push("/")} className="px-4 py-2 bg-primary rounded-lg text-on-primary">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark text-on-dark">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-muted-soft hover:text-on-dark transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl overflow-hidden border border-surface-dark-elevated">
              <div className="relative aspect-video bg-black">
                <img
                  src={`https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`;
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <a
                    href={video.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-16 h-16 bg-primary/90 hover:bg-primary rounded-full flex items-center justify-center transition-colors"
                  >
                    <Play className="w-8 h-8 text-on-primary ml-1" />
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-xl font-bold text-on-dark mb-2">{video.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-soft flex-wrap">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(video.duration_seconds)}</span>
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{formatViews(video.view_count)}</span>
                {video.source_channel && <span>{video.source_channel}</span>}
                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />{segments.length} clips</span>
              </div>
            </div>

            <div className="bg-surface-dark-elevated rounded-xl border border-surface-dark-soft p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-on-dark">Clip Timeline</h2>
                <div className="flex gap-3 text-[10px] text-muted-soft">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/60 inline-block" /> Clips</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-amber/60 inline-block" /> Heatmap</span>
                </div>
              </div>

              <div className="relative h-10 bg-surface-dark rounded-lg mb-2 overflow-hidden">
                {heatmap.map((h, i) => {
                  const pos = getHeatmapPosition(h);
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-full bg-accent-amber/20 border-r border-accent-amber/10"
                      style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                      title={`Engagement: ${Math.round(h.score * 100)}% (${secondsToTime(h.start)}-${secondsToTime(h.end)})`}
                    />
                  );
                })}
                {segments.map((seg) => {
                  const pos = getSegmentPosition(seg);
                  return (
                    <div
                      key={seg.id}
                      className={`absolute bottom-0 h-2 rounded-full cursor-pointer transition-all ${activeSegment === seg.id ? "ring-2 ring-white/50" : ""}`}
                      style={{
                        left: `${pos.left}%`,
                        width: `${pos.width}%`,
                        backgroundColor: seg.viral_score >= 80 ? "var(--color-success)" : seg.viral_score >= 60 ? "var(--color-accent-amber)" : "var(--color-primary)",
                      }}
                      onClick={() => {
                        setActiveSegment(seg.id);
                        const el = document.getElementById(`seg-${seg.id}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      title={`${seg.viral_score} - ${seg.label} (${seg.start_time}-${seg.end_time})`}
                    />
                  );
                })}
              </div>

              <div className="flex justify-between text-[10px] text-muted-soft">
                <span>0:00</span>
                <span>{secondsToTime(duration / 2)}</span>
                <span>{secondsToTime(duration)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-on-dark">All Clips ({segments.length})</h2>
              {segments.sort((a, b) => b.viral_score - a.viral_score).map((seg) => {
                const isExpanded = expandedSegment === seg.id;
                return (
                  <div
                    key={seg.id}
                    id={`seg-${seg.id}`}
                    className={`bg-surface-dark-elevated rounded-xl border p-4 transition-all ${activeSegment === seg.id ? "border-primary shadow-lg shadow-primary/10" : "border-surface-dark-soft"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${scoreColor(seg.viral_score)}`}>{seg.viral_score}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-pill border ${labelColor(seg.label)}`}>{seg.label}</span>
                        {seg.heatmap_score > 0.4 && (
                          <span className="px-2 py-0.5 text-xs rounded-pill bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
                            Most Replayed
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-soft">{seg.start_time} - {seg.end_time}</span>
                    </div>

                    <p className="text-sm text-on-dark-soft mb-3">{seg.reasoning}</p>

                    <div className="bg-surface-dark rounded-lg p-3 mb-3">
                      <p className="text-xs text-muted mb-1">Caption</p>
                      <p className="text-sm text-on-dark leading-relaxed">{seg.caption}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setShareSegment(seg);
                          setShareOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium rounded-md transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                      <button
                        onClick={() => setExpandedSegment(isExpanded ? null : seg.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-dark-elevated hover:bg-surface-dark text-on-dark-soft text-xs font-medium rounded-md transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? "Less" : "Details"}
                      </button>
                      <a
                        href={getTimestampUrl(video.video_url, seg.start_time)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-dark-elevated hover:bg-surface-dark text-on-dark-soft text-xs font-medium rounded-md transition-colors ml-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Watch
                      </a>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-surface-dark-soft">
                        <p className="text-xs text-muted mb-1">Clip Duration</p>
                        <p className="text-sm text-on-dark">
                          {(() => {
                            const s = timeToSeconds(seg.start_time);
                            const e = timeToSeconds(seg.end_time);
                            return `${e - s} seconds`;
                          })()}
                        </p>
                        {seg.heatmap_score > 0 && (
                          <p className="text-xs text-muted-soft mt-1">
                            Heatmap overlap: {Math.round(seg.heatmap_score * 100)}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {segments.length === 0 && (
                <div className="text-center py-12 text-muted-soft">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No clips scored yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-surface-dark-elevated rounded-xl border border-surface-dark-soft p-4">
              <h3 className="text-sm font-semibold text-on-dark mb-3">Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-soft">Total Clips</span><span className="text-on-dark font-medium">{segments.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-soft">Avg Score</span><span className="text-on-dark font-medium">{segments.length > 0 ? Math.round(segments.reduce((a, s) => a + s.viral_score, 0) / segments.length) : "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-soft">Top Score</span><span className={`font-medium ${scoreColor(Math.max(...segments.map((s) => s.viral_score), 0))}`}>{segments.length > 0 ? Math.max(...segments.map((s) => s.viral_score)) : "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-soft">Heatmap Zones</span><span className="text-on-dark font-medium">{heatmap.length}</span></div>
              </div>
            </div>

            <div className="bg-surface-dark-elevated rounded-xl border border-surface-dark-soft p-4">
              <h3 className="text-sm font-semibold text-on-dark mb-3">Labels</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  segments.reduce((acc, s) => { acc[s.label] = (acc[s.label] || 0) + 1; return acc; }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
                  <span key={label} className={`px-2 py-1 text-xs rounded-lg border ${labelColor(label)}`}>
                    {label}: {count}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-surface-dark-elevated rounded-xl border border-surface-dark-soft p-4">
              <h3 className="text-sm font-semibold text-on-dark mb-3">Score Distribution</h3>
              <div className="space-y-1.5">
                {["90-100", "80-89", "70-79", "60-69", "Below 60"].map((range) => {
                  const [low, high] = range === "Below 60" ? [0, 59] : range.split("-").map(Number);
                  const count = segments.filter((s) => s.viral_score >= low && s.viral_score <= high).length;
                  const pct = segments.length > 0 ? (count / segments.length) * 100 : 0;
                  return (
                    <div key={range} className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-muted-soft shrink-0">{range}</span>
                      <div className="flex-1 h-2 bg-surface-dark rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-muted-soft">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setTranscriptOpen(true)}
              disabled={!video.transcript}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-dark-elevated hover:bg-surface-dark-soft border border-surface-dark-soft text-on-dark text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
            >
              View Transcript
            </button>
          </div>
        </div>
      </div>

      {shareOpen && shareSegment && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => { setShareOpen(false); setShareSegment(null); }}
          segmentId={shareSegment.id}
          videoUrl={video.video_url}
          startTime={shareSegment.start_time}
          endTime={shareSegment.end_time}
          caption={shareSegment.caption}
          label={shareSegment.label}
          title={video.title}
          videoId={video.video_id}
        />
      )}

      {transcriptOpen && (
        <TranscriptModal videoId={video.video_id} onClose={() => setTranscriptOpen(false)} />
      )}
    </div>
  );
}

function getTimestampUrl(videoUrl: string, timestamp: string): string {
  const [mins, secs] = timestamp.split(":").map(Number);
  const totalSeconds = mins * 60 + secs;
  return `${videoUrl}&t=${totalSeconds}`;
}
