import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  RefreshCw,
  Search,
  Sliders,
  Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/adminApi';
import { hasPermission } from '../lib/rbac';
import { formatDateTime, formatNumber, formatPercent, formatUsd } from '../lib/formatters';
import { AccessDenied } from '../components/ui/AccessDenied';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/Skeletons';
import type {
  AdminOffer,
  OfferAnalytics,
  OfferCommissionConfig,
  OfferConversion,
  OfferDispute,
  OfferProvider,
  ProviderPostback,
  ProviderSyncLog,
} from '../types/admin';

type OffersSubTab = 'analytics' | 'providers' | 'catalog' | 'conversions' | 'disputes';

export function OffersPage() {
  const { admin, refreshAdminData } = useAuth();
  const { pushToast } = useToast();

  const canViewDashboard = hasPermission(admin?.role, 'view_dashboard');
  const canManageSettings = hasPermission(admin?.role, 'manage_settings');
  const canReviewDisputes = hasPermission(admin?.role, 'review_submissions');
  const canManageBalances = hasPermission(admin?.role, 'manage_balances');

  const [subTab, setSubTab] = useState<OffersSubTab>('analytics');

  // Analytics & Commission
  const [analytics, setAnalytics] = useState<OfferAnalytics | null>(null);
  const [commission, setCommission] = useState<OfferCommissionConfig>({
    default_user_share_percent: 60,
    min_user_reward_usd: 0.01,
    max_user_reward_usd: 500,
    provider_user_share_overrides: {},
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [savingCommission, setSavingCommission] = useState(false);

  // Providers & Sync
  const [providers, setProviders] = useState<OfferProvider[]>([]);
  const [syncLogs, setSyncLogs] = useState<ProviderSyncLog[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [syncCountry, setSyncCountry] = useState('US');
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<OfferProvider | null>(null);
  const [providerForm, setProviderForm] = useState({
    status: 'active',
    apiEnabled: true,
    customListingEnabled: true,
    syncEnabled: true,
    commissionOverridePercent: '',
    hostedWallUrlTemplate: '',
  });
  const [savingProvider, setSavingProvider] = useState(false);

  // Catalog
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [offerPage, setOfferPage] = useState(1);
  const [offerTotal, setOfferTotal] = useState(0);
  const [offerSearch, setOfferSearch] = useState('');
  const [offerCategory, setOfferCategory] = useState('');
  const [offersLoading, setOffersLoading] = useState(false);

  // Conversions & Postbacks
  const [conversions, setConversions] = useState<OfferConversion[]>([]);
  const [postbacks, setPostbacks] = useState<ProviderPostback[]>([]);
  const [convLoading, setConvLoading] = useState(false);

  // Disputes
  const [disputeFilter, setDisputeFilter] = useState<
    'open' | 'investigating' | 'resolved' | 'rejected' | 'all'
  >('open');
  const [disputes, setDisputes] = useState<OfferDispute[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<OfferDispute | null>(null);
  const [disputeForm, setDisputeForm] = useState({
    status: 'resolved' as 'open' | 'investigating' | 'resolved' | 'rejected',
    adminNote: '',
    creditAmount: '',
  });
  const [resolving, setResolving] = useState(false);

  const loadAnalyticsAndCommission = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [analyticsRes, providersRes] = await Promise.all([
        adminApi.getOfferAnalytics(),
        adminApi.getOfferProviders(),
      ]);
      setAnalytics(analyticsRes.analytics);
      if (providersRes.commissionConfig) {
        setCommission({
          default_user_share_percent: providersRes.commissionConfig.default_user_share_percent ?? 60,
          min_user_reward_usd: providersRes.commissionConfig.min_user_reward_usd ?? 0.01,
          max_user_reward_usd: providersRes.commissionConfig.max_user_reward_usd ?? 500,
          provider_user_share_overrides:
            providersRes.commissionConfig.provider_user_share_overrides ?? {},
        });
      }
      setProviders(providersRes.providers ?? []);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load offer analytics',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [pushToast]);

  const loadProvidersAndLogs = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const [providersRes, logsRes] = await Promise.all([
        adminApi.getOfferProviders(),
        adminApi.getProviderSyncLogs({ limit: 25 }),
      ]);
      setProviders(providersRes.providers ?? []);
      setSyncLogs(logsRes.logs ?? []);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load partner providers',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setProvidersLoading(false);
    }
  }, [pushToast]);

  const loadOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      const res = await adminApi.getAdminOffers({
        page: offerPage,
        limit: 20,
        category: offerCategory.trim() || undefined,
        search: offerSearch.trim() || undefined,
      });
      setOffers(res.offers ?? []);
      setOfferTotal(res.total ?? 0);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load offers catalog',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setOffersLoading(false);
    }
  }, [offerPage, offerCategory, offerSearch, pushToast]);

  const loadConversions = useCallback(async () => {
    setConvLoading(true);
    try {
      const res = await adminApi.getOfferConversions({ limit: 50 });
      setConversions(res.conversions ?? []);
      setPostbacks(res.postbacks ?? []);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load conversions & postbacks',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setConvLoading(false);
    }
  }, [pushToast]);

  const loadDisputes = useCallback(async () => {
    if (!canReviewDisputes) return;
    setDisputesLoading(true);
    try {
      const res = await adminApi.getOfferDisputes({ status: disputeFilter });
      setDisputes(res.disputes ?? []);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load disputes',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDisputesLoading(false);
    }
  }, [canReviewDisputes, disputeFilter, pushToast]);

  useEffect(() => {
    if (subTab === 'analytics') void loadAnalyticsAndCommission();
    else if (subTab === 'providers') void loadProvidersAndLogs();
    else if (subTab === 'catalog') void loadOffers();
    else if (subTab === 'conversions') void loadConversions();
    else if (subTab === 'disputes') void loadDisputes();
  }, [
    subTab,
    loadAnalyticsAndCommission,
    loadProvidersAndLogs,
    loadOffers,
    loadConversions,
    loadDisputes,
  ]);

  if (!canViewDashboard && !canManageSettings && !canReviewDisputes) {
    return <AccessDenied role={admin?.role} required="Offers Marketplace Ops" />;
  }

  async function handleSaveCommission(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageSettings || savingCommission) return;
    setSavingCommission(true);
    try {
      await adminApi.updateCommissionConfig(commission);
      pushToast({
        variant: 'success',
        title: 'Commission rules updated',
        description: 'Global user share and payout guardrails saved.',
      });
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to update commission config',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingCommission(false);
    }
  }

  async function handleTriggerSync(providerKey?: string) {
    if (!canManageSettings || syncingKey) return;
    setSyncingKey(providerKey ?? '__all__');
    try {
      await adminApi.triggerOfferSync({
        providerKey,
        country: syncCountry.trim() || undefined,
      });
      pushToast({
        variant: 'success',
        title: providerKey ? `Synced ${providerKey}` : 'Triggered sync for all enabled providers',
      });
      await loadProvidersAndLogs();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Sync failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSyncingKey(null);
    }
  }

  async function handleQuickToggleProvider(
    provider: OfferProvider,
    field: 'apiEnabled' | 'customListingEnabled' | 'syncEnabled',
    nextVal: boolean,
  ) {
    if (!canManageSettings) return;
    try {
      await adminApi.updateOfferProvider({
        providerKey: provider.provider_key,
        [field]: nextVal,
      });
      pushToast({
        variant: 'success',
        title: `${provider.display_name} updated`,
      });
      await loadProvidersAndLogs();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Provider update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleSaveProviderModal(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProvider || savingProvider || !canManageSettings) return;
    setSavingProvider(true);
    try {
      const overrideNum =
        providerForm.commissionOverridePercent.trim() === ''
          ? null
          : Number.parseFloat(providerForm.commissionOverridePercent);

      await adminApi.updateOfferProvider({
        providerKey: editingProvider.provider_key,
        status: providerForm.status,
        apiEnabled: providerForm.apiEnabled,
        customListingEnabled: providerForm.customListingEnabled,
        syncEnabled: providerForm.syncEnabled,
        commissionOverridePercent: overrideNum,
        hostedWallUrlTemplate: providerForm.hostedWallUrlTemplate.trim() || null,
      });
      pushToast({
        variant: 'success',
        title: `${editingProvider.display_name} saved`,
      });
      setEditingProvider(null);
      await loadProvidersAndLogs();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to save provider',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingProvider(false);
    }
  }

  async function handleToggleOfferFlag(
    offer: AdminOffer,
    field: 'isActive' | 'isFeatured',
    nextValue: boolean,
  ) {
    if (!canManageSettings) return;
    try {
      await adminApi.updateAdminOffer({
        offerId: offer.id,
        [field]: nextValue,
      });
      setOffers((prev) =>
        prev.map((item) =>
          item.id === offer.id
            ? {
                ...item,
                is_active: field === 'isActive' ? nextValue : item.is_active,
                is_featured: field === 'isFeatured' ? nextValue : item.is_featured,
              }
            : item,
        ),
      );
      pushToast({
        variant: 'success',
        title: `Offer ${field === 'isActive' ? (nextValue ? 'activated' : 'disabled') : nextValue ? 'featured' : 'unfeatured'}`,
      });
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Offer update failed',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function handleResolveDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveTarget || resolving) return;
    const creditNum =
      disputeForm.creditAmount.trim() === ''
        ? undefined
        : Number.parseFloat(disputeForm.creditAmount);

    if (creditNum !== undefined && (!Number.isFinite(creditNum) || creditNum < 0)) {
      pushToast({
        variant: 'error',
        title: 'Invalid credit amount',
      });
      return;
    }

    if (creditNum && creditNum > 0 && !canManageBalances) {
      pushToast({
        variant: 'error',
        title: 'Permission required',
        description: 'Crediting user balances requires manage_balances permission.',
      });
      return;
    }

    setResolving(true);
    try {
      await adminApi.resolveOfferDispute({
        disputeId: resolveTarget.id,
        status: disputeForm.status,
        adminNote: disputeForm.adminNote.trim(),
        creditAmount: creditNum && creditNum > 0 ? creditNum : undefined,
      });
      pushToast({
        variant: 'success',
        title: 'Dispute updated',
        description:
          creditNum && creditNum > 0
            ? `Status set to ${disputeForm.status} and credited ${formatUsd(creditNum)}.`
            : `Status set to ${disputeForm.status}.`,
      });
      setResolveTarget(null);
      await Promise.all([loadDisputes(), refreshAdminData()]);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to resolve dispute',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setResolving(false);
    }
  }

  const tabs: { id: OffersSubTab; label: string; visible: boolean }[] = [
    { id: 'analytics', label: 'Analytics & Commission', visible: canViewDashboard },
    { id: 'providers', label: 'Partner Providers & Sync', visible: canViewDashboard },
    { id: 'catalog', label: 'Offers Catalog', visible: canViewDashboard },
    { id: 'conversions', label: 'Conversions & Postbacks', visible: canViewDashboard },
    { id: 'disputes', label: 'Disputes', visible: canReviewDisputes },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Offers Marketplace Operations
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure 8 offerwall partners, commission splits, live sync pipelines, postbacks, and
          disputes.
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-[#0F172A] p-1">
        {tabs
          .filter((t) => t.visible)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                subTab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      {/* 1. ANALYTICS & COMMISSION */}
      {subTab === 'analytics' ? (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800/50" />
              ))}
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                <p className="text-xs text-slate-400">Total Provider Payout</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-100">
                  {formatUsd(analytics.totalProviderPayout)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(analytics.totalConversions)} conversions /{' '}
                  {formatNumber(analytics.totalClicks)} clicks
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                <p className="text-xs text-slate-400">Total User Rewards</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-100">
                  {formatUsd(analytics.totalUserRewards)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(analytics.activeOffers)} active offers live
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                <p className="text-xs text-slate-400">Net Payvora Margin</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-emerald-400">
                  {formatUsd(analytics.totalNetMargin)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Post-commission profit</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
                <p className="text-xs text-slate-400">Reversal Rate & Disputes</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-100">
                  {formatPercent(analytics.reversalRatePercent)}
                </p>
                <p className="mt-1 text-xs text-amber-300">
                  {formatNumber(analytics.openDisputes)} open disputes
                </p>
              </div>
            </div>
          ) : null}

          <form
            onSubmit={(e) => void handleSaveCommission(e)}
            className="rounded-xl border border-slate-800 bg-[#0F172A] p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Global Commission Configuration
                </h2>
                <p className="text-xs text-slate-400">
                  Controls default user revenue share and per-offer USD reward bounds.
                </p>
              </div>
              {!canManageSettings ? (
                <span className="text-xs text-amber-300">Read-only (requires manage_settings)</span>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="comm-share"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Default User Share (%)
                </label>
                <input
                  id="comm-share"
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  disabled={!canManageSettings}
                  value={commission.default_user_share_percent}
                  onChange={(e) =>
                    setCommission((c) => ({
                      ...c,
                      default_user_share_percent: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 font-mono text-sm text-slate-100 disabled:opacity-60"
                />
              </div>
              <div>
                <label
                  htmlFor="comm-min"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Min User Reward (USD)
                </label>
                <input
                  id="comm-min"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!canManageSettings}
                  value={commission.min_user_reward_usd}
                  onChange={(e) =>
                    setCommission((c) => ({
                      ...c,
                      min_user_reward_usd: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 font-mono text-sm text-slate-100 disabled:opacity-60"
                />
              </div>
              <div>
                <label
                  htmlFor="comm-max"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Max User Reward (USD)
                </label>
                <input
                  id="comm-max"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!canManageSettings}
                  value={commission.max_user_reward_usd}
                  onChange={(e) =>
                    setCommission((c) => ({
                      ...c,
                      max_user_reward_usd: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 font-mono text-sm text-slate-100 disabled:opacity-60"
                />
              </div>
            </div>

            {providers.length > 0 ? (
              <div className="mt-6 border-t border-slate-800/80 pt-5">
                <p className="mb-3 text-xs font-medium text-slate-300">
                  Provider Share Overrides (%)
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {providers.map((p) => (
                    <div key={p.provider_key}>
                      <label
                        htmlFor={`override-${p.provider_key}`}
                        className="mb-1 block text-xs text-slate-400"
                      >
                        {p.display_name}
                      </label>
                      <input
                        id={`override-${p.provider_key}`}
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        disabled={!canManageSettings}
                        placeholder={`${commission.default_user_share_percent}%`}
                        value={commission.provider_user_share_overrides[p.provider_key] ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setCommission((c) => {
                            const next = { ...c.provider_user_share_overrides };
                            if (raw === '') {
                              delete next[p.provider_key];
                            } else {
                              next[p.provider_key] = Number.parseFloat(raw) || 0;
                            }
                            return { ...c, provider_user_share_overrides: next };
                          });
                        }}
                        className="h-9 w-full rounded-lg border border-slate-800 bg-[#070B19] px-2.5 font-mono text-xs text-slate-100 disabled:opacity-60"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {canManageSettings ? (
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={savingCommission}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingCommission ? 'Saving...' : 'Save Commission Rules'}
                </button>
              </div>
            ) : null}
          </form>
        </div>
      ) : null}

      {/* 2. PARTNER PROVIDERS & SYNC */}
      {subTab === 'providers' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#0F172A] p-4">
            <div className="flex items-center gap-3">
              <label htmlFor="sync-country" className="text-xs font-medium text-slate-300">
                Sync Country Code
              </label>
              <input
                id="sync-country"
                type="text"
                maxLength={2}
                value={syncCountry}
                onChange={(e) => setSyncCountry(e.target.value.toUpperCase())}
                className="h-9 w-20 rounded-lg border border-slate-800 bg-[#070B19] px-2.5 text-center font-mono text-xs uppercase text-slate-100"
              />
            </div>

            {canManageSettings ? (
              <button
                type="button"
                disabled={Boolean(syncingKey)}
                onClick={() => void handleTriggerSync()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncingKey === '__all__' ? 'animate-spin' : ''}`}
                />
                <span>
                  {syncingKey === '__all__' ? 'Syncing All...' : 'Sync All Enabled Providers'}
                </span>
              </button>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
            {providersLoading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800/80 bg-[#0B1122] text-xs font-medium text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Partner</th>
                      <th className="px-5 py-3">Readiness & Secrets</th>
                      <th className="px-5 py-3">Toggles</th>
                      <th className="px-5 py-3 text-right">Share Override</th>
                      <th className="px-5 py-3">Last Sync</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {providers.map((p) => {
                      const missing = p.runtimeStatus?.missingSecrets ?? [];
                      return (
                        <tr key={p.provider_key} className="hover:bg-slate-800/30">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-100">{p.display_name}</p>
                            <p className="mt-0.5 font-mono text-xs text-slate-400">
                              {p.provider_key} · {p.integration_type}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={p.status} />
                              {missing.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-amber-300">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span>Missing: {missing.join(', ')}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-400">
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Secrets configured</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-2 text-xs">
                              <button
                                type="button"
                                disabled={!canManageSettings}
                                onClick={() =>
                                  void handleQuickToggleProvider(p, 'apiEnabled', !p.api_enabled)
                                }
                                className={`rounded border px-2 py-1 font-medium transition-colors ${
                                  p.api_enabled
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-400'
                                }`}
                              >
                                API: {p.api_enabled ? 'On' : 'Off'}
                              </button>
                              <button
                                type="button"
                                disabled={!canManageSettings}
                                onClick={() =>
                                  void handleQuickToggleProvider(
                                    p,
                                    'customListingEnabled',
                                    !p.custom_listing_enabled,
                                  )
                                }
                                className={`rounded border px-2 py-1 font-medium transition-colors ${
                                  p.custom_listing_enabled
                                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-400'
                                }`}
                              >
                                Listing: {p.custom_listing_enabled ? 'On' : 'Off'}
                              </button>
                              <button
                                type="button"
                                disabled={!canManageSettings}
                                onClick={() =>
                                  void handleQuickToggleProvider(p, 'syncEnabled', !p.sync_enabled)
                                }
                                className={`rounded border px-2 py-1 font-medium transition-colors ${
                                  p.sync_enabled
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-400'
                                }`}
                              >
                                Sync: {p.sync_enabled ? 'On' : 'Off'}
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-xs tabular-nums text-slate-200">
                            {p.commission_override_percent !== null &&
                            p.commission_override_percent !== undefined
                              ? `${p.commission_override_percent}%`
                              : 'Default'}
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            <p className="font-mono tabular-nums text-slate-300">
                              {formatDateTime(p.last_sync_at)}
                            </p>
                            {p.last_error ? (
                              <p className="mt-0.5 max-w-[180px] truncate text-red-400">
                                {p.last_error}
                              </p>
                            ) : p.last_sync_status ? (
                              <p className="mt-0.5 text-slate-500">{p.last_sync_status}</p>
                            ) : null}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              {canManageSettings ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={Boolean(syncingKey)}
                                    onClick={() => void handleTriggerSync(p.provider_key)}
                                    className="inline-flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                                  >
                                    <RefreshCw
                                      className={`h-3 w-3 ${syncingKey === p.provider_key ? 'animate-spin' : ''}`}
                                    />
                                    <span>Sync</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProvider(p);
                                      setProviderForm({
                                        status: p.status,
                                        apiEnabled: p.api_enabled,
                                        customListingEnabled: p.custom_listing_enabled,
                                        syncEnabled: p.sync_enabled,
                                        commissionOverridePercent:
                                          p.commission_override_percent !== null &&
                                          p.commission_override_percent !== undefined
                                            ? String(p.commission_override_percent)
                                            : '',
                                        hostedWallUrlTemplate: p.hosted_wall_url_template ?? '',
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                                  >
                                    <Sliders className="h-3 w-3" />
                                    <span>Configure</span>
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sync Logs */}
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
            <div className="border-b border-slate-800/80 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-100">Provider Sync Logs</h2>
            </div>
            {syncLogs.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-400">
                No provider sync logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800/80 bg-[#0B1122] text-slate-400">
                    <tr>
                      <th className="px-5 py-2.5">Provider</th>
                      <th className="px-5 py-2.5">Status</th>
                      <th className="px-5 py-2.5 text-right">Fetched / Upserted</th>
                      <th className="px-5 py-2.5 text-right">Duration</th>
                      <th className="px-5 py-2.5">Error</th>
                      <th className="px-5 py-2.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-2.5 font-mono text-slate-200">{log.provider_key}</td>
                        <td className="px-5 py-2.5">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums text-slate-300">
                          {formatNumber(log.offers_fetched)} / {formatNumber(log.offers_upserted)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums text-slate-400">
                          {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                        </td>
                        <td className="max-w-xs truncate px-5 py-2.5 text-red-400">
                          {log.error_message || '—'}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums text-slate-400">
                          {formatDateTime(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* 3. OFFERS CATALOG */}
      {subTab === 'catalog' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={offerSearch}
                onChange={(e) => {
                  setOfferSearch(e.target.value);
                  setOfferPage(1);
                }}
                placeholder="Search synced offers by title or provider..."
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#0F172A] pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <input
              type="text"
              value={offerCategory}
              onChange={(e) => {
                setOfferCategory(e.target.value);
                setOfferPage(1);
              }}
              placeholder="Filter category (e.g. game, survey)"
              className="h-10 w-56 rounded-lg border border-slate-800 bg-[#0F172A] px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
            {offersLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : offers.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No synced offers match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800/80 bg-[#0B1122] text-xs font-medium text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Offer</th>
                      <th className="px-5 py-3">Provider / Category</th>
                      <th className="px-5 py-3 text-right">Provider Payout</th>
                      <th className="px-5 py-3 text-right">User Reward</th>
                      <th className="px-5 py-3 text-right">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {offers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-100">{offer.title}</p>
                          <p className="mt-0.5 max-w-md truncate text-xs text-slate-400">
                            {offer.description || offer.external_offer_id}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-300">
                          <span className="font-mono">{offer.provider_key}</span>
                          {offer.category ? ` · ${offer.category}` : ''}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono tabular-nums text-slate-300">
                          {formatUsd(offer.provider_payout_usd)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold tabular-nums text-emerald-400">
                          {formatUsd(offer.user_reward_usd)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!canManageSettings}
                              onClick={() =>
                                void handleToggleOfferFlag(offer, 'isFeatured', !offer.is_featured)
                              }
                              className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium ${
                                offer.is_featured
                                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                                  : 'border-slate-700 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <Star className="h-3 w-3" />
                              <span>{offer.is_featured ? 'Featured' : 'Feature'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={!canManageSettings}
                              onClick={() =>
                                void handleToggleOfferFlag(offer, 'isActive', !offer.is_active)
                              }
                              className={`rounded border px-2.5 py-1 text-xs font-medium ${
                                offer.is_active
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                  : 'border-slate-700 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {offer.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={offerPage}
              limit={20}
              total={offerTotal}
              onPageChange={setOfferPage}
              disabled={offersLoading}
            />
          </div>
        </div>
      ) : null}

      {/* 4. CONVERSIONS & POSTBACKS */}
      {subTab === 'conversions' ? (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
            <div className="border-b border-slate-800/80 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-100">Offer Completions</h2>
            </div>
            {convLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : conversions.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-400">
                No offer conversions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800/80 bg-[#0B1122] text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Offer / Provider</th>
                      <th className="px-5 py-3">User</th>
                      <th className="px-5 py-3 text-right">Provider Payout</th>
                      <th className="px-5 py-3 text-right">User Reward</th>
                      <th className="px-5 py-3 text-right">Payvora Margin</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {conversions.map((c) => {
                      const margin =
                        c.net_margin_usd ?? c.provider_payout_usd - c.user_reward_usd;
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/30">
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-100">
                              {c.offer_title || c.offer_id || 'Offer Completion'}
                            </p>
                            <p className="font-mono text-slate-400">{c.provider_key}</p>
                          </td>
                          <td className="px-5 py-3 text-slate-300">
                            {c.username ? `@${c.username}` : c.user_id}
                          </td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-200">
                            {formatUsd(c.provider_payout_usd)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-200">
                            {formatUsd(c.user_reward_usd)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-emerald-400">
                            {formatUsd(margin)}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={c.is_reversed ? 'reversed' : c.status} />
                          </td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-400">
                            {formatDateTime(c.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
            <div className="border-b border-slate-800/80 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-100">
                Raw Provider Postbacks & Signature Audit
              </h2>
            </div>
            {convLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : postbacks.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-400">
                No inbound postbacks logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800/80 bg-[#0B1122] text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Provider</th>
                      <th className="px-5 py-3">External Tx ID</th>
                      <th className="px-5 py-3">Signature</th>
                      <th className="px-5 py-3">Processing</th>
                      <th className="px-5 py-3 text-right">Payout</th>
                      <th className="px-5 py-3 text-right">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {postbacks.map((pb) => (
                      <tr key={pb.id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-3 font-mono text-slate-200">{pb.provider_key}</td>
                        <td className="px-5 py-3 font-mono text-slate-300">
                          {pb.external_tx_id || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge
                            status={pb.signature_valid === true ? 'valid' : 'failed'}
                            labelOverride={
                              pb.signature_valid === true
                                ? 'Signature Valid'
                                : pb.signature_valid === false
                                  ? 'Invalid Sig'
                                  : 'Unchecked'
                            }
                          />
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={pb.processing_status} />
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-200">
                          {pb.payout_usd !== null && pb.payout_usd !== undefined
                            ? formatUsd(pb.payout_usd)
                            : '—'}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-400">
                          {formatDateTime(pb.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* 5. DISPUTES */}
      {subTab === 'disputes' && canReviewDisputes ? (
        <div className="space-y-4">
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0F172A] p-1 w-fit">
            {(['open', 'investigating', 'resolved', 'rejected', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDisputeFilter(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  disputeFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
            {disputesLoading ? (
              <TableSkeleton rows={5} cols={5} />
            ) : disputes.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No {disputeFilter === 'all' ? '' : disputeFilter} offer disputes found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800/80 bg-[#0B1122] text-xs font-medium text-slate-400">
                    <tr>
                      <th className="px-5 py-3">User</th>
                      <th className="px-5 py-3">Offer / Provider</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Expected</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {disputes.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-3.5 text-xs">
                          <p className="font-medium text-slate-100">
                            {d.username ? `@${d.username}` : d.user_id}
                          </p>
                          <p className="font-mono text-slate-500">{formatDateTime(d.created_at)}</p>
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          <p className="font-medium text-slate-200">{d.offer_title || 'Offer'}</p>
                          <p className="font-mono text-slate-400">{d.provider_key || '—'}</p>
                        </td>
                        <td className="max-w-xs px-5 py-3.5 text-xs text-slate-300">
                          <p className="line-clamp-2">{d.description}</p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono tabular-nums text-slate-200">
                          {d.expected_reward_usd ? formatUsd(d.expected_reward_usd) : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setResolveTarget(d);
                              setDisputeForm({
                                status: d.status === 'open' ? 'resolved' : d.status,
                                adminNote: d.admin_note ?? '',
                                creditAmount: d.expected_reward_usd
                                  ? String(d.expected_reward_usd)
                                  : '',
                              });
                            }}
                            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                          >
                            Resolve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Edit Provider Modal */}
      <Modal
        open={Boolean(editingProvider)}
        title={`Configure ${editingProvider?.display_name ?? 'Provider'}`}
        onClose={() => setEditingProvider(null)}
        busy={savingProvider}
      >
        <form onSubmit={(e) => void handleSaveProviderModal(e)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="prov-status" className="mb-1 block text-xs font-medium text-slate-300">
                Status
              </label>
              <select
                id="prov-status"
                value={providerForm.status}
                onChange={(e) => setProviderForm((f) => ({ ...f, status: e.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 text-sm text-slate-100"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label htmlFor="prov-override" className="mb-1 block text-xs font-medium text-slate-300">
                Commission Override (%)
              </label>
              <input
                id="prov-override"
                type="number"
                min="1"
                max="100"
                step="0.5"
                placeholder="Use global default"
                value={providerForm.commissionOverridePercent}
                onChange={(e) =>
                  setProviderForm((f) => ({ ...f, commissionOverridePercent: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 font-mono text-sm text-slate-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prov-template" className="mb-1 block text-xs font-medium text-slate-300">
              Hosted Wall URL Template
            </label>
            <input
              id="prov-template"
              type="text"
              value={providerForm.hostedWallUrlTemplate}
              onChange={(e) =>
                setProviderForm((f) => ({ ...f, hostedWallUrlTemplate: e.target.value }))
              }
              placeholder="https://wall.provider.com/?uid={user_id}"
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 font-mono text-xs text-slate-100"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-[#070B19] p-3.5 text-xs">
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-200">API Integration Enabled</span>
              <input
                type="checkbox"
                checked={providerForm.apiEnabled}
                onChange={(e) => setProviderForm((f) => ({ ...f, apiEnabled: e.target.checked }))}
                className="h-4 w-4 accent-blue-600"
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-200">Custom Listing Enabled</span>
              <input
                type="checkbox"
                checked={providerForm.customListingEnabled}
                onChange={(e) =>
                  setProviderForm((f) => ({ ...f, customListingEnabled: e.target.checked }))
                }
                className="h-4 w-4 accent-blue-600"
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-200">Scheduled Sync Enabled</span>
              <input
                type="checkbox"
                checked={providerForm.syncEnabled}
                onChange={(e) => setProviderForm((f) => ({ ...f, syncEnabled: e.target.checked }))}
                className="h-4 w-4 accent-blue-600"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={savingProvider}
              onClick={() => setEditingProvider(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProvider}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {savingProvider ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Resolve Dispute Modal */}
      <Modal
        open={Boolean(resolveTarget)}
        title="Resolve Missing-Reward Dispute"
        subtitle={resolveTarget?.offer_title || undefined}
        onClose={() => setResolveTarget(null)}
        busy={resolving}
      >
        <form onSubmit={(e) => void handleResolveDispute(e)} className="space-y-4">
          <div>
            <label htmlFor="disp-status" className="mb-1 block text-xs font-medium text-slate-300">
              Resolution Status
            </label>
            <select
              id="disp-status"
              value={disputeForm.status}
              onChange={(e) =>
                setDisputeForm((f) => ({
                  ...f,
                  status: e.target.value as 'open' | 'investigating' | 'resolved' | 'rejected',
                }))
              }
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 text-sm text-slate-100"
            >
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {canManageBalances ? (
            <div>
              <label htmlFor="disp-credit" className="mb-1 block text-xs font-medium text-slate-300">
                Optional Goodwill / Missing Credit (USD)
              </label>
              <input
                id="disp-credit"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00 (leave blank for no credit)"
                value={disputeForm.creditAmount}
                onChange={(e) => setDisputeForm((f) => ({ ...f, creditAmount: e.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-800 bg-[#070B19] px-3 font-mono text-sm text-slate-100"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="disp-note" className="mb-1 block text-xs font-medium text-slate-300">
              Admin Resolution Note
            </label>
            <textarea
              id="disp-note"
              required
              rows={3}
              value={disputeForm.adminNote}
              onChange={(e) => setDisputeForm((f) => ({ ...f, adminNote: e.target.value }))}
              placeholder="Verified completion with partner postback log"
              className="w-full rounded-lg border border-slate-800 bg-[#070B19] p-3 text-sm text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={resolving}
              onClick={() => setResolveTarget(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resolving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {resolving ? 'Saving...' : 'Submit Resolution'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
