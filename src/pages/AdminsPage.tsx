import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/adminApi';
import { canModifyAdmin, hasPermission, ROLE_LABELS } from '../lib/rbac';
import { formatDateTime } from '../lib/formatters';
import { AccessDenied } from '../components/ui/AccessDenied';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeletons';
import type { AdminRole, AdminTeamMember } from '../types/admin';

const ROLES: AdminRole[] = [
  'super_admin',
  'admin',
  'finance_admin',
  'finance',
  'moderator',
  'support',
];

export function AdminsPage() {
  const { admin } = useAuth();
  const { pushToast } = useToast();

  const permitted = hasPermission(admin?.role, 'manage_admins');
  const [admins, setAdmins] = useState<AdminTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<AdminTeamMember | null>(null);
  const [nextRole, setNextRole] = useState<AdminRole>('admin');
  const [nextStatus, setNextStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [saving, setSaving] = useState(false);

  const loadAdmins = useCallback(async () => {
    if (!permitted) return;
    setLoading(true);
    try {
      const res = await adminApi.getAdmins();
      setAdmins(res.admins ?? []);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load admin team',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [permitted, pushToast]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  if (!permitted) {
    return <AccessDenied role={admin?.role} required="Admin Team Management" />;
  }

  async function handleSaveRole() {
    if (!target || saving) return;
    const guard = canModifyAdmin(admin, target, nextRole, nextStatus);
    if (!guard.allowed) {
      pushToast({
        variant: 'error',
        title: 'Action blocked',
        description: guard.reason,
      });
      return;
    }

    setSaving(true);
    try {
      await adminApi.updateAdminRole({
        targetAdminId: target.id,
        role: nextRole,
        status: nextStatus,
      });
      pushToast({
        variant: 'success',
        title: 'Administrator updated',
        description: `${target.email} is now ${ROLE_LABELS[nextRole]} (${nextStatus}).`,
      });
      setTarget(null);
      await loadAdmins();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const guardCheck = target ? canModifyAdmin(admin, target, nextRole, nextStatus) : { allowed: true };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Admin Team & Roles</h1>
        <p className="mt-1 text-sm text-slate-400">
          Super Admin governance over <span className="font-mono">public.admin_users</span> roles
          and active standing.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : admins.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No administrator accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800/80 bg-[#0B1122] text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-5 py-3">Administrator</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Last Login</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {admins.map((member) => {
                  const isMe =
                    (admin?.id && admin.id === member.id) ||
                    admin?.email.toLowerCase() === member.email.toLowerCase();
                  return (
                    <tr key={member.id} className="hover:bg-slate-800/30">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-100">
                          {member.full_name || member.email}
                          {isMe ? (
                            <span className="ml-2 text-xs text-blue-400">(You)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-400">{member.email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-200">
                        {ROLE_LABELS[member.role] ?? member.role}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-400">
                        {formatDateTime(member.last_login_at || member.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setTarget(member);
                            setNextRole(member.role);
                            setNextStatus(member.status);
                          }}
                          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                        >
                          Edit Role
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(target)}
        title="Modify Administrator Role"
        subtitle={target?.email}
        onClose={() => setTarget(null)}
        busy={saving}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="adm-role" className="mb-1 block text-xs font-medium text-slate-300">
              Assigned Role
            </label>
            <select
              id="adm-role"
              value={nextRole}
              onChange={(e) => setNextRole(e.target.value as AdminRole)}
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 text-sm text-slate-100"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="adm-status" className="mb-1 block text-xs font-medium text-slate-300">
              Account Status
            </label>
            <select
              id="adm-status"
              value={nextStatus}
              onChange={(e) =>
                setNextStatus(e.target.value as 'active' | 'inactive' | 'suspended')
              }
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 text-sm text-slate-100"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {!guardCheck.allowed ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {guardCheck.reason}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setTarget(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !guardCheck.allowed}
              onClick={() => void handleSaveRole()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
