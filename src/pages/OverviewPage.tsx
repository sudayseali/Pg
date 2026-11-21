import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Coins,
  Gift,
  Layers,
  MousePointerClick,
  Play,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/adminApi';
import {
  type ActivityWindow,
  buildDailyActivitySeries,
  buildSmoothSvgPath,
  getTransactionBadgeMeta,
} from '../lib/activityChart';
import { formatDateTime, formatNumber, formatPercent, formatUsd } from '../lib/formatters';
import { StatusBadge } from '../components/ui/StatusBadge';
import { KpiGridSkeleton, TableSkeleton } from '../components/ui/Skeletons';
import { PlatformActivityChart } from '../components/dashboard/PlatformActivityChart';
import type { OfferAnalytics } from '../types/admin';

function KpiSparkline({
  values,
  stroke,
  gradientId,
}: {
  values: number[];
  stroke: string;
  gradientId: string;
}) {
  const pathData = useMemo(() => {
    const clean = values.some((v) => v > 0) ? values : [8, 12, 10, 18, 15, 22, 20];
    const max = Math.max(1, ...clean);
    const w = 96;
    const h = 34;
    const coords = clean.map((v, idx) => ({
      x: clean.length <= 1 ? w / 2 : (idx / (clean.length - 1)) * w,
      y: h - 4 - (v / max) * (h - 10),
    }));
    return buildSmoothSvgPath(coords);
  }, [values]);

  return (
    <svg viewBox="0 0 96 34" className="h-9 w-24 shrink-0 overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d={pathData}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function OverviewPage() {
  const { stats, recentTransactions, openDisputesCount, loading: authLoading } = useAuth();
  const [timeframe, setTimeframe] = useState<ActivityWindow>('7D');
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

  const activitySeries = useMemo(
    () => buildDailyActivitySeries(recentTransactions, timeframe),
    [recentTransactions, timeframe],
  );

  if (authLoading && !stats) {
    return (
      <div className="space-y-6">
        <KpiGridSkeleton count={4} />
        <div className="fintech-card overflow-hidden rounded-2xl">
          <TableSkeleton rows={6} cols={5} />
        </div>
      </div>
    );
  }

  const revenueSpark = activitySeries.points.map((p) => p.revenue);
  const payoutSpark = activitySeries.points.map((p) => p.payouts);
  const volumeSpark = activitySeries.points.map((p) => p.revenue + p.payouts);
  const countSpark = activitySeries.points.map((p) => p.txCount);

  const financialCards = [
    {
      label: 'Total Treasury Balance',
      value: formatUsd(stats?.totalTreasuryBalance),
      sub: 'Outstanding user liabilities',
      icon: Wallet,
      glowClass: 'kpi-glow-blue',
      iconBg: 'bg-blue-500/20 text-sky-400 border-blue-400/30',
      stroke: '#38BDF8',
      gradId: 'spark-treasury',
      spark: volumeSpark,
    },
    {
      label: 'Total Platform Earned',
      value: formatUsd(stats?.totalPlatformEarned),
      sub: 'Cumulative gross earnings',
      icon: BarChart2,
      glowClass: 'kpi-glow-emerald',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30',
      stroke: '#34D399',
      gradId: 'spark-earned',
      spark: revenueSpark,
    },
    {
      label: 'Total Paid Out',
      value: formatUsd(stats?.totalPaidOut),
      sub: 'Settled user withdrawals',
      icon: ShieldCheck,
      glowClass: 'kpi-glow-violet',
      iconBg: 'bg-violet-500/20 text-violet-400 border-violet-400/30',
      stroke: '#A78BFA',
      gradId: 'spark-paidout',
      spark: payoutSpark,
    },
    {
      label: 'Registered Users',
      value: formatNumber(stats?.totalUsers),
      sub: `${formatNumber(stats?.activeTasks)} active micro-tasks`,
      icon: Users,
      glowClass: 'kpi-glow-teal',
      iconBg: 'bg-teal-500/20 text-teal-400 border-teal-400/30',
      stroke: '#2DD4BF',
      gradId: 'spark-users',
      spark: countSpark,
    },
  ];

  const actionItems = [
    {
      label: 'Pending Withdrawals',
      count: stats?.pendingWithdrawals ?? 0,
      to: '/withdrawals',
      linkLabel: 'View queue',
      dotColor: 'bg-amber-400',
      countColor: (stats?.pendingWithdrawals ?? 0) > 0 ? 'text-amber-300' : 'text-slate-300',
    },
    {
      label: 'Pending Proofs',
      count: stats?.pendingSubmissions ?? 0,
      to: '/tasks',
      linkLabel: 'View queue',
      dotColor: 'bg-sky-400',
      countColor: (stats?.pendingSubmissions ?? 0) > 0 ? 'text-sky-300' : 'text-slate-300',
    },
    {
      label: 'Open Offer Disputes',
      count: openDisputesCount,
      to: '/offers',
      linkLabel: 'View disputes',
      dotColor: 'bg-rose-400',
      countColor: openDisputesCount > 0 ? 'text-rose-300' : 'text-slate-300',
    },
  ];

  const totalPayout = offerAnalytics?.totalProviderPayout ?? 0;
  const userShareRatio =
    totalPayout > 0
      ? Math.min(
          100,
          Math.max(0, Math.round(((offerAnalytics?.totalUserRewards ?? 0) / totalPayout) * 100)),
        )
      : 0;
  const marginRatio = totalPayout > 0 ? Math.max(0, 100 - userShareRatio) : 0;

  return (
    <div className="space-y-6">
      {/* Executive Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/15 text-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.18)]">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50">
              Operations Overview
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Monitor treasury, payouts, tasks and partner performance.
            </p>
          </div>
        </div>

        {(stats?.pendingWithdrawals ?? 0) > 0 ? (
          <Link
            to="/withdrawals"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-400/25 bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_6px_18px_-4px_rgba(37,99,235,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:from-blue-400 hover:to-blue-600 whitespace-nowrap"
          >
            <span>Process {formatNumber(stats?.pendingWithdrawals)} Withdrawals</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      {/* Primary Financial KPI Row */}
      <section
        aria-label="Treasury Metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {financialCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`fintech-card ${card.glowClass} flex items-end justify-between gap-3 rounded-2xl p-5`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${card.iconBg}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="truncate text-xs font-medium text-slate-300">{card.label}</span>
                </div>
                <p className="mt-3.5 font-mono text-[26px] font-bold leading-none tracking-tight tabular-nums text-slate-50">
                  {card.value}
                </p>
                <p className="mt-2.5 truncate text-xs text-slate-400">{card.sub}</p>
              </div>
              <KpiSparkline
                values={card.spark}
                stroke={card.stroke}
                gradientId={card.gradId}
              />
            </div>
          );
        })}
      </section>

      {/* Mid Asymmetric Split: Platform Activity Chart + Action Required Queue */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PlatformActivityChart
            transactions={recentTransactions}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        </div>

        <section
          aria-label="Action Required"
          className="fintech-card flex flex-col justify-between rounded-2xl p-5 sm:p-6 lg:col-span-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-slate-50">
                Action Required
              </h2>
            </div>
            <Link
              to="/withdrawals"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300 whitespace-nowrap"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 flex-1 divide-y divide-slate-800/75">
            {actionItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 py-4 first:pt-2 last:pb-1"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dotColor}`}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium text-slate-200">{item.label}</span>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <span
                    className={`font-mono text-xl font-bold tabular-nums ${item.countColor}`}
                  >
                    {formatNumber(item.count)}
                  </span>
                  <Link
                    to={item.to}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300 whitespace-nowrap"
                  >
                    <span>{item.linkLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Full-Width Offerwall Performance Strip */}
      <section
        aria-label="Offerwall Performance"
        className="fintech-card rounded-2xl p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
              <Trophy className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-50">
                Offerwall Performance
              </h2>
              <p className="text-xs text-slate-400">
                Live partner conversions, net margin, and reversal health
              </p>
            </div>
          </div>

          <Link
            to="/offers"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300 whitespace-nowrap"
          >
            <span>View Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {analyticsLoading ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
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
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-7">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <Play className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Active Offers</p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-50">
                    {formatNumber(offerAnalytics.activeOffers)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
                  <MousePointerClick className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Clicks</p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-50">
                    {formatNumber(offerAnalytics.totalClicks)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Conversions</p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-50">
                    {formatNumber(offerAnalytics.totalConversions)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                  <Coins className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Provider Payout</p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-50">
                    {formatUsd(offerAnalytics.totalProviderPayout)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                  <Gift className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">User Rewards</p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-50">
                    {formatUsd(offerAnalytics.totalUserRewards)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Net Margin</p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-400">
                    {formatUsd(offerAnalytics.totalNetMargin)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Reversal Rate</p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-50">
                    {formatPercent(offerAnalytics.reversalRatePercent)}
                  </p>
                </div>
              </div>
            </div>

            {totalPayout > 0 ? (
              <div className="rounded-xl border border-slate-800/80 bg-[#050914] p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">
                    Revenue Split Distribution (User Rewards vs. Payvora Margin)
                  </span>
                  <div className="flex items-center gap-4 font-mono tabular-nums">
                    <span className="text-sky-300">Users: {userShareRatio}%</span>
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

      {/* Recent Transactions Ledger Table */}
      <section className="fintech-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-[#050914] text-slate-300">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-50">
                Recent Transactions
              </h2>
              <p className="text-xs text-slate-400">Latest ledger entries across user wallets</p>
            </div>
          </div>

          <Link
            to="/withdrawals"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300 whitespace-nowrap"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No recent transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800/80 bg-[#050914]/80 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentTransactions.map((tx) => {
                  const typeMeta = getTransactionBadgeMeta(tx.type, tx.amount);
                  const typeBadgeClasses =
                    typeMeta.tone === 'blue'
                      ? 'border-blue-500/30 bg-blue-500/15 text-blue-300'
                      : typeMeta.tone === 'emerald'
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                        : typeMeta.tone === 'violet'
                          ? 'border-violet-500/30 bg-violet-500/15 text-violet-300'
                          : 'border-slate-700 bg-slate-800/70 text-slate-300';

                  const absUsd = formatUsd(Math.abs(tx.amount));
                  const signedAmount = typeMeta.isOutflow ? `-${absUsd}` : `+${absUsd}`;

                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-slate-800/25">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs font-semibold text-slate-200">
                          {tx.reference || tx.description || tx.id.slice(0, 12)}
                        </p>
                        {tx.reference && tx.description ? (
                          <p className="mt-0.5 max-w-xs truncate text-[11px] text-slate-500">
                            {tx.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-200">
                        {tx.username ? `@${tx.username}` : tx.user_email || tx.user_id || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${typeBadgeClasses}`}
                        >
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={tx.status || 'completed'} />
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-mono text-sm font-semibold tabular-nums ${
                          typeMeta.isOutflow ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {signedAmount}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-400">
                        {formatDateTime(tx.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
