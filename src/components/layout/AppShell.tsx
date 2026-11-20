import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
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
import { BrandMark } from '../ui/BrandMark';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

function getInitials(nameOrEmail: string): string {
  const clean = nameOrEmail.trim();
  if (!clean) return 'PA';
  const parts = clean.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { admin, stats, openDisputesCount, signOut, refreshAdminData } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const navGroups: NavGroup[] = [
    {
      heading: 'Operations',
      items: [
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
      ],
    },
    {
      heading: 'Risk & Customers',
      items: [
        { path: '/users', label: 'Users & Wallets', icon: Users },
        { path: '/security', label: 'Anti-Fraud & VPN', icon: Shield },
      ],
    },
    {
      heading: 'Governance',
      items: [
        { path: '/settings', label: 'Settings', icon: Settings },
        { path: '/audit-logs', label: 'Audit Logs', icon: FileText },
        { path: '/admins', label: 'Admin Team', icon: UserCog },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessRoute(admin?.role, item.path)),
    }))
    .filter((group) => group.items.length > 0);

  const allVisibleItems = visibleGroups.flatMap((g) => g.items);
  const currentTitle =
    allVisibleItems.find((item) => item.path === location.pathname)?.label ?? 'Console';

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAdminData();
    } finally {
      setRefreshing(false);
    }
  }

  const displayName = admin?.fullName || admin?.full_name || admin?.email || 'Administrator';
  const initials = getInitials(displayName);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between border-r border-slate-800/80 bg-[#080C17]">
      <div>
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" />
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-slate-100 whitespace-nowrap">
                Payvora
              </span>
              <span className="block text-[11px] font-medium text-slate-400 whitespace-nowrap">
                Operations Console
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Primary Sidebar" className="space-y-5 p-3.5">
          {visibleGroups.map((group) => (
            <div key={group.heading}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-slate-500">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? 'border border-blue-500/30 bg-blue-600/15 text-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                            : 'border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                        }`
                      }
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.badge === 'number' && item.badge > 0 ? (
                        <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-amber-300">
                          {item.badge}
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-slate-800/80 p-3.5">
        <div className="fintech-card rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#060913] font-mono text-xs font-semibold text-blue-300">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-100">{displayName}</p>
              <p className="truncate text-[11px] text-slate-400">{admin?.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
            <span className="rounded-md border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-300 whitespace-nowrap">
              {admin?.role ? ROLE_LABELS[admin.role] : 'Unknown'}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap"
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
    <div className="flex min-h-screen bg-[#060913] text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden w-[264px] shrink-0 lg:block">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[85vw]">{sidebarContent}</aside>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-800/80 bg-[#060913]/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#0B1120] text-slate-300 hover:text-white lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-500 sm:inline">Payvora</span>
              <span className="hidden text-slate-700 sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold tracking-tight text-slate-100">
                {currentTitle}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {admin?.role ? (
              <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                {ROLE_LABELS[admin.role]}
              </span>
            ) : null}
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0B1120] px-3 py-1.5 text-xs font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-slate-700 hover:bg-slate-800/80 disabled:opacity-50 whitespace-nowrap shrink-0"
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
