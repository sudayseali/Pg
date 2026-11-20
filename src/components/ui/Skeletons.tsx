export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-slate-800/60">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-12 items-center gap-4 px-5 py-4">
          {Array.from({ length: cols }).map((__, colIdx) => (
            <div
              key={colIdx}
              className={`h-3.5 animate-pulse rounded bg-slate-800/70 ${
                colIdx === 0 ? 'col-span-3' : 'col-span-2'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="fintech-card rounded-xl p-5">
          <div className="h-3 w-28 animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-7 w-32 animate-pulse rounded bg-slate-800" />
          <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-800/70" />
        </div>
      ))}
    </div>
  );
}
