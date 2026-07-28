"use client";

import { useState, useEffect } from "react";
import { X, FileText, Loader2 } from "lucide-react";
import { getVideo, Video } from "@/lib/api";

interface TranscriptModalProps {
  videoId: string;
  onClose: () => void;
}

export default function TranscriptModal({ videoId, onClose }: TranscriptModalProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const data = await getVideo(videoId);
        setVideo(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load transcript");
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [videoId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const formatTimestamp = (line: string) => {
    const match = line.match(/^\[(\d{2}:\d{2})\]/);
    if (match) {
      return (
        <span className="text-accent-teal font-mono text-xs mr-2">{match[1]}</span>
      );
    }
    return null;
  };

  const formatTranscript = (text: string) => {
    return text.split("\n").map((line, i) => (
      <div key={i} className="flex items-start gap-2 py-0.5 hover:bg-surface-dark-elevated/50 rounded">
        {formatTimestamp(line)}
        <span className="text-on-dark-soft">{line.replace(/^\[\d{2}:\d{2}\]\s*/, "")}</span>
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-dark/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-dark-elevated border border-surface-dark-soft rounded-lg w-full max-w-xl sm:max-w-3xl max-h-[85vh] sm:max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-surface-dark-soft">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="text-on-dark font-medium text-sm truncate">
              {video?.title || "Loading..."}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-soft hover:text-on-dark transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-error text-sm">{error}</div>
          ) : video?.transcript ? (
            <div className="text-sm leading-relaxed font-mono whitespace-pre-wrap">
              {formatTranscript(video.transcript)}
            </div>
          ) : (
            <div className="text-center py-12 text-muted text-sm">
              No transcript available for this video
            </div>
          )}
        </div>

        <div className="px-3 sm:px-5 py-3 border-t border-surface-dark-soft flex items-center justify-between">
          <span className="text-xs text-muted-soft">
            {video?.transcript ? `${video.transcript.split("\n").length} lines` : ""}
          </span>
          <a
            href={video?.video_url}
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
