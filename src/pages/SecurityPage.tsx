import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/adminApi';
import { hasPermission } from '../lib/rbac';
import { formatDateTime } from '../lib/formatters';
import { AccessDenied } from '../components/ui/AccessDenied';
import { TableSkeleton } from '../components/ui/Skeletons';
import type { AntiFraudConfig, AntiFraudSecretsStatus, VpnBlockEvent } from '../types/admin';

const DEFAULT_CONFIG: AntiFraudConfig = {
  vpn_detection_enabled: false,
  max_daily_withdrawals: 3,
  block_vpn_on_offers: true,
  block_vpn_on_tasks: true,
  block_vpn_on_checkin: false,
  block_vpn_on_withdraw: true,
  block_vpn_on_auth: false,
  block_hosting_ips: true,
  vpn_risk_threshold: 65,
  strict_fail_closed: false,
};

export function SecurityPage() {
  const { admin } = useAuth();
  const { pushToast } = useToast();

  const permitted = hasPermission(admin?.role, 'manage_settings');

  const [config, setConfig] = useState<AntiFraudConfig>(DEFAULT_CONFIG);
  const [secretsStatus, setSecretsStatus] = useState<AntiFraudSecretsStatus>({
    proxycheckConfigured: false,
    ipapiConfigured: false,
    anyConfigured: false,
  });
  const [recentBlocks, setRecentBlocks] = useState<VpnBlockEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!permitted) return;
    setLoading(true);
    try {
      const res = await adminApi.getAntiFraudConfig();
      if (res.config) setConfig(res.config);
      if (res.secretsStatus) setSecretsStatus(res.secretsStatus);
      setRecentBlocks(res.recentVpnBlocks ?? []);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load anti-fraud configuration',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [permitted, pushToast]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  if (!permitted) {
    return <AccessDenied role={admin?.role} required="Anti-Fraud & VPN Controls" />;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await adminApi.updateAntiFraudConfig(config);
      pushToast({
        variant: 'success',
        title: 'Anti-fraud rules saved',
        description: 'Live VPN and withdrawal guardrails updated.',
      });
      await loadConfig();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const switches: { key: keyof AntiFraudConfig; label: string; desc: string }[] = [
    {
      key: 'vpn_detection_enabled',
      label: 'Master VPN Detection',
      desc: 'Enable IP intelligence checks across gated actions.',
    },
    {
      key: 'block_vpn_on_offers',
      label: 'Block VPN on Offerwall Clicks',
      desc: 'Reject offer redirects from proxy or VPN exit nodes.',
    },
    {
      key: 'block_vpn_on_tasks',
      label: 'Block VPN on Micro-Tasks',
      desc: 'Prevent task submissions from masked connections.',
    },
    {
      key: 'block_vpn_on_checkin',
      label: 'Block VPN on Daily Check-In',
      desc: 'Disallow daily streak claims behind VPNs.',
    },
    {
      key: 'block_vpn_on_withdraw',
      label: 'Block VPN on Withdrawals',
      desc: 'Require residential IP before requesting payouts.',
    },
    {
      key: 'block_vpn_on_auth',
      label: 'Block VPN on Authentication',
      desc: 'Block user session initialization over VPNs.',
    },
    {
      key: 'block_hosting_ips',
      label: 'Block Datacenter / Hosting ASNs',
      desc: 'Reject traffic from cloud servers (AWS, GCP, DigitalOcean).',
    },
    {
      key: 'strict_fail_closed',
      label: 'Strict Fail-Closed Mode',
      desc: 'Deny requests if upstream IP intelligence provider times out.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Anti-Fraud & VPN Controls
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure IP intelligence providers, risk thresholds, and recent VPN block telemetry.
        </p>
      </div>

      {/* Secrets Status Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="fintech-card rounded-xl p-4">
          <p className="text-xs text-slate-400">PROXYCHECK_KEY</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium">
            {secretsStatus.proxycheckConfigured ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-300">Configured</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span className="text-amber-300">Not Configured</span>
              </>
            )}
          </div>
        </div>
        <div className="fintech-card rounded-xl p-4">
          <p className="text-xs text-slate-400">IPAPI_KEY</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium">
            {secretsStatus.ipapiConfigured ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-300">Configured</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span className="text-amber-300">Not Configured</span>
              </>
            )}
          </div>
        </div>
        <div className="fintech-card rounded-xl p-4">
          <p className="text-xs text-slate-400">Engine Readiness</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium">
            {secretsStatus.anyConfigured ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-300">Provider Active</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 text-red-400" />
                <span className="text-red-300">No Provider Key Set</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Config Form */}
      <form
        onSubmit={(e) => void handleSave(e)}
        className="fintech-card rounded-xl p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {switches.map((sw) => {
            const checked = Boolean(config[sw.key]);
            return (
              <label
                key={sw.key}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-800 bg-[#060913] p-4 transition-colors hover:border-slate-700"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{sw.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{sw.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [sw.key]: e.target.checked }))
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                />
              </label>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-800/80 pt-6 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              <label htmlFor="vpn-threshold" className="text-slate-300">
                VPN Risk Score Threshold
              </label>
              <span className="font-mono text-sm font-semibold tabular-nums text-blue-400">
                {config.vpn_risk_threshold} / 100
              </span>
            </div>
            <input
              id="vpn-threshold"
              type="range"
              min={20}
              max={100}
              step={1}
              value={config.vpn_risk_threshold}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  vpn_risk_threshold: Number.parseInt(e.target.value, 10) || 65,
                }))
              }
              className="w-full accent-blue-600"
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-500">
              <span>20 (Strictest)</span>
              <span>100 (Lenient)</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="max-daily-withdrawals"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Max Daily Withdrawals per User
            </label>
            <input
              id="max-daily-withdrawals"
              type="number"
              min={1}
              max={100}
              value={config.max_daily_withdrawals}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  max_daily_withdrawals: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
              className="h-10 w-full rounded-lg border border-slate-800 bg-[#060913] px-3 font-mono text-sm text-slate-100"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving Rules...' : 'Save Anti-Fraud Policy'}
          </button>
        </div>
      </form>

      {/* Recent VPN Blocks */}
      <div className="overflow-hidden fintech-card rounded-xl">
        <div className="border-b border-slate-800/80 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-100">Recent VPN & Proxy Blocks</h2>
        </div>
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : recentBlocks.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-slate-400">
            No blocked VPN attempts recorded recently.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800/80 bg-[#060913] text-slate-400">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">IP Address</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3 text-right">Risk Score</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentBlocks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3 text-slate-200">
                      {b.username ? `@${b.username}` : b.user_id || 'Anonymous'}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-300">
                      {b.ip_address || '—'} {b.country ? `(${b.country})` : ''}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-300">{b.action_type || '—'}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-red-400">
                      {b.risk_score ?? '—'}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-slate-300">
                      {b.reason || 'VPN / Proxy detected'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-400">
                      {formatDateTime(b.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
