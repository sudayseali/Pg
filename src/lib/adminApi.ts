import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from './supabase';
import { StructuredApiError, unwrapAdminApiResponse } from './formatters';
import type {
  AdminTeamMember,
  AntiFraudConfig,
  AntiFraudResponse,
  ApiEnvelope,
  AppSettingItem,
  GetAdminDataResponse,
  MicroTask,
  OfferAnalytics,
  OfferCommissionConfig,
  OfferConversionsResponse,
  OfferDispute,
  OfferProvidersResponse,
  PaginatedAuditLogsResponse,
  PaginatedOffersResponse,
  PaginatedSubmissionsResponse,
  PaginatedUsersResponse,
  PaginatedWithdrawalsResponse,
  ProviderSyncLog,
} from '../types/admin';

let unauthorizedHandler: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

export async function callAdminApi<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    if (unauthorizedHandler) unauthorizedHandler();
    throw new StructuredApiError(
      'Your administrator session has expired. Please sign in again.',
      'INVALID_TOKEN',
      401,
    );
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin_api`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  let parsed: ApiEnvelope<T>;
  try {
    parsed = (await response.json()) as ApiEnvelope<T>;
  } catch {
    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw new StructuredApiError(
      `Admin API returned an invalid response (HTTP ${response.status}).`,
      response.status === 401 ? 'INVALID_TOKEN' : 'INVALID_RESPONSE',
      response.status,
    );
  }

  try {
    return unwrapAdminApiResponse(parsed, response.status);
  } catch (err) {
    if (
      err instanceof StructuredApiError &&
      (err.status === 401 || err.code === 'INVALID_TOKEN')
    ) {
      if (unauthorizedHandler) unauthorizedHandler();
    }
    throw err;
  }
}

export const adminApi = {
  // A. Dashboard Overview
  getAdminData: () => callAdminApi<GetAdminDataResponse>('get_admin_data'),
  getDashboardStats: () => callAdminApi<GetAdminDataResponse>('get_dashboard_stats'),

  // B. User & Wallet Management
  getUsers: (params: { page: number; limit: number; search?: string }) =>
    callAdminApi<PaginatedUsersResponse>('get_users', params),

  updateUserStatus: (params: {
    userId: string;
    status: 'active' | 'suspended';
    reason: string;
  }) => callAdminApi<{ user: unknown }>('update_user_status', params),

  adjustUserBalance: (params: {
    userId: string;
    amount: number;
    type: 'credit' | 'deduct';
    reason: string;
    idempotencyKey: string;
  }) => callAdminApi<{ balance?: number; transaction?: unknown }>('adjust_user_balance', params),

  // C. Withdrawals Management
  getWithdrawals: (params: {
    status: 'pending' | 'approved' | 'rejected' | 'all';
    page: number;
    limit: number;
  }) => callAdminApi<PaginatedWithdrawalsResponse>('get_withdrawals', params),

  approveWithdrawal: (params: { withdrawalId: string; txHash?: string; note?: string }) =>
    callAdminApi<{ withdrawal: unknown }>('approve_withdrawal', params),

  rejectWithdrawal: (params: { withdrawalId: string; reason: string }) =>
    callAdminApi<{ withdrawal: unknown }>('reject_withdrawal', params),

  // D. Micro-Tasks & Proof Verification
  getTasks: () => callAdminApi<{ tasks: MicroTask[] }>('get_tasks'),

  createTask: (params: {
    title: string;
    description: string;
    category: string;
    reward: number;
    maxCompletions: number;
    targetUrl: string;
    jobLength?: string;
    proofInstructions?: string;
  }) => callAdminApi<{ task: MicroTask }>('create_task', params),

  updateTaskStatus: (params: {
    taskId: string;
    status: 'active' | 'paused' | 'completed' | 'archived';
  }) => callAdminApi<{ task: MicroTask }>('update_task_status', params),

  getSubmissions: (params: {
    status: 'pending' | 'approved' | 'rejected' | 'all';
    page: number;
    limit: number;
  }) => callAdminApi<PaginatedSubmissionsResponse>('get_submissions', params),

  reviewSubmission: (params: {
    submissionId: string;
    decision: 'approved' | 'rejected';
    comment?: string;
  }) => callAdminApi<{ submission: unknown }>('review_submission', params),

  // E. Custom Offers Engine & Partner Marketplace
  getOfferProviders: () => callAdminApi<OfferProvidersResponse>('get_offer_providers'),

  updateOfferProvider: (params: {
    providerKey: string;
    status?: string;
    apiEnabled?: boolean;
    customListingEnabled?: boolean;
    syncEnabled?: boolean;
    commissionOverridePercent?: number | null;
    hostedWallUrlTemplate?: string | null;
  }) => callAdminApi<{ provider: unknown }>('update_offer_provider', params),

  updateCommissionConfig: (params: OfferCommissionConfig) =>
    callAdminApi<{ commissionConfig: OfferCommissionConfig }>('update_commission_config', {
      ...params,
    }),

  triggerOfferSync: (params: { providerKey?: string; country?: string }) =>
    callAdminApi<{ results?: unknown; synced?: number }>('trigger_offer_sync', params),

  getProviderSyncLogs: (params: { limit: number }) =>
    callAdminApi<{ logs: ProviderSyncLog[] }>('get_provider_sync_logs', params),

  getAdminOffers: (params: {
    page: number;
    limit: number;
    category?: string;
    search?: string;
  }) => callAdminApi<PaginatedOffersResponse>('get_admin_offers', params),

  updateAdminOffer: (params: { offerId: string; isActive?: boolean; isFeatured?: boolean }) =>
    callAdminApi<{ offer: unknown }>('update_admin_offer', params),

  getOfferConversions: (params: { limit: number }) =>
    callAdminApi<OfferConversionsResponse>('get_offer_conversions', params),

  getOfferDisputes: (params: {
    status: 'open' | 'investigating' | 'resolved' | 'rejected' | 'all';
  }) => callAdminApi<{ disputes: OfferDispute[] }>('get_offer_disputes', params),

  resolveOfferDispute: (params: {
    disputeId: string;
    status: 'open' | 'investigating' | 'resolved' | 'rejected';
    adminNote: string;
    creditAmount?: number;
  }) => callAdminApi<{ dispute: OfferDispute }>('resolve_offer_dispute', params),

  getOfferAnalytics: () => callAdminApi<{ analytics: OfferAnalytics }>('get_offer_analytics'),

  // F. Anti-Fraud & VPN Controls
  getAntiFraudConfig: () => callAdminApi<AntiFraudResponse>('get_anti_fraud_config'),

  updateAntiFraudConfig: (params: AntiFraudConfig) =>
    callAdminApi<{ config: AntiFraudConfig }>('update_anti_fraud_config', { ...params }),

  // G. System Settings, Audit Logs & Admin Team
  getSettings: () => callAdminApi<{ settings: AppSettingItem[] }>('get_settings'),

  updateSetting: (params: { key: string; value: unknown }) =>
    callAdminApi<{ setting: AppSettingItem }>('update_setting', params),

  getAuditLogs: (params: { page: number; limit: number }) =>
    callAdminApi<PaginatedAuditLogsResponse>('get_audit_logs', params),

  getAdmins: () => callAdminApi<{ admins: AdminTeamMember[] }>('get_admins'),

  updateAdminRole: (params: {
    targetAdminId: string;
    role: string;
    status: string;
  }) => callAdminApi<{ admin: AdminTeamMember }>('update_admin_role', params),
};
