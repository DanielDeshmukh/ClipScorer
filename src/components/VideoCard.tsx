"use client";

import { useState } from "react";
import { Play, ExternalLink, Sparkles, Clock, Eye, ChevronDown, ChevronUp, FileText, Trash2 } from "lucide-react";
import { Video, ViralSegment, scoreVideo, deleteVideo, formatDuration, formatViews } from "@/lib/api";
import SegmentCard from "./SegmentCard";
import TranscriptModal from "./TranscriptModal";

interface VideoCardProps {
  video: Video;
  onDelete?: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export default function VideoCard({ video, onDelete, selected, onSelect }: VideoCardProps) {
  const [scoring, setScoring] = useState(false);
  const [segments, setSegments] = useState<ViralSegment[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleScore = async () => {
    setScoring(true);
    setError(null);
    try {
      const result = await scoreVideo(video.video_id);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSegments(result.segments);
        setShowInsights(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setScoring(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this video and all its segments?")) return;
    setDeleting(true);
    try {
      await deleteVideo(video.video_id);
      onDelete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  };

  const statusBadge = () => {
    if (video.vector_embedding) return <span className="px-2 py-0.5 text-xs rounded-pill bg-primary/20 text-primary border border-primary/30">Scored</span>;
    if (video.transcript_status === "ok") return <span className="px-2 py-0.5 text-xs rounded-pill bg-success/20 text-success border border-success/30">Transcript Ready</span>;
    if (video.transcript_status === "no_transcript_found") return <span className="px-2 py-0.5 text-xs rounded-pill bg-warning/20 text-warning border border-warning/30">No Transcript</span>;
    return <span className="px-2 py-0.5 text-xs rounded-pill bg-muted/20 text-muted border border-muted/30">Pending</span>;
  };

  return (
    <div className={`bg-surface-dark-elevated border rounded-lg p-5 transition-colors ${selected ? "border-primary" : "border-surface-dark-soft hover:border-muted/30"}`}>
      <div className="flex items-start gap-3 mb-3">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-surface-dark-soft bg-surface-dark-elevated"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-on-dark font-medium text-sm leading-snug line-clamp-2 flex-1">{video.title}</h3>
            {statusBadge()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-soft mb-4">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(video.duration_seconds)}</span>
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(video.view_count)}</span>
        <span className="text-muted">{video.source_channel}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleScore}
          disabled={scoring || !video.transcript}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-active disabled:bg-surface-dark-soft disabled:text-muted-soft text-on-primary text-xs font-medium rounded-md transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {scoring ? "Scoring..." : "Score with AI"}
        </button>

        <a
          href={video.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-dark-soft hover:bg-surface-dark-elevated text-on-dark-soft text-xs font-medium rounded-md transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Source
        </a>

        {video.transcript && (
          <button
            onClick={() => setShowTranscript(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-dark-soft hover:bg-surface-dark-elevated text-on-dark-soft text-xs font-medium rounded-md transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Transcript
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-2 py-1.5 text-muted-soft hover:text-error transition-colors ml-auto"
          title="Delete video"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {segments.length > 0 && (
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="flex items-center gap-1.5 px-3 py-1.8 bg-surface-dark-soft hover:bg-surface-dark-elevated text-on-dark-soft text-xs font-medium rounded-md transition-colors ml-auto"
          >
            {showInsights ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Insights ({segments.length})
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      {showInsights && segments.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-surface-dark-soft pt-4">
          {segments.map((seg, i) => (
            <SegmentCard key={i} segment={seg} videoUrl={video.video_url} />
          ))}
        </div>
      )}

      {showTranscript && (
        <TranscriptModal videoId={video.video_id} onClose={() => setShowTranscript(false)} />
      )}
    </div>
  );
}
