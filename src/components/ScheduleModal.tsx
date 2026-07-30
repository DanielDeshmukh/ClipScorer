"use client";

import { useState } from "react";
import { X, Calendar, Loader2, Check } from "lucide-react";
import { schedulePost } from "@/lib/api";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  segmentId: number;
  videoId: string;
  caption: string;
}

const PLATFORMS = [
  { id: "youtube", name: "YouTube Shorts", color: "bg-red-600" },
  { id: "tiktok", name: "TikTok", color: "bg-black" },
  { id: "instagram", name: "Instagram Reels", color: "bg-gradient-to-br from-purple-600 to-pink-500" },
  { id: "x", name: "X (Twitter)", color: "bg-blue-500" },
];

export default function ScheduleModal({ isOpen, onClose, segmentId, videoId, caption }: ScheduleModalProps) {
  const [platform, setPlatform] = useState("youtube");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [scheduledCaption, setScheduledCaption] = useState(caption);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSchedule = async () => {
    if (!date) { setError("Pick a date"); return; }
    setLoading(true);
    setError(null);
    try {
      const scheduled_at = `${date}T${time}:00`;
      await schedulePost({ segment_id: segmentId, video_id: videoId, platform, caption: scheduledCaption, scheduled_at });
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-dark-soft rounded-xl border border-surface-dark-elevated w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-dark-elevated">
          <h3 className="text-lg font-semibold text-on-dark">Schedule Post</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-surface-dark-elevated text-muted-soft hover:text-on-dark transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${platform === p.id ? `${p.color} text-white ring-2 ring-white/30` : "bg-surface-dark-elevated text-on-dark-soft hover:bg-surface-dark"}`}
                >{p.name}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-dark rounded-lg border border-surface-dark-elevated text-sm text-on-dark focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-surface-dark rounded-lg border border-surface-dark-elevated text-sm text-on-dark focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">Caption</label>
            <textarea value={scheduledCaption} onChange={(e) => setScheduledCaption(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-surface-dark rounded-lg border border-surface-dark-elevated text-sm text-on-dark placeholder-muted-soft focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          <button onClick={handleSchedule} disabled={loading || done}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${done ? "bg-success text-white" : "bg-primary hover:bg-primary-active text-on-primary"}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            {done ? "Scheduled!" : loading ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
