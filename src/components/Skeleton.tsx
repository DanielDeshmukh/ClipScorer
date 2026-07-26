"use client";

export function SkeletonCard() {
  return (
    <div className="bg-surface-dark-elevated border border-surface-dark-soft rounded-lg p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="h-4 bg-surface-dark-soft rounded w-3/4" />
        <div className="h-5 bg-surface-dark-soft rounded-pill w-16" />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="h-3 bg-surface-dark-soft rounded w-12" />
        <div className="h-3 bg-surface-dark-soft rounded w-12" />
        <div className="h-3 bg-surface-dark-soft rounded w-16" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-8 bg-surface-dark-soft rounded-md w-24" />
        <div className="h-8 bg-surface-dark-soft rounded-md w-16" />
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-surface-dark-elevated border border-surface-dark-soft rounded-lg p-4 animate-pulse">
      <div className="h-3 bg-surface-dark-soft rounded w-24 mb-2" />
      <div className="h-7 bg-surface-dark-soft rounded w-12" />
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
