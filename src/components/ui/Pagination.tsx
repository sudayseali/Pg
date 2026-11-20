import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
}

export function Pagination({ page, limit, total, onPageChange, disabled }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 bg-[#080D1A]/70 px-5 py-3 text-xs text-slate-400">
      <div className="font-mono tabular-nums">
        Showing <span className="font-medium text-slate-200">{start}</span>–
        <span className="font-medium text-slate-200">{end}</span> of{' '}
        <span className="font-medium text-slate-200">{total}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-800 bg-[#0B1120] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Prev</span>
        </button>
        <span className="px-2.5 font-mono text-xs tabular-nums text-slate-300">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-800 bg-[#0B1120] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
