import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ?? `Copy ${value}`}
      title={copied ? 'Copied' : 'Copy to clipboard'}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-800 bg-[#060913] text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-100"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
