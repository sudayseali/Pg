import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, Lock, Mail, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { isRejectedTelegramEmail } from '../lib/formatters';

export function LoginPage() {
  const { admin, authError, loading, signingIn, signIn, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#070B19] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Payvora Admin Console
            </h1>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-[#0F172A] p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-100">Administrator Sign-In</h2>
            <p className="mt-1 text-sm text-slate-400">
              Sign in with your verified Payvora administrator credentials.
            </p>
          </div>

          {!configured ? (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-amber-300">Environment Configuration Required</p>
                <p className="mt-1 leading-relaxed text-amber-200/80">
                  Set <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> in your environment
                  to connect to the backend.
                </p>
              </div>
            </div>
          ) : null}

          {displayedError ? (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200"
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
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
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
                  className="h-11 w-full rounded-lg border border-slate-800 bg-[#070B19] pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder="Enter administrator password"
                  className="h-11 w-full rounded-lg border border-slate-800 bg-[#070B19] pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingIn ? 'Verifying Credentials...' : 'Sign In to Console'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Authorized Payvora administrator access only
        </p>
      </div>
    </div>
  );
}
