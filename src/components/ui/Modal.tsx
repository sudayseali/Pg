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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-xl border border-slate-800 bg-[#0F172A] shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-slate-100">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
