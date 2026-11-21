import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  CheckSquare,
  ChevronDown,
  FileText,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  Shield,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canAccessRoute, ROLE_LABELS } from '../../lib/rbac';
import { formatNumber } from '../../lib/formatters';
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
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const alertsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (alertsRef.current && !alertsRef.current.contains(target)) setAlertsOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(target)) setSearchFocused(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const navGroups: NavGroup[] = [
    {
      heading: 'WORKSPACE',
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
        { path: '/users', label: 'Users & Wallets', icon: Users },
      ],
    },
    {
      heading: 'CONTROL CENTER',
      items: [
        { path: '/security', label: 'Anti-Fraud & VPN', icon: Shield },
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

  const trimmedQuery = searchText.trim();
  const matchingRoutes = trimmedQuery
    ? allVisibleItems.filter((item) =>
        item.label.toLowerCase().includes(trimmedQuery.toLowerCase()),
      )
    : [];
  const canSearchUsers = canAccessRoute(admin?.role, '/users');

  const pendingWithdrawals = stats?.pendingWithdrawals ?? 0;
  const pendingSubmissions = stats?.pendingSubmissions ?? 0;
  const totalAlerts = pendingWithdrawals + pendingSubmissions + openDisputesCount;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAdminData();
    } finally {
      setRefreshing(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmedQuery) return;
    if (matchingRoutes.length > 0 && matchingRoutes[0].label.toLowerCase() === trimmedQuery.toLowerCase()) {
      navigate(matchingRoutes[0].path);
      setSearchText('');
      setSearchFocused(false);
      return;
    }
    if (canSearchUsers) {
      navigate(`/users?q=${encodeURIComponent(trimmedQuery)}`);
      setSearchFocused(false);
    } else if (matchingRoutes.length > 0) {
      navigate(matchingRoutes[0].path);
      setSearchText('');
      setSearchFocused(false);
    }
  }

  const displayName = admin?.fullName || admin?.full_name || admin?.email || 'Administrator';
  const roleLabel = admin?.role ? ROLE_LABELS[admin.role] : 'Unknown Role';
  const initials = getInitials(displayName);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between border-r border-slate-800/75 bg-[#070C1B]">
      <div>
        <div className="flex h-16 items-center justify-between border-b border-slate-800/75 px-5">
          <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
            <BrandMark size="sm" />
            <span className="text-base font-bold tracking-[0.06em] text-slate-50 uppercase whitespace-nowrap">
              PAYVORA
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Primary Sidebar" className="space-y-6 p-3.5">
          {visibleGroups.map((group) => (
            <div key={group.heading}>
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-500">
                {group.heading}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_6px_18px_-4px_rgba(37,99,235,0.55),inset_0_1px_0_rgba(255,255,255,0.22)]'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="flex min-w-0 items-center gap-3">
                            <Icon
                              className={`h-4 w-4 shrink-0 ${
                                isActive ? 'text-white' : 'text-slate-400'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {typeof item.badge === 'number' && item.badge > 0 ? (
                            <span
                              className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-amber-500/90 text-slate-950'
                              }`}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="space-y-2.5 border-t border-slate-800/75 p-3.5">
        <div className="fintech-card rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-600 font-mono text-xs font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.4)]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-100">{roleLabel}</p>
              <p className="truncate text-[11px] text-slate-400">{admin?.email}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-800/90 bg-[#0B1224] px-3 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-800/80 hover:text-white whitespace-nowrap"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#050914] text-slate-100">
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-800/75 bg-[#060B1A]/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#0B1224] text-slate-300 hover:text-white lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <Link
                to="/"
                aria-label="Payvora Home"
                className="hidden text-slate-400 transition-colors hover:text-slate-100 sm:inline-flex"
              >
                <Home className="h-4 w-4" />
              </Link>
              <span className="hidden text-slate-400 sm:inline">Payvora</span>
              <span className="hidden text-slate-600 sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold tracking-tight text-slate-100">
                {currentTitle}
              </span>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            {/* Quick Search / Jump */}
            <div ref={searchRef} className="relative hidden md:block">
              <form onSubmit={handleSearchSubmit}>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search users or console pages"
                  value={searchText}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setSearchFocused(true);
                  }}
                  placeholder="Search pages or users..."
                  className="h-9 w-56 rounded-full border border-slate-800 bg-[#0B1224] pl-9 pr-3.5 text-xs text-slate-100 placeholder:text-slate-500 transition-all focus:w-72 focus:border-blue-500 focus:outline-none"
                />
              </form>

              {searchFocused && trimmedQuery ? (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-slate-800 bg-[#0A1124] p-1.5 shadow-2xl">
                  {matchingRoutes.map((route) => {
                    const Icon = route.icon;
                    return (
                      <button
                        key={route.path}
                        type="button"
                        onClick={() => {
                          navigate(route.path);
                          setSearchText('');
                          setSearchFocused(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800/70"
                      >
                        <Icon className="h-3.5 w-3.5 text-blue-400" />
                        <span>Go to {route.label}</span>
                      </button>
                    );
                  })}
                  {canSearchUsers ? (
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/users?q=${encodeURIComponent(trimmedQuery)}`);
                        setSearchFocused(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-blue-300 hover:bg-blue-600/15"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="truncate">Search users matching &ldquo;{trimmedQuery}&rdquo;</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Live Queue Alerts Popover */}
            <div ref={alertsRef} className="relative">
              <button
                type="button"
                onClick={() => setAlertsOpen((prev) => !prev)}
                aria-label="Open pending operations queues"
                aria-expanded={alertsOpen}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-[#0B1224] text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
              >
                <Bell className="h-4 w-4" />
                {totalAlerts > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[10px] font-bold text-white">
                    {totalAlerts > 99 ? '99+' : totalAlerts}
                  </span>
                ) : null}
              </button>

              {alertsOpen ? (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-slate-800 bg-[#0A1124] p-3 shadow-2xl">
                  <p className="text-xs font-semibold text-slate-100">Pending Review Queues</p>
                  <div className="mt-2.5 divide-y divide-slate-800/80 text-xs">
                    <Link
                      to="/withdrawals"
                      onClick={() => setAlertsOpen(false)}
                      className="flex items-center justify-between py-2 text-slate-300 hover:text-white"
                    >
                      <span>Pending Withdrawals</span>
                      <span className="font-mono font-semibold text-amber-300">
                        {formatNumber(pendingWithdrawals)}
                      </span>
                    </Link>
                    <Link
                      to="/tasks"
                      onClick={() => setAlertsOpen(false)}
                      className="flex items-center justify-between py-2 text-slate-300 hover:text-white"
                    >
                      <span>Pending Proof Reviews</span>
                      <span className="font-mono font-semibold text-sky-300">
                        {formatNumber(pendingSubmissions)}
                      </span>
                    </Link>
                    <Link
                      to="/offers"
                      onClick={() => setAlertsOpen(false)}
                      className="flex items-center justify-between py-2 text-slate-300 hover:text-white"
                    >
                      <span>Open Offer Disputes</span>
                      <span className="font-mono font-semibold text-rose-300">
                        {formatNumber(openDisputesCount)}
                      </span>
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Primary Sync CTA */}
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void handleRefresh()}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-400/25 bg-gradient-to-b from-blue-500 to-blue-600 px-3.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:from-blue-400 hover:to-blue-600 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sync Metrics</span>
            </button>

            {/* Admin Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-label="Administrator account menu"
                aria-expanded={profileMenuOpen}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-800 bg-[#0B1224] pl-1 pr-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-700 hover:text-white"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-600 font-mono text-[11px] font-bold text-white">
                  {initials}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {profileMenuOpen ? (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-800 bg-[#0A1124] p-3 shadow-2xl">
                  <p className="truncate text-xs font-semibold text-slate-100">{displayName}</p>
                  <p className="truncate text-[11px] text-slate-400">{admin?.email}</p>
                  <p className="mt-1 text-[11px] font-medium text-blue-300">{roleLabel}</p>
                  <div className="mt-3 border-t border-slate-800 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
