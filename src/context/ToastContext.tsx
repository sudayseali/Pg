import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const borderColor =
            toast.variant === 'success'
              ? 'border-emerald-500/40 bg-[#0B1120]'
              : toast.variant === 'error'
                ? 'border-red-500/40 bg-[#0B1120]'
                : 'border-blue-500/40 bg-[#0B1120]';

          return (
            <div
              key={toast.id}
              role="status"
              className={`flex items-start gap-3 rounded-lg border p-3.5 shadow-xl ${borderColor}`}
            >
              {toast.variant === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : toast.variant === 'error' ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs text-slate-400">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return ctx;
}
