import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { adminApi, registerUnauthorizedHandler } from '../lib/adminApi';
import { isRejectedTelegramEmail, StructuredApiError } from '../lib/formatters';
import type { AdminProfile, DashboardStats, RecentTransaction } from '../types/admin';

export interface AuthErrorState {
  code: string;
  message: string;
}

interface AuthContextValue {
  admin: AdminProfile | null;
  stats: DashboardStats | null;
  recentTransactions: RecentTransaction[];
  openDisputesCount: number;
  loading: boolean;
  signingIn: boolean;
  authError: AuthErrorState | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshAdminData: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [openDisputesCount, setOpenDisputesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<AuthErrorState | null>(null);

  const handleUnauthorized = useCallback(() => {
    setAdmin(null);
    setStats(null);
    setRecentTransactions([]);
    setOpenDisputesCount(0);
    void supabase.auth.signOut();
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    return registerUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  const hydrateAdminSession = useCallback(async () => {
    setAuthError(null);
    try {
      const data = await adminApi.getAdminData();
      setAdmin(data.admin);
      setStats(data.stats);
      setRecentTransactions(data.recentTransactions ?? []);

      if (typeof data.stats?.openDisputes === 'number') {
        setOpenDisputesCount(data.stats.openDisputes);
      } else {
        try {
          const analyticsRes = await adminApi.getOfferAnalytics();
          setOpenDisputesCount(analyticsRes.analytics?.openDisputes ?? 0);
        } catch {
          // Optional secondary badge count; ignore if analytics fails
        }
      }
      return true;
    } catch (err) {
      if (err instanceof StructuredApiError) {
        if (err.code === 'FORBIDDEN_NOT_ADMIN' || err.code === 'FORBIDDEN_INACTIVE_ADMIN') {
          setAuthError({ code: err.code, message: err.message });
          setAdmin(null);
          setStats(null);
          setRecentTransactions([]);
          await supabase.auth.signOut();
          return false;
        }
        if (err.code === 'INVALID_TOKEN' || err.status === 401) {
          setAuthError({ code: 'INVALID_TOKEN', message: err.message });
          handleUnauthorized();
          return false;
        }
        setAuthError({ code: err.code, message: err.message });
        return false;
      }
      setAuthError({
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Unable to reach Payvora Admin API.',
      });
      return false;
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!isSupabaseConfigured()) {
        if (active) setLoading(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (active) setLoading(false);
        return;
      }

      await hydrateAdminSession();
      if (active) setLoading(false);
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setAdmin(null);
        setStats(null);
        setRecentTransactions([]);
        setOpenDisputesCount(0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [hydrateAdminSession]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthError(null);
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        setAuthError({
          code: 'VALIDATION_ERROR',
          message: 'Email and password are both required.',
        });
        return false;
      }

      if (isRejectedTelegramEmail(trimmedEmail)) {
        setAuthError({
          code: 'FORBIDDEN_TELEGRAM_DOMAIN',
          message:
            'Accounts ending in @telegram.local cannot access the Admin Console. Sign in with an administrator email.',
        });
        return false;
      }

      if (!isSupabaseConfigured()) {
        setAuthError({
          code: 'MISSING_SUPABASE_CONFIG',
          message:
            'VITE_SUPABASE_ANON_KEY is not configured. Add it to your environment before signing in.',
        });
        return false;
      }

      setSigningIn(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          setAuthError({
            code: 'AUTH_INVALID_CREDENTIALS',
            message: error.message,
          });
          return false;
        }

        const hydrated = await hydrateAdminSession();
        if (hydrated) {
          navigate('/', { replace: true });
        }
        return hydrated;
      } finally {
        setSigningIn(false);
      }
    },
    [hydrateAdminSession, navigate],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAdmin(null);
    setStats(null);
    setRecentTransactions([]);
    setOpenDisputesCount(0);
    setAuthError(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const refreshAdminData = useCallback(async () => {
    await hydrateAdminSession();
  }, [hydrateAdminSession]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        admin,
        stats,
        recentTransactions,
        openDisputesCount,
        loading,
        signingIn,
        authError,
        signIn,
        signOut,
        refreshAdminData,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
