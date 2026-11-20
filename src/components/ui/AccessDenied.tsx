import { ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_LABELS } from '../../lib/rbac';
import type { AdminRole } from '../../types/admin';

export function AccessDenied({
  role,
  required,
}: {
  role?: AdminRole | null;
  required?: string;
}) {
  return (
    <div className="mx-auto my-12 max-w-lg rounded-xl border border-red-500/25 bg-[#0B1120] p-8 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
        <ShieldOff className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-100">
        Insufficient Permissions (403)
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Your current role ({role ? ROLE_LABELS[role] : 'Unknown'}) does not permit access to{' '}
        {required ?? 'this section'}. Contact a Super Admin if you require elevated privileges.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Return to Overview
        </Link>
      </div>
    </div>
  );
}
