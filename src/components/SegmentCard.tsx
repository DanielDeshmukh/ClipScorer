"use client";

import { useState } from "react";
import { Copy, Check, Play } from "lucide-react";
import { ViralSegment, getTimestampUrl } from "@/lib/api";

interface SegmentCardProps {
  segment: ViralSegment;
  videoUrl: string;
}

export default function SegmentCard({ segment, videoUrl }: SegmentCardProps) {
  const [copied, setCopied] = useState(false);

  const copyCaption = async () => {
    await navigator.clipboard.writeText(segment.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const labelColor = () => {
    switch (segment.label) {
      case "Hook": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "Controversial": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Insight": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Vulnerable": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const scoreColor = () => {
    if (segment.viral_score >= 80) return "text-green-400";
    if (segment.viral_score >= 60) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{segment.viral_score}</span>
          <span className="text-xs text-gray-500">/100</span>
          <span className={`px-2 py-0.5 text-xs rounded-full border ${labelColor()}`}>{segment.label}</span>
        </div>
        <span className="text-xs text-gray-500">{segment.start_time} - {segment.end_time}</span>
      </div>

      <p className="text-sm text-gray-300 mb-2">{segment.reasoning}</p>

      <div className="bg-gray-900 rounded-lg p-3 mb-3">
        <p className="text-xs text-gray-500 mb-1">Caption</p>
        <p className="text-sm text-white leading-relaxed">{segment.caption}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={copyCaption}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy Caption"}
        </button>

        <a
          href={getTimestampUrl(videoUrl, segment.start_time)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium rounded-lg transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Watch Highlight
        </a>
      </div>
    </div>
  );
}
