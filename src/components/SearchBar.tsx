"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, ExternalLink } from "lucide-react";
import { searchVideos, SearchResult } from "@/lib/api";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchVideos(q);
      setResults(data.results);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search viral clips semantically..."
          className="w-full pl-10 pr-10 py-3 bg-surface-dark-elevated border border-surface-dark-soft rounded-lg text-on-dark placeholder-muted-soft focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft hover:text-on-dark"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {loading && (
        <div className="absolute mt-1 w-full bg-surface-dark-elevated border border-surface-dark-soft rounded-lg p-4 text-muted-soft z-10">
          Searching...
        </div>
      )}

      {showResults && !loading && results.length > 0 && (
        <div className="absolute mt-1 w-full bg-surface-dark-elevated border border-surface-dark-soft rounded-lg overflow-hidden z-10 max-h-96 overflow-y-auto">
          {results.map((r) => (
            <div key={r.video_id} className="border-b border-surface-dark-soft last:border-0">
              <a
                href={`https://www.youtube.com/watch?v=${r.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-dark-soft transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-on-dark text-sm truncate">{r.title}</p>
                  <p className="text-muted-soft text-xs">{r.source_channel}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="text-primary text-sm font-medium">{r.match_score}%</span>
                  <ExternalLink className="w-4 h-4 text-muted" />
                </div>
              </a>
              {r.segments.length > 0 && (
                <div className="px-4 pb-3 space-y-1">
                  {r.segments.slice(0, 2).map((seg) => (
                    <a
                      key={seg.id}
                      href={`https://www.youtube.com/watch?v=${seg.video_id}&t=${seg.start_time.split(":").reduce((a, b) => Number(a) * 60 + Number(b), 0)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-muted-soft hover:text-on-dark transition-colors"
                    >
                      <span className="text-accent-teal font-mono">{seg.start_time}</span>
                      <span className="text-accent-amber">{seg.viral_score}</span>
                      <span className="truncate">{seg.caption}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showResults && !loading && results.length === 0 && query && (
        <div className="absolute mt-1 w-full bg-surface-dark-elevated border border-surface-dark-soft rounded-lg p-4 text-muted-soft z-10">
          No results found
        </div>
      )}
    </div>
  );
}
