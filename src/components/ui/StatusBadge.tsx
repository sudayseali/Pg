import { AlertTriangle, CheckCircle2, Clock, PauseCircle, ShieldAlert, XCircle } from 'lucide-react';

type Tone = 'emerald' | 'amber' | 'red' | 'blue' | 'slate';

const STATUS_MAP: Record<string, { label: string; tone: Tone; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', tone: 'emerald', icon: CheckCircle2 },
  approved: { label: 'Approved', tone: 'emerald', icon: CheckCircle2 },
  resolved: { label: 'Resolved', tone: 'emerald', icon: CheckCircle2 },
  success: { label: 'Success', tone: 'emerald', icon: CheckCircle2 },
  valid: { label: 'Valid', tone: 'emerald', icon: CheckCircle2 },
  completed: { label: 'Completed', tone: 'blue', icon: CheckCircle2 },
  credited: { label: 'Credited', tone: 'emerald', icon: CheckCircle2 },
  pending: { label: 'Pending', tone: 'amber', icon: Clock },
  open: { label: 'Open', tone: 'amber', icon: AlertTriangle },
  investigating: { label: 'Investigating', tone: 'blue', icon: Clock },
  paused: { label: 'Paused', tone: 'slate', icon: PauseCircle },
  inactive: { label: 'Inactive', tone: 'slate', icon: PauseCircle },
  archived: { label: 'Archived', tone: 'slate', icon: PauseCircle },
  rejected: { label: 'Rejected', tone: 'red', icon: XCircle },
  suspended: { label: 'Suspended', tone: 'red', icon: ShieldAlert },
  reversed: { label: 'Reversed', tone: 'red', icon: XCircle },
  failed: { label: 'Failed', tone: 'red', icon: XCircle },
  error: { label: 'Error', tone: 'red', icon: XCircle },
};

const TONE_CLASSES: Record<Tone, string> = {
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  amber: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  red: 'text-red-400 bg-red-500/10 border-red-500/25',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  slate: 'text-slate-300 bg-slate-800/80 border-slate-700',
};

export function StatusBadge({
  status,
  labelOverride,
}: {
  status: string | null | undefined;
  labelOverride?: string;
}) {
  const key = (status ?? 'unknown').toLowerCase();
  const mapped = STATUS_MAP[key] ?? {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown',
    tone: 'slate' as Tone,
    icon: Clock,
  };
  const Icon = mapped.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[mapped.tone]}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{labelOverride ?? mapped.label}</span>
    </span>
  );
}
