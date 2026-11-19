import type { AdminProfile, AdminRole, Permission } from '../types/admin';

const ALL_PERMISSIONS: Permission[] = [
  'view_dashboard',
  'manage_users',
  'manage_balances',
  'manage_tasks',
  'review_submissions',
  'manage_withdrawals',
  'view_transactions',
  'manage_settings',
  'view_audit_logs',
  'manage_admins',
];

export const ROLE_PERMISSION_MATRIX: Record<AdminRole, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter((perm) => perm !== 'manage_admins'),
  finance_admin: [
    'view_dashboard',
    'manage_withdrawals',
    'view_transactions',
    'manage_balances',
    'view_audit_logs',
  ],
  finance: [
    'view_dashboard',
    'manage_withdrawals',
    'view_transactions',
    'manage_balances',
    'view_audit_logs',
  ],
  moderator: ['view_dashboard', 'manage_tasks', 'review_submissions', 'manage_users'],
  support: ['view_dashboard', 'manage_users', 'review_submissions', 'manage_tasks'],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  finance_admin: 'Finance Admin',
  finance: 'Finance',
  moderator: 'Moderator',
  support: 'Support',
};

export function hasPermission(role: AdminRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSION_MATRIX[role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function hasAnyPermission(
  role: AdminRole | undefined | null,
  permissions: Permission[],
): boolean {
  if (!role) return false;
  return permissions.some((p) => hasPermission(role, p));
}

export interface NavRouteRule {
  path: string;
  label: string;
  requiredAny: Permission[];
}

export const ROUTE_RULES: NavRouteRule[] = [
  { path: '/', label: 'Overview', requiredAny: ['view_dashboard'] },
  { path: '/withdrawals', label: 'Withdrawals', requiredAny: ['manage_withdrawals'] },
  { path: '/tasks', label: 'Tasks & Proofs', requiredAny: ['manage_tasks', 'review_submissions'] },
  {
    path: '/offers',
    label: 'Offers Marketplace',
    requiredAny: ['view_dashboard', 'manage_settings', 'review_submissions'],
  },
  { path: '/users', label: 'Users & Wallets', requiredAny: ['manage_users', 'manage_balances'] },
  { path: '/security', label: 'Anti-Fraud & VPN', requiredAny: ['manage_settings'] },
  { path: '/settings', label: 'Settings', requiredAny: ['manage_settings'] },
  { path: '/audit-logs', label: 'Audit Logs', requiredAny: ['view_audit_logs'] },
  { path: '/admins', label: 'Admin Team', requiredAny: ['manage_admins'] },
];

export function canAccessRoute(role: AdminRole | undefined | null, path: string): boolean {
  const rule = ROUTE_RULES.find((r) => r.path === path);
  if (!rule) return false;
  return hasAnyPermission(role, rule.requiredAny);
}

export function canModifyAdmin(
  currentAdmin: Pick<AdminProfile, 'id' | 'email' | 'role'> | null | undefined,
  targetAdmin: { id: string; email: string },
  nextRole: AdminRole,
  nextStatus: 'active' | 'inactive' | 'suspended',
): { allowed: boolean; reason?: string } {
  if (!currentAdmin || !hasPermission(currentAdmin.role, 'manage_admins')) {
    return { allowed: false, reason: 'Only super admins can modify team roles or status.' };
  }

  const isSelf =
    (currentAdmin.id && currentAdmin.id === targetAdmin.id) ||
    currentAdmin.email.toLowerCase() === targetAdmin.email.toLowerCase();

  if (isSelf) {
    if (nextRole !== 'super_admin') {
      return { allowed: false, reason: 'Self-demotion is prohibited.' };
    }
    if (nextStatus !== 'active') {
      return { allowed: false, reason: 'Self-suspension or deactivation is prohibited.' };
    }
  }

  return { allowed: true };
}
