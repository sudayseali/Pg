import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  CheckSquare,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Shield,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canAccessRoute, ROLE_LABELS } from '../../lib/rbac';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { admin, stats, openDisputesCount, signOut, refreshAdminData } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const navItems: NavItem[] = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    {
      path: '/withdrawals',
      label: 'Withdrawals',
      icon: ArrowUpRight,
      badge: stats?.pendingWithdrawals ?? 0,
    },
    {
      path: '/tasks',
      label: 'Tasks & Proofs',
      icon: CheckSquare,
      badge: stats?.pendingSubmissions ?? 0,
    },
    {
      path: '/offers',
      label: 'Offers Marketplace',
      icon: Layers,
      badge: openDisputesCount,
    },
    { path: '/users', label: 'Users & Wallets', icon: Users },
    { path: '/security', label: 'Anti-Fraud & VPN', icon: Shield },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/audit-logs', label: 'Audit Logs', icon: FileText },
    { path: '/admins', label: 'Admin Team', icon: UserCog },
  ];

  const visibleItems = navItems.filter((item) => canAccessRoute(admin?.role, item.path));
  const currentTitle =
    visibleItems.find((item) => item.path === location.pathname)?.label ?? 'Console';

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAdminData();
    } finally {
      setRefreshing(false);
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0B1122] border-r border-slate-800/90">
      <div>
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
              Payvora Admin
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Primary Sidebar" className="space-y-1 p-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25'
                      : 'text-slate-400 border border-transparent hover:bg-slate-800/60 hover:text-slate-100'
                  }`
                }
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800/80 p-4">
        <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">
                {admin?.fullName || admin?.full_name || admin?.email || 'Administrator'}
              </p>
              <p className="truncate text-xs text-slate-400">{admin?.email}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
            <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300 whitespace-nowrap">
              {admin?.role ? ROLE_LABELS[admin.role] : 'Unknown'}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#070B19] text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[85vw]">{sidebarContent}</aside>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-800/80 bg-[#070B19]/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#0F172A] text-slate-300 hover:text-white lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden text-slate-500 sm:inline">Payvora</span>
              <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold text-slate-100">{currentTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sync Metrics</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
