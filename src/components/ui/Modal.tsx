import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
  busy?: boolean;
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidthClass = 'max-w-lg',
  busy = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#03060E]/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700/80 bg-[#0B1120] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/90 bg-[#080D1A] px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-base font-semibold tracking-tight text-slate-100">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg border border-transparent p-1.5 text-slate-400 transition-colors hover:border-slate-800 hover:bg-slate-800/80 hover:text-slate-100 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
