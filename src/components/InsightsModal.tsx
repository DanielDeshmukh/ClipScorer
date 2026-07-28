"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Download, Loader2, Check } from "lucide-react";
import { Video, ViralSegment, exportBulk } from "@/lib/api";
import SegmentCard from "./SegmentCard";

interface InsightsModalProps {
  video: Video;
  segments: ViralSegment[];
  onClose: () => void;
}

export default function InsightsModal({ video, segments, onClose }: InsightsModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);

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

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((_, i) => i)));
    }
  };

  const handleBulkExport = async () => {
    setExporting(true);
    setExportResult(null);
    try {
      const items = Array.from(selected).map((i) => ({
        video_url: video.video_url,
        start_time: sorted[i].start_time,
        end_time: sorted[i].end_time,
      }));
      const result = await exportBulk(items);
      setExportResult(`Exported ${result.exported}/${result.total} clips`);
    } catch (e) {
      setExportResult(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-dark/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-dark-elevated border border-surface-dark-soft rounded-lg w-full max-w-xl sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-surface-dark-soft">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="text-on-dark font-medium text-sm truncate">{video.title}</h3>
            <span className="text-xs text-muted-soft flex-shrink-0">({segments.length})</span>
          </div>
          <button onClick={onClose} className="text-muted-soft hover:text-on-dark transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 sm:px-5 py-2 border-b border-surface-dark-soft">
          <button
            onClick={toggleSelectAll}
            className="text-xs text-muted-soft hover:text-on-dark transition-colors"
          >
            {selected.size === sorted.length ? "Deselect All" : "Select All"}
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleBulkExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1 bg-accent-teal hover:opacity-90 text-surface-dark text-xs font-medium rounded-md transition-colors"
            >
              {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {exporting ? "Exporting..." : `Export Selected (${selected.size})`}
            </button>
          )}
          {exportResult && (
            <span className="text-xs text-success flex items-center gap-1">
              <Check className="w-3 h-3" /> {exportResult}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {sorted.map((seg, i) => (
            <SegmentCard
              key={i}
              segment={seg}
              videoUrl={video.video_url}
              selected={selected.has(i)}
              onToggleSelect={() => toggleSelect(i)}
            />
          ))}
        </div>

        <div className="px-3 sm:px-5 py-3 border-t border-surface-dark-soft flex items-center justify-between">
          <span className="text-xs text-muted-soft hidden sm:block">
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
