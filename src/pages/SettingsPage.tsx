import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../lib/adminApi';
import { hasPermission } from '../lib/rbac';
import { formatDateTime } from '../lib/formatters';
import { AccessDenied } from '../components/ui/AccessDenied';
import { TableSkeleton } from '../components/ui/Skeletons';
import type { AppSettingItem } from '../types/admin';

export function SettingsPage() {
  const { admin } = useAuth();
  const { pushToast } = useToast();

  const permitted = hasPermission(admin?.role, 'manage_settings');
  const [settings, setSettings] = useState<AppSettingItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!permitted) return;
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      const list = res.settings ?? [];
      setSettings(list);
      const initialDrafts: Record<string, string> = {};
      for (const s of list) {
        initialDrafts[s.key] =
          typeof s.value === 'string' ? s.value : JSON.stringify(s.value, null, 2);
      }
      setDrafts(initialDrafts);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load settings',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [permitted, pushToast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (!permitted) {
    return <AccessDenied role={admin?.role} required="System Settings" />;
  }

  async function handleSaveSetting(item: AppSettingItem) {
    if (savingKey) return;
    const raw = drafts[item.key] ?? '';
    let parsedValue: unknown = raw;
    if (typeof item.value !== 'string') {
      try {
        parsedValue = JSON.parse(raw);
      } catch {
        pushToast({
          variant: 'error',
          title: 'Invalid JSON value',
          description: `Setting "${item.key}" requires valid JSON.`,
        });
        return;
      }
    }

    setSavingKey(item.key);
    try {
      await adminApi.updateSetting({ key: item.key, value: parsedValue });
      pushToast({
        variant: 'success',
        title: 'Setting saved',
        description: item.key,
      });
      await loadSettings();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to update setting',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">System Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Inspect and update runtime keys in <span className="font-mono">app_settings</span>.
        </p>
      </div>

      <div className="fintech-card overflow-hidden rounded-xl">
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : settings.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No settings entries returned.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {settings.map((item) => {
              const isMultiline = (drafts[item.key] ?? '').includes('\n') || typeof item.value === 'object';
              return (
                <div
                  key={item.key}
                  className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-12 lg:items-start"
                >
                  <div className="lg:col-span-4">
                    <p className="font-mono text-sm font-semibold text-slate-100">{item.key}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                    ) : null}
                    {item.updated_at ? (
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        Updated {formatDateTime(item.updated_at)}
                      </p>
                    ) : null}
                  </div>
                  <div className="lg:col-span-6">
                    {isMultiline ? (
                      <textarea
                        rows={4}
                        aria-label={`Value for ${item.key}`}
                        value={drafts[item.key] ?? ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [item.key]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-800 bg-[#060913] p-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        aria-label={`Value for ${item.key}`}
                        value={drafts[item.key] ?? ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [item.key]: e.target.value }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-800 bg-[#060913] px-3 font-mono text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                      />
                    )}
                  </div>
                  <div className="flex justify-end lg:col-span-2">
                    <button
                      type="button"
                      disabled={savingKey === item.key}
                      onClick={() => void handleSaveSetting(item)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{savingKey === item.key ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
