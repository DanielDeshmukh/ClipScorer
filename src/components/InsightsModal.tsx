"use client";

import { useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { Video, ViralSegment } from "@/lib/api";
import SegmentCard from "./SegmentCard";

interface InsightsModalProps {
  video: Video;
  segments: ViralSegment[];
  onClose: () => void;
}

export default function InsightsModal({ video, segments, onClose }: InsightsModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const sorted = [...segments].sort((a, b) => {
    if (a.heatmap_score > 0.4 && b.heatmap_score <= 0.4) return -1;
    if (a.heatmap_score <= 0.4 && b.heatmap_score > 0.4) return 1;
    return b.viral_score - a.viral_score;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-dark/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-dark-elevated border border-surface-dark-soft rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-dark-soft">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-on-dark font-medium text-sm truncate">{video.title}</h3>
            <span className="text-xs text-muted-soft">({segments.length} clips)</span>
          </div>
          <button onClick={onClose} className="text-muted-soft hover:text-on-dark transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {sorted.map((seg, i) => (
            <SegmentCard key={i} segment={seg} videoUrl={video.video_url} />
          ))}
        </div>

        <div className="px-5 py-3 border-t border-surface-dark-soft flex items-center justify-between">
          <span className="text-xs text-muted-soft">
            Sorted by: Most Replayed first, then AI score
          </span>
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary-active transition-colors"
          >
            Watch on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}
