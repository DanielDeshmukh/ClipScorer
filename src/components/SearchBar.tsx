"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, ExternalLink, Filter, ChevronDown } from "lucide-react";
import { searchVideos, SearchResult, SearchFilters } from "@/lib/api";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  const doSearch = useCallback(async (q: string, f?: SearchFilters) => {
    if (!q.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchVideos(q, 10, f);
      setResults(data.results);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query, filters), 400);
    return () => clearTimeout(timer);
  }, [query, filters, doSearch]);

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search viral clips semantically..."
          className="w-full pl-10 pr-20 py-3 bg-surface-dark-elevated border border-surface-dark-soft rounded-lg text-on-dark placeholder-muted-soft focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-md transition-colors ${showFilters ? "bg-primary/20 text-primary" : "text-muted-soft hover:text-on-dark"}`}
          >
            <Filter className="w-4 h-4" />
          </button>
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setShowResults(false); setFilters({}); }}
              className="p-1.5 text-muted-soft hover:text-on-dark"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mt-2 p-3 bg-surface-dark-elevated border border-surface-dark-soft rounded-lg">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-soft">Score:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={filters.min_score ?? 0}
                onChange={(e) => setFilters((f) => ({ ...f, min_score: Number(e.target.value) }))}
                className="w-14 px-2 py-1 bg-surface-dark border border-surface-dark-soft rounded text-on-dark text-center focus:outline-none focus:border-primary"
              />
              <span className="text-muted-soft">-</span>
              <input
                type="number"
                min={0}
                max={100}
                value={filters.max_score ?? 100}
                onChange={(e) => setFilters((f) => ({ ...f, max_score: Number(e.target.value) }))}
                className="w-14 px-2 py-1 bg-surface-dark border border-surface-dark-soft rounded text-on-dark text-center focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-soft">Label:</span>
              <select
                value={filters.label ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, label: e.target.value }))}
                className="px-2 py-1 bg-surface-dark border border-surface-dark-soft rounded text-on-dark focus:outline-none focus:border-primary"
              >
                <option value="">All</option>
                <option value="Hook">Hook</option>
                <option value="Controversial">Controversial</option>
                <option value="Insight">Insight</option>
                <option value="Vulnerable">Vulnerable</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-soft cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.heatmap_only ?? false}
                onChange={(e) => setFilters((f) => ({ ...f, heatmap_only: e.target.checked }))}
                className="w-3.5 h-3.5 rounded border-surface-dark bg-surface-dark-elevated"
              />
              Most Replayed
            </label>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute mt-1 w-full bg-surface-dark-elevated border border-surface-dark-soft rounded-lg overflow-hidden z-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 border-b border-surface-dark-soft last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-3.5 bg-surface-dark-soft rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-surface-dark-soft rounded animate-pulse w-1/3" />
                </div>
                <div className="ml-3 h-4 w-8 bg-surface-dark-soft rounded animate-pulse" />
              </div>
            </div>
          ))}
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
