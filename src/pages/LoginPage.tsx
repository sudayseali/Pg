import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { isRejectedTelegramEmail } from '../lib/formatters';
import { BrandMark } from '../components/ui/BrandMark';

export function LoginPage() {
  const { admin, authError, loading, signingIn, signIn, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!loading && admin) {
      navigate('/', { replace: true });
    }
  }, [loading, admin, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Administrator email address is required.');
      return;
    }
    if (isRejectedTelegramEmail(trimmedEmail)) {
      setLocalError(
        'Accounts ending in @telegram.local are rejected by Payvora admin policy. Use an authorized administrator email.',
      );
      return;
    }
    if (!password) {
      setLocalError('Password is required.');
      return;
    }

    await signIn(trimmedEmail, password);
  }

  const displayedError = localError || authError?.message || null;
  const errorCode = authError?.code;

  const capabilities = [
    {
      title: 'Settlement & Ledger Governance',
      desc: 'Review USDT and TRX withdrawal queues, record settlement hashes, and execute idempotent wallet adjustments.',
    },
    {
      title: 'Automated & Manual Task Verification',
      desc: 'Publish Telegram micro-tasks with instant bot membership checks or signed screenshot proof review.',
    },
    {
      title: 'Offerwall & Anti-Fraud Telemetry',
      desc: 'Manage partner revenue splits, scheduled offer sync pipelines, postback signature audits, and VPN policies.',
    },
  ];

  return (
    <div className="fintech-grid-bg relative flex min-h-screen bg-[#050914] text-slate-100">
      {/* Subtle top ambient gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(ellipse_75%_60%_at_50%_-15%,rgba(56,189,248,0.14),transparent)]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-10">
        {/* Left Institutional Showcase Column */}
        <section className="hidden lg:col-span-7 lg:flex lg:flex-col lg:justify-between lg:pr-8">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark size="md" />
              <span className="text-lg font-bold tracking-[0.04em] text-slate-50">
                PAYVORA OPERATIONS
              </span>
            </div>

            <h1 className="mt-10 max-w-xl text-4xl font-bold leading-[1.15] tracking-tight text-slate-50 text-balance">
              Treasury, Payouts, and Marketplace Operations
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
              Centralized control plane for Payvora financial settlements, Telegram micro-task
              verification, offerwall partner splits, and anti-fraud enforcement.
            </p>

            <div className="mt-10 divide-y divide-slate-800/80 border-y border-slate-800/80">
              {capabilities.map((cap, idx) => (
                <div key={cap.title} className="grid grid-cols-12 gap-4 py-5">
                  <div className="col-span-1 font-mono text-xs font-medium text-blue-400">
                    0{idx + 1}.
                  </div>
                  <div className="col-span-11">
                    <h2 className="text-sm font-semibold text-slate-100">{cap.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{cap.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 text-xs text-slate-500">
            Role-based access control · Cryptographic audit trail · Server-enforced permissions
          </p>
        </section>

        {/* Right Sign-In Card */}
        <section className="mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <BrandMark size="md" />
            <span className="text-xl font-bold tracking-tight text-slate-100">
              Payvora Admin Console
            </span>
          </div>

          <div className="fintech-card rounded-2xl p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-50">
                Administrator Sign-In
              </h2>
              <p className="mt-1.5 text-sm text-slate-400">
                Enter your verified administrator credentials to access the console.
              </p>
            </div>

            {displayedError ? (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  {errorCode ? (
                    <p className="font-mono text-[11px] font-semibold text-red-300 break-all">
                      {errorCode}
                    </p>
                  ) : null}
                  <p className="mt-0.5 leading-relaxed break-words">{displayedError}</p>
                </div>
              </div>
            ) : null}

            <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="ops@payvora.io"
                    className="h-11 w-full rounded-lg border border-slate-800 bg-[#060913] pl-10 pr-3.5 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="Enter administrator password"
                    className="h-11 w-full rounded-lg border border-slate-800 bg-[#060913] pl-10 pr-10 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={signingIn}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-400/20 bg-gradient-to-b from-blue-500 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all hover:from-blue-400 hover:to-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{signingIn ? 'Verifying Credentials...' : 'Sign In to Console'}</span>
                {!signingIn ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>

            {!configured ? (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200/90"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-amber-300">Environment Configuration Required</p>
                  <p className="mt-0.5 leading-relaxed text-amber-200/75">
                    Set <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> in your
                    environment to enable administrator authentication.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Authorized Payvora administrator access only
          </p>
        </section>
      </div>
    </div>
  );
}
