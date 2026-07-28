"use client";

import { useState } from "react";
import { Copy, Check, Play, Download, Loader2 } from "lucide-react";
import { ViralSegment, getTimestampUrl, exportClip } from "@/lib/api";

interface SegmentCardProps {
  segment: ViralSegment;
  videoUrl: string;
}

export default function SegmentCard({ segment, videoUrl }: SegmentCardProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const copyCaption = async () => {
    await navigator.clipboard.writeText(segment.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const result = await exportClip(videoUrl, segment.start_time, segment.end_time);
      if (result.error) {
        setExportError(result.error);
      } else if (result.filename) {
        window.open(`http://localhost:8000/exports/${result.filename}`, "_blank");
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const labelColor = () => {
    switch (segment.label) {
      case "Hook": return "bg-accent-amber/20 text-accent-amber border-accent-amber/30";
      case "Controversial": return "bg-error/20 text-error border-error/30";
      case "Insight": return "bg-accent-teal/20 text-accent-teal border-accent-teal/30";
      case "Vulnerable": return "bg-primary/20 text-primary border-primary/30";
      default: return "bg-muted/20 text-muted border-muted/30";
    }
  };

  const scoreColor = () => {
    if (segment.viral_score >= 80) return "text-success";
    if (segment.viral_score >= 60) return "text-accent-amber";
    return "text-primary";
  };

  return (
    <div className="bg-surface-dark-soft rounded-lg p-4 border border-surface-dark-elevated/50 overflow-hidden">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${scoreColor()}`}>{segment.viral_score}</span>
          <span className="text-xs text-muted-soft">/100</span>
          <span className={`px-2 py-0.5 text-xs rounded-pill border ${labelColor()}`}>{segment.label}</span>
          {segment.heatmap_score > 0.4 && (
            <span className="px-2 py-0.5 text-xs rounded-pill bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
              Most Replayed ({Math.round(segment.heatmap_score * 100)}%)
            </span>
          )}
        </div>
        <span className="text-xs text-muted-soft">{segment.start_time} - {segment.end_time}</span>
      </div>

      <p className="text-sm text-on-dark-soft mb-2 break-words">{segment.reasoning}</p>

      <div className="bg-surface-dark rounded-lg p-3 mb-3 overflow-hidden">
        <p className="text-xs text-muted mb-1">Caption</p>
        <p className="text-sm text-on-dark leading-relaxed break-words">{segment.caption}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={copyCaption}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-dark-elevated hover:bg-surface-dark-soft text-on-dark text-xs font-medium rounded-md transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy Caption"}
        </button>

        <a
          href={getTimestampUrl(videoUrl, segment.start_time)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium rounded-md transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Watch Highlight
        </a>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-teal/20 hover:bg-accent-teal/30 text-accent-teal text-xs font-medium rounded-md transition-colors"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {exporting ? "Exporting..." : "Export Clip"}
        </button>
      </div>

      {exportError && <p className="mt-2 text-xs text-error">{exportError}</p>}
    </div>
  );
}
