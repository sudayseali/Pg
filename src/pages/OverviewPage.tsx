import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckSquare,
  DollarSign,
  Layers,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/adminApi';
import { formatDateTime, formatNumber, formatPercent, formatUsd } from '../lib/formatters';
import { StatusBadge } from '../components/ui/StatusBadge';
import { KpiGridSkeleton, TableSkeleton } from '../components/ui/Skeletons';
import type { OfferAnalytics } from '../types/admin';

export function OverviewPage() {
  const { stats, recentTransactions, loading: authLoading } = useAuth();
  const [offerAnalytics, setOfferAnalytics] = useState<OfferAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadOfferSummary() {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const res = await adminApi.getOfferAnalytics();
        if (active) setOfferAnalytics(res.analytics);
      } catch (err) {
        if (active) {
          setAnalyticsError(
            err instanceof Error ? err.message : 'Unable to load offerwall analytics.',
          );
        }
      } finally {
        if (active) setAnalyticsLoading(false);
      }
    }
    void loadOfferSummary();
    return () => {
      active = false;
    };
  }, []);

  if (authLoading && !stats) {
    return (
      <div className="space-y-6">
        <KpiGridSkeleton count={4} />
        <div className="fintech-card overflow-hidden rounded-xl">
          <TableSkeleton rows={6} cols={5} />
        </div>
      </div>
    );
  }

  const financialCards = [
    {
      label: 'Total Treasury Balance',
      value: formatUsd(stats?.totalTreasuryBalance),
      sub: 'Outstanding user liabilities',
      icon: Wallet,
      accent: 'text-slate-50',
    },
    {
      label: 'Total Platform Earned',
      value: formatUsd(stats?.totalPlatformEarned),
      sub: 'Cumulative gross earnings',
      icon: TrendingUp,
      accent: 'text-emerald-300',
    },
    {
      label: 'Total Paid Out',
      value: formatUsd(stats?.totalPaidOut),
      sub: 'Settled user withdrawals',
      icon: DollarSign,
      accent: 'text-slate-50',
    },
    {
      label: 'Registered Users',
      value: formatNumber(stats?.totalUsers),
      sub: `${formatNumber(stats?.activeTasks)} active micro-tasks`,
      icon: Users,
      accent: 'text-slate-50',
    },
  ];

  const queueCards = [
    {
      label: 'Pending Withdrawals',
      value: formatNumber(stats?.pendingWithdrawals),
      to: '/withdrawals',
      cta: 'Review payouts',
      icon: ArrowUpRight,
      alert: (stats?.pendingWithdrawals ?? 0) > 0,
    },
    {
      label: 'Pending Proof Submissions',
      value: formatNumber(stats?.pendingSubmissions),
      to: '/tasks',
      cta: 'Inspect proofs',
      icon: CheckSquare,
      alert: (stats?.pendingSubmissions ?? 0) > 0,
    },
    {
      label: 'Active Micro-Tasks',
      value: formatNumber(stats?.activeTasks),
      to: '/tasks',
      cta: 'Manage tasks',
      icon: Layers,
      alert: false,
    },
  ];

  const totalPayout = offerAnalytics?.totalProviderPayout ?? 0;
  const userShareRatio =
    totalPayout > 0
      ? Math.min(100, Math.max(0, Math.round(((offerAnalytics?.totalUserRewards ?? 0) / totalPayout) * 100)))
      : 0;
  const marginRatio = totalPayout > 0 ? Math.max(0, 100 - userShareRatio) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">
            Operations Overview
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time treasury liquidity, operational review queues, and offerwall margin summary.
          </p>
        </div>

        {(stats?.pendingWithdrawals ?? 0) > 0 ? (
          <Link
            to="/withdrawals"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-gradient-to-b from-blue-500 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:from-blue-400 hover:to-blue-600 whitespace-nowrap"
          >
            <span>Process {formatNumber(stats?.pendingWithdrawals)} Withdrawals</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      {/* Primary Financial KPIs */}
      <section
        aria-label="Treasury Metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {financialCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="fintech-card rounded-xl p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-400">{card.label}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#060913] text-slate-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <p
                className={`mt-3 font-mono text-[26px] font-semibold leading-none tracking-tight tabular-nums ${card.accent}`}
              >
                {card.value}
              </p>
              <p className="mt-2.5 text-xs text-slate-500">{card.sub}</p>
            </div>
          );
        })}
      </section>

      {/* Operational Review Queues */}
      <section aria-label="Action Queues" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {queueCards.map((q) => {
          const Icon = q.icon;
          return (
            <div
              key={q.label}
              className={`fintech-card flex items-center justify-between gap-4 rounded-xl p-5 transition-colors ${
                q.alert ? 'border-amber-500/35' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${q.alert ? 'text-amber-400' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-slate-400">{q.label}</span>
                </div>
                <p
                  className={`mt-2.5 font-mono text-2xl font-semibold tabular-nums ${
                    q.alert ? 'text-amber-300' : 'text-slate-100'
                  }`}
                >
                  {q.value}
                </p>
              </div>
              <Link
                to={q.to}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#060913] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-blue-500/40 hover:bg-slate-800/70 hover:text-white whitespace-nowrap"
              >
                <span>{q.cta}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          );
        })}
      </section>

      {/* Offer Analytics Summary Strip */}
      <section
        aria-label="Offerwall Analytics Summary"
        className="fintech-card rounded-xl p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-100">
              Offerwall Performance & Take Rate
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Live conversions, net Payvora margin, and reversal rate across active partners.
            </p>
          </div>
          <Link
            to="/offers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#060913] px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:border-blue-500/40 hover:text-blue-300"
          >
            <span>Open Marketplace Ops</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {analyticsLoading ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-800/60" />
            ))}
          </div>
        ) : analyticsError ? (
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{analyticsError}</span>
          </div>
        ) : offerAnalytics ? (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <p className="text-xs text-slate-400">Active Offers</p>
                <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-slate-100">
                  {formatNumber(offerAnalytics.activeOffers)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Clicks / Conv.</p>
                <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-slate-100">
                  {formatNumber(offerAnalytics.totalClicks)} /{' '}
                  {formatNumber(offerAnalytics.totalConversions)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Provider Payout</p>
                <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-slate-100">
                  {formatUsd(offerAnalytics.totalProviderPayout)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">User Rewards</p>
                <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-blue-300">
                  {formatUsd(offerAnalytics.totalUserRewards)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Net Margin</p>
                <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-emerald-400">
                  {formatUsd(offerAnalytics.totalNetMargin)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Reversal / Disputes</p>
                <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-slate-100">
                  {formatPercent(offerAnalytics.reversalRatePercent)} ·{' '}
                  <span className={offerAnalytics.openDisputes > 0 ? 'text-amber-300' : ''}>
                    {formatNumber(offerAnalytics.openDisputes)} open
                  </span>
                </p>
              </div>
            </div>

            {totalPayout > 0 ? (
              <div className="rounded-lg border border-slate-800/80 bg-[#060913] p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">
                    Revenue Split Distribution (User Rewards vs. Payvora Margin)
                  </span>
                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <span className="text-blue-300">Users: {userShareRatio}%</span>
                    <span className="text-emerald-400">Margin: {marginRatio}%</span>
                  </div>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${userShareRatio}%` }}
                  />
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${marginRatio}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Recent Transactions Table */}
      <section className="fintech-card overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-100">
              Recent Transactions
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Latest ledger entries across user wallets
            </p>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No recent transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800/80 bg-[#060913] text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-5 py-3">Transaction</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-slate-800/25">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-200">
                        {tx.description || tx.reference || tx.id.slice(0, 8)}
                      </p>
                      <p className="font-mono text-xs text-slate-500">{tx.id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-300">
                      {tx.username ? `@${tx.username}` : tx.user_email || tx.user_id || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded border border-slate-800 bg-[#060913] px-2 py-0.5 font-mono text-[11px] text-slate-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={tx.status || 'completed'} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-semibold tabular-nums text-slate-100">
                      {formatUsd(tx.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-400">
                      {formatDateTime(tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
