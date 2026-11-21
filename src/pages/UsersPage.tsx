import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DollarSign, Search, ShieldAlert, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/adminApi';
import { hasPermission } from '../lib/rbac';
import {
  formatDateTime,
  formatUsd,
  generateIdempotencyKey,
  validateBalanceAdjustment,
} from '../lib/formatters';
import { AccessDenied } from '../components/ui/AccessDenied';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeletons';
import type { AppUser } from '../types/admin';

export function UsersPage() {
  const { admin, refreshAdminData } = useAuth();
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const canManageUsers = hasPermission(admin?.role, 'manage_users');
  const canManageBalances = hasPermission(admin?.role, 'manage_balances');

  const [searchInput, setSearchInput] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [users, setUsers] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qParam = searchParams.get('q') ?? '';
    setSearchInput(qParam);
    setSearchQuery(qParam);
    setPage(1);
  }, [searchParams]);

  // Status modal
  const [statusTarget, setStatusTarget] = useState<AppUser | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Balance adjustment modal
  const [balanceTarget, setBalanceTarget] = useState<AppUser | null>(null);
  const [balanceType, setBalanceType] = useState<'credit' | 'deduct'>('credit');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!canManageUsers && !canManageBalances) return;
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        page,
        limit,
        search: searchQuery || undefined,
      });
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load users',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [canManageUsers, canManageBalances, page, searchQuery, pushToast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  if (!canManageUsers && !canManageBalances) {
    return <AccessDenied role={admin?.role} required="Users & Wallets" />;
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  }

  async function handleToggleStatus() {
    if (!statusTarget || updatingStatus) return;
    const nextStatus = statusTarget.status === 'active' ? 'suspended' : 'active';
    if (!statusReason.trim()) {
      pushToast({
        variant: 'error',
        title: 'Reason required',
        description: 'Provide an audit reason for changing account status.',
      });
      return;
    }

    setUpdatingStatus(true);
    try {
      await adminApi.updateUserStatus({
        userId: statusTarget.id,
        status: nextStatus,
        reason: statusReason.trim(),
      });
      pushToast({
        variant: 'success',
        title: `User ${nextStatus}`,
        description: statusTarget.username ? `@${statusTarget.username}` : statusTarget.id,
      });
      setStatusTarget(null);
      setStatusReason('');
      await loadUsers();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Status update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUpdatingStatus(false);
    }
  }

  function openBalanceModal(u: AppUser) {
    setBalanceTarget(u);
    setBalanceType('credit');
    setBalanceAmount('');
    setBalanceReason('');
    setBalanceError(null);
    setConfirmStep(false);
    setIdempotencyKey(generateIdempotencyKey('bal'));
  }

  async function handleAdjustBalance() {
    if (!balanceTarget || adjusting) return;
    const check = validateBalanceAdjustment(balanceAmount, balanceReason);
    if (!check.valid || check.amount === undefined) {
      setBalanceError(check.error ?? 'Invalid balance adjustment.');
      return;
    }

    if (!confirmStep) {
      setBalanceError(null);
      setConfirmStep(true);
      return;
    }

    setAdjusting(true);
    try {
      await adminApi.adjustUserBalance({
        userId: balanceTarget.id,
        amount: check.amount,
        type: balanceType,
        reason: balanceReason.trim(),
        idempotencyKey,
      });
      pushToast({
        variant: 'success',
        title: `Balance ${balanceType === 'credit' ? 'credited' : 'deducted'}`,
        description: `${formatUsd(check.amount)} ${balanceType === 'credit' ? 'added to' : 'deducted from'} wallet.`,
      });
      setBalanceTarget(null);
      await Promise.all([loadUsers(), refreshAdminData()]);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Balance adjustment failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Users & Wallets</h1>
          <p className="mt-1 text-sm text-slate-400">
            Search Telegram accounts, manage account standing, and execute audited wallet
            adjustments.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Username, first name, or TG ID"
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#0B1120] pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Search
          </button>
        </form>
      </div>

      <div className="overflow-hidden fintech-card rounded-xl">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : users.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No matching users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800/80 bg-[#060913] text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Telegram ID</th>
                  <th className="px-5 py-3 text-right">Wallet Balance</th>
                  <th className="px-5 py-3 text-right">Total Earned</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-100">
                        {u.first_name || 'User'} {u.last_name || ''}
                      </p>
                      <p className="text-xs text-slate-400">
                        {u.username ? `@${u.username}` : u.id.slice(0, 12)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-300">
                      {u.telegram_id ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-100">
                      {formatUsd(u.balance)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono tabular-nums text-slate-400">
                      {formatUsd(u.total_earned ?? 0)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-400">
                      {formatDateTime(u.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {canManageBalances ? (
                          <button
                            type="button"
                            onClick={() => openBalanceModal(u)}
                            className="inline-flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Adjust</span>
                          </button>
                        ) : null}
                        {canManageUsers ? (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusTarget(u);
                              setStatusReason('');
                            }}
                            className={`inline-flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-medium ${
                              u.status === 'active'
                                ? 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                            }`}
                          >
                            {u.status === 'active' ? (
                              <>
                                <ShieldAlert className="h-3.5 w-3.5" />
                                <span>Suspend</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Suspend / Activate Modal */}
      <Modal
        open={Boolean(statusTarget)}
        title={
          statusTarget?.status === 'active' ? 'Suspend User Account' : 'Reactivate User Account'
        }
        subtitle={
          statusTarget
            ? `${statusTarget.username ? `@${statusTarget.username}` : statusTarget.first_name || statusTarget.id}`
            : undefined
        }
        onClose={() => setStatusTarget(null)}
        busy={updatingStatus}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="user-status-reason" className="mb-1.5 block text-xs font-medium text-slate-300">
              Audit Reason
            </label>
            <textarea
              id="user-status-reason"
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Multi-account abuse or manual compliance release"
              className="w-full rounded-lg border border-slate-800 bg-[#060913] p-3 text-sm text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={updatingStatus}
              onClick={() => setStatusTarget(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={updatingStatus}
              onClick={() => void handleToggleStatus()}
              className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                statusTarget?.status === 'active'
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {updatingStatus
                ? 'Updating...'
                : statusTarget?.status === 'active'
                  ? 'Confirm Suspension'
                  : 'Confirm Activation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Balance Adjustment Modal */}
      <Modal
        open={Boolean(balanceTarget)}
        title="Audited Balance Adjustment"
        subtitle={
          balanceTarget
            ? `Current wallet: ${formatUsd(balanceTarget.balance)} · ${
                balanceTarget.username ? `@${balanceTarget.username}` : balanceTarget.id
              }`
            : undefined
        }
        onClose={() => setBalanceTarget(null)}
        busy={adjusting}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={confirmStep}
              onClick={() => setBalanceType('credit')}
              className={`h-10 rounded-lg border text-xs font-semibold transition-colors ${
                balanceType === 'credit'
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-800 bg-[#060913] text-slate-400'
              }`}
            >
              Credit (+ USD)
            </button>
            <button
              type="button"
              disabled={confirmStep}
              onClick={() => setBalanceType('deduct')}
              className={`h-10 rounded-lg border text-xs font-semibold transition-colors ${
                balanceType === 'deduct'
                  ? 'border-red-500/50 bg-red-500/15 text-red-300'
                  : 'border-slate-800 bg-[#060913] text-slate-400'
              }`}
            >
              Deduct (- USD)
            </button>
          </div>

          <div>
            <label htmlFor="bal-amount" className="mb-1 block text-xs font-medium text-slate-300">
              Amount (USD)
            </label>
            <input
              id="bal-amount"
              type="number"
              min="0.01"
              step="0.01"
              disabled={confirmStep}
              value={balanceAmount}
              onChange={(e) => {
                setBalanceAmount(e.target.value);
                setBalanceError(null);
              }}
              placeholder="5.00"
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#060913] px-3 font-mono text-sm text-slate-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="bal-reason" className="mb-1 block text-xs font-medium text-slate-300">
              Mandatory Audit Reason
            </label>
            <textarea
              id="bal-reason"
              rows={2}
              disabled={confirmStep}
              value={balanceReason}
              onChange={(e) => {
                setBalanceReason(e.target.value);
                setBalanceError(null);
              }}
              placeholder="Manual compensation for ticket #1042"
              className="w-full rounded-lg border border-slate-800 bg-[#060913] p-3 text-sm text-slate-100 disabled:opacity-60"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-[#060913] px-3 py-2 font-mono text-[11px] text-slate-400">
            Idempotency Key: {idempotencyKey}
          </div>

          {balanceError ? <p className="text-xs text-red-400">{balanceError}</p> : null}

          {confirmStep ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Confirm {balanceType === 'credit' ? 'crediting' : 'deducting'}{' '}
              <span className="font-mono font-semibold">{formatUsd(balanceAmount)}</span>? This
              entry writes directly to the immutable ledger.
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={adjusting}
              onClick={() => {
                if (confirmStep) setConfirmStep(false);
                else setBalanceTarget(null);
              }}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              {confirmStep ? 'Back' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={adjusting}
              onClick={() => void handleAdjustBalance()}
              className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                balanceType === 'credit'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {adjusting
                ? 'Executing...'
                : confirmStep
                  ? `Execute ${balanceType === 'credit' ? 'Credit' : 'Deduction'}`
                  : 'Review Adjustment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
