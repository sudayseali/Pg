import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/adminApi';
import { hasPermission } from '../lib/rbac';
import {
  formatDateTime,
  formatUsd,
  truncateMiddle,
  validateRejectReason,
} from '../lib/formatters';
import { AccessDenied } from '../components/ui/AccessDenied';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CopyButton } from '../components/ui/CopyButton';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeletons';
import type { WithdrawalRecord } from '../types/admin';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

export function WithdrawalsPage() {
  const { admin, refreshAdminData } = useAuth();
  const { pushToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<WithdrawalRecord | null>(null);
  const [txHash, setTxHash] = useState('');
  const [approveNote, setApproveNote] = useState('');

  const [rejectTarget, setRejectTarget] = useState<WithdrawalRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const permitted = hasPermission(admin?.role, 'manage_withdrawals');

  const fetchWithdrawals = useCallback(async () => {
    if (!permitted) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getWithdrawals({ status: statusFilter, page, limit });
      setWithdrawals(res.withdrawals ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load withdrawals.');
    } finally {
      setLoading(false);
    }
  }, [permitted, statusFilter, page]);

  useEffect(() => {
    void fetchWithdrawals();
  }, [fetchWithdrawals]);

  if (!permitted) {
    return <AccessDenied role={admin?.role} required="Withdrawals Management" />;
  }

  async function handleApprove() {
    if (!approveTarget || submitting) return;
    setSubmitting(true);
    try {
      await adminApi.approveWithdrawal({
        withdrawalId: approveTarget.id,
        txHash: txHash.trim() || undefined,
        note: approveNote.trim() || undefined,
      });
      pushToast({
        variant: 'success',
        title: 'Withdrawal approved',
        description: `Payout of ${formatUsd(approveTarget.amount)} marked approved and Telegram notification sent.`,
      });
      setApproveTarget(null);
      setTxHash('');
      setApproveNote('');
      await Promise.all([fetchWithdrawals(), refreshAdminData()]);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Approval failed',
        description: err instanceof Error ? err.message : 'Could not approve withdrawal.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget || submitting) return;
    const check = validateRejectReason(rejectReason);
    if (!check.valid) {
      setRejectError(check.error ?? 'Reason is required.');
      return;
    }
    setRejectError(null);
    setSubmitting(true);
    try {
      await adminApi.rejectWithdrawal({
        withdrawalId: rejectTarget.id,
        reason: rejectReason.trim(),
      });
      pushToast({
        variant: 'success',
        title: 'Withdrawal rejected & refunded',
        description: `${formatUsd(rejectTarget.amount)} refunded to user wallet.`,
      });
      setRejectTarget(null);
      setRejectReason('');
      await Promise.all([fetchWithdrawals(), refreshAdminData()]);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Rejection failed',
        description: err instanceof Error ? err.message : 'Could not reject withdrawal.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const tabs: { value: StatusFilter; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All Requests' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Withdrawals Management
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Verify destination addresses, submit settlement hashes, or refund rejected requests.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0B1120] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="fintech-card overflow-hidden rounded-xl">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : withdrawals.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No {statusFilter === 'all' ? '' : statusFilter} withdrawal requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800/80 bg-[#060913] text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Destination Address</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Requested</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {withdrawals.map((w) => {
                  const username = w.username || w.user?.username;
                  const firstName = w.first_name || w.user?.first_name;
                  const tgId = w.telegram_id || w.user?.telegram_id;
                  return (
                    <tr key={w.id} className="hover:bg-slate-800/30">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-100">
                          {username ? `@${username}` : firstName || 'User'}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          TG: {tgId ?? '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-200 whitespace-nowrap">
                        {w.method}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            title={w.destination_address}
                            className="font-mono text-xs text-slate-300"
                          >
                            {truncateMiddle(w.destination_address, 10, 8)}
                          </span>
                          <CopyButton
                            value={w.destination_address}
                            label={`Copy address ${w.destination_address}`}
                          />
                        </div>
                        {w.tx_hash ? (
                          <p className="mt-1 font-mono text-[11px] text-emerald-400">
                            TX: {truncateMiddle(w.tx_hash, 8, 6)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-100">
                        {formatUsd(w.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={w.status} />
                        {w.rejection_reason ? (
                          <p className="mt-1 max-w-[200px] truncate text-xs text-red-400">
                            {w.rejection_reason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-400 whitespace-nowrap">
                        {formatDateTime(w.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {w.status === 'pending' ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setApproveTarget(w);
                                setTxHash('');
                                setApproveNote('');
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectTarget(w);
                                setRejectReason('');
                                setRejectError(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Processed</span>
                        )}
                      </td>
                    </tr>
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

      {/* Approve Modal */}
      <Modal
        open={Boolean(approveTarget)}
        title="Approve Withdrawal Payout"
        subtitle={
          approveTarget
            ? `${formatUsd(approveTarget.amount)} via ${approveTarget.method}`
            : undefined
        }
        onClose={() => setApproveTarget(null)}
        busy={submitting}
      >
        {approveTarget ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-800 bg-[#060913] p-3.5 text-xs">
              <div className="flex items-center justify-between gap-2 text-slate-400">
                <span>Destination Address</span>
                <CopyButton value={approveTarget.destination_address} />
              </div>
              <p className="mt-1 break-all font-mono text-slate-200">
                {approveTarget.destination_address}
              </p>
            </div>

            <div>
              <label
                htmlFor="approve-tx-hash"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Transaction Hash (Optional)
              </label>
              <input
                id="approve-tx-hash"
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x... or TRON tx hash"
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#060913] px-3 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="approve-note"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Internal / User Note (Optional)
              </label>
              <textarea
                id="approve-note"
                rows={2}
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="Processed via Treasury hot wallet"
                className="w-full rounded-lg border border-slate-800 bg-[#060913] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setApproveTarget(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleApprove()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={Boolean(rejectTarget)}
        title="Reject & Refund Withdrawal"
        subtitle={
          rejectTarget
            ? `Refunding ${formatUsd(rejectTarget.amount)} back to user wallet`
            : undefined
        }
        onClose={() => setRejectTarget(null)}
        busy={submitting}
      >
        {rejectTarget ? (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="reject-reason"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Rejection Reason (Minimum 3 characters)
              </label>
              <textarea
                id="reject-reason"
                rows={3}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError(null);
                }}
                placeholder="Invalid TRC20 destination address or failed compliance verification"
                className="w-full rounded-lg border border-slate-800 bg-[#060913] p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
              />
              {rejectError ? <p className="mt-1.5 text-xs text-red-400">{rejectError}</p> : null}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setRejectTarget(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleReject()}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {submitting ? 'Refunding...' : 'Reject & Refund Wallet'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
