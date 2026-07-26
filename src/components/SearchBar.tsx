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
          className="w-full pl-10 pr-10 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {loading && (
        <div className="absolute mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-400 z-10">
          Searching...
        </div>
      )}

      {showResults && !loading && results.length > 0 && (
        <div className="absolute mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden z-10">
          {results.map((r) => (
            <a
              key={r.video_id}
              href={`https://www.youtube.com/watch?v=${r.video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{r.title}</p>
                <p className="text-gray-500 text-xs">{r.source_channel}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-blue-400 text-sm font-medium">{r.match_score}%</span>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </div>
            </a>
          ))}
        </div>
      )}

      {showResults && !loading && results.length === 0 && query && (
        <div className="absolute mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-400 z-10">
          No results found
        </div>
      )}
    </div>
  );
}
