"use client";

import { useState, useEffect } from "react";
import { X, Download, ExternalLink, Copy, Check, Loader2 } from "lucide-react";

const API_URL = "";

interface PlatformInfo {
  url: string;
  method: string;
  label: string;
  instructions?: string;
}

interface ShareData {
  caption: string;
  platforms: Record<string, PlatformInfo>;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  segmentId: number;
  videoUrl: string;
  startTime: string;
  endTime: string;
  caption: string;
  label: string;
  title: string;
  videoId: string;
}

const PLATFORM_META: Record<string, { icon: string; bg: string; hover: string; text: string }> = {
  youtube: { icon: "▶", bg: "bg-red-600", hover: "hover:bg-red-700", text: "text-white" },
  tiktok: { icon: "♪", bg: "bg-black", hover: "hover:bg-gray-800", text: "text-white" },
  instagram: { icon: "📷", bg: "bg-gradient-to-br from-purple-600 to-pink-500", hover: "hover:opacity-90", text: "text-white" },
  x: { icon: "𝕏", bg: "bg-blue-500", hover: "hover:bg-blue-600", text: "text-white" },
};

export default function ShareModal({
  isOpen,
  onClose,
  segmentId,
  videoUrl,
  startTime,
  endTime,
  caption,
  label,
  title,
  videoId,
}: ShareModalProps) {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      generateLinks();
    }
  }, [isOpen, caption, label, videoUrl]);

  const generateLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: videoUrl,
          start_time: startTime,
          end_time: endTime,
          caption,
          label,
          title,
          video_id: videoId,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate share links");
      const data = await res.json();
      setShareData(data);
      if (data.export_filename) {
        setDownloadUrl(`${API_URL}/exports/${data.export_filename}`);
        setExported(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate share links");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: videoUrl, start_time: startTime, end_time: endTime }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.filename) {
        setDownloadUrl(`${API_URL}/exports/${data.filename}`);
        setExported(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const copyCaption = async () => {
    const text = shareData?.caption || caption;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlatformClick = (platform: string, info: PlatformInfo) => {
    if (info.method === "link") {
      window.open(info.url, "_blank", "noopener,noreferrer");
    } else {
      setActivePlatform(platform);
      if (downloadUrl) {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `clip_${videoId}_${startTime.replace(":", "")}-${endTime.replace(":", "")}.mp4`;
        a.click();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-dark-soft rounded-xl border border-surface-dark-elevated w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-dark-elevated">
          <div>
            <h3 className="text-lg font-semibold text-on-dark">Share Clip</h3>
            <p className="text-xs text-muted-soft mt-0.5">{startTime} - {endTime} · {label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-dark-elevated text-muted-soft hover:text-on-dark transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-soft">Generating share links...</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {error}
            </div>
          )}

          {shareData && !loading && (
            <>
              <div className="bg-surface-dark rounded-lg p-3">
                <p className="text-xs text-muted mb-1">Caption</p>
                <p className="text-sm text-on-dark leading-relaxed whitespace-pre-wrap">{shareData.caption}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyCaption}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-dark-elevated hover:bg-surface-dark text-on-dark text-xs font-medium rounded-md transition-colors flex-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Caption"}
                </button>

                {!exported ? (
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-teal/20 hover:bg-accent-teal/30 text-accent-teal text-xs font-medium rounded-md transition-colors flex-1"
                  >
                    {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {exporting ? "Exporting..." : "Export Clip"}
                  </button>
                ) : (
                  <a
                    href={downloadUrl || "#"}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-success/20 hover:bg-success/30 text-success text-xs font-medium rounded-md transition-colors flex-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Again
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted font-medium uppercase tracking-wide">Share to</p>
                {Object.entries(shareData.platforms).map(([platform, info]) => {
                  const meta = PLATFORM_META[platform];
                  return (
                    <div key={platform} className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlatformClick(platform, info)}
                        disabled={info.method === "download" && !exported}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 ${meta.bg} ${meta.hover} ${meta.text} ${info.method === "download" && !exported ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <span className="text-lg">{meta.icon}</span>
                        <span className="flex-1 text-left">{info.label}</span>
                        {info.method === "link" ? (
                          <ExternalLink className="w-4 h-4 opacity-60" />
                        ) : (
                          <Download className="w-4 h-4 opacity-60" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {activePlatform && shareData.platforms[activePlatform]?.instructions && (
                <div className="p-3 rounded-lg bg-accent-amber/10 border border-accent-amber/20">
                  <p className="text-xs font-medium text-accent-amber mb-1">Next steps</p>
                  <p className="text-xs text-on-dark-soft leading-relaxed">
                    {shareData.platforms[activePlatform].instructions}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-surface-dark-elevated">
          <button
            onClick={onClose}
            className="w-full py-2 bg-surface-dark-elevated hover:bg-surface-dark text-on-dark-soft text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
