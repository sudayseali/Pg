import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/adminApi';
import { hasPermission } from '../lib/rbac';
import { formatDateTime } from '../lib/formatters';
import { AccessDenied } from '../components/ui/AccessDenied';
import { Pagination } from '../components/ui/Pagination';
import { TableSkeleton } from '../components/ui/Skeletons';
import type { AuditLogEntry } from '../types/admin';

export function AuditLogsPage() {
  const { admin } = useAuth();
  const { pushToast } = useToast();

  const permitted = hasPermission(admin?.role, 'view_audit_logs');
  const [page, setPage] = useState(1);
  const limit = 25;
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const loadLogs = useCallback(async () => {
    if (!permitted) return;
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs({ page, limit });
      setLogs(res.logs ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load audit logs',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [permitted, page, pushToast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  if (!permitted) {
    return <AccessDenied role={admin?.role} required="Immutable Audit Logs" />;
  }

  function toggleRow(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Immutable Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-400">
          Read-only cryptographic trail of all administrative mutations across Payvora.
        </p>
      </div>

      <div className="fintech-card overflow-hidden rounded-xl">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : logs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No audit log entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800/80 bg-[#060913] text-xs font-medium text-slate-400">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Administrator</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => {
                  const expanded = Boolean(expandedIds[log.id]);
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleRow(log.id)}
                            aria-expanded={expanded}
                            aria-label={`Toggle details for ${log.action}`}
                            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-300">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-200">
                          {log.admin_email || log.admin_id || 'System'}
                          {log.admin_role ? ` · ${log.admin_role}` : ''}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">
                          {log.target_type || '—'}
                          {log.target_id ? `:${log.target_id}` : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-slate-400">
                          {formatDateTime(log.created_at)}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-[#060913]/80">
                          <td colSpan={5} className="px-6 py-4">
                            <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-[#060913] p-3 font-mono text-xs text-slate-300">
                              {JSON.stringify(log.details ?? {}, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          disabled={loading}
        />
      </div>
    </div>
  );
}
