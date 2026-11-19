export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'finance_admin'
  | 'finance'
  | 'moderator'
  | 'support';

export type Permission =
  | 'view_dashboard'
  | 'manage_users'
  | 'manage_balances'
  | 'manage_tasks'
  | 'review_submissions'
  | 'manage_withdrawals'
  | 'view_transactions'
  | 'manage_settings'
  | 'view_audit_logs'
  | 'manage_admins';

export interface AdminProfile {
  id?: string;
  email: string;
  role: AdminRole;
  fullName?: string;
  full_name?: string;
  status?: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  last_login_at?: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeTasks: number;
  pendingWithdrawals: number;
  pendingSubmissions: number;
  totalTreasuryBalance: number;
  totalPlatformEarned: number;
  totalPaidOut: number;
  openDisputes?: number;
}

export interface RecentTransaction {
  id: string;
  user_id?: string;
  username?: string;
  user_email?: string;
  telegram_id?: string | number;
  type: string;
  amount: number;
  status?: string;
  description?: string;
  reference?: string;
  created_at: string;
}

export interface GetAdminDataResponse {
  admin: AdminProfile;
  stats: DashboardStats;
  recentTransactions: RecentTransaction[];
}

export interface AppUser {
  id: string;
  telegram_id?: string | number | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  balance: number;
  total_earned?: number;
  status: 'active' | 'suspended';
  suspension_reason?: string | null;
  referral_code?: string | null;
  referred_by?: string | null;
  created_at: string;
  last_active_at?: string | null;
}

export interface PaginatedUsersResponse {
  users: AppUser[];
  total: number;
  page: number;
  limit: number;
}

export interface WithdrawalRecord {
  id: string;
  user_id: string;
  username?: string | null;
  first_name?: string | null;
  telegram_id?: string | number | null;
  amount: number;
  fee?: number;
  net_amount?: number;
  method: string;
  destination_address: string;
  status: 'pending' | 'approved' | 'rejected';
  tx_hash?: string | null;
  admin_note?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  processed_at?: string | null;
  processed_by?: string | null;
  user?: {
    id: string;
    username?: string | null;
    first_name?: string | null;
    telegram_id?: string | number | null;
    balance?: number;
  };
}

export interface PaginatedWithdrawalsResponse {
  withdrawals: WithdrawalRecord[];
  total: number;
  page: number;
  limit: number;
}

export type TaskVerificationType = 'manual_screenshot' | 'auto_telegram_join';

export interface MicroTask {
  id: string;
  title: string;
  description: string;
  category: string;
  reward: number;
  max_completions: number;
  current_completions?: number;
  completions_count?: number;
  target_url: string;
  job_length?: string | number;
  proof_instructions?: string;
  verification_type?: TaskVerificationType;
  verification_chat_id?: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  user_id: string;
  task_title?: string;
  task_reward?: number;
  username?: string | null;
  first_name?: string | null;
  telegram_id?: string | number | null;
  proof_text?: string | null;
  proof_data?: string | null;
  proof_url?: string | null;
  proof_signed_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_comment?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  task?: {
    id: string;
    title: string;
    reward: number;
    category?: string;
  };
  user?: {
    id: string;
    username?: string | null;
    first_name?: string | null;
    telegram_id?: string | number | null;
  };
}

export interface PaginatedSubmissionsResponse {
  submissions: TaskSubmission[];
  total: number;
  page: number;
  limit: number;
}

export interface OfferProviderRuntimeStatus {
  configuredForApi: boolean;
  configuredForPostback: boolean;
  supportsCustomListing: boolean;
  supportsHostedWall: boolean;
  supportsReversal: boolean;
  missingSecrets: string[];
}

export interface OfferProvider {
  provider_key: string;
  display_name: string;
  integration_type: string;
  status: string;
  api_enabled: boolean;
  custom_listing_enabled: boolean;
  sync_enabled: boolean;
  commission_override_percent: number | null;
  hosted_wall_url_template: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  runtimeStatus: OfferProviderRuntimeStatus;
}

export interface OfferCommissionConfig {
  default_user_share_percent: number;
  min_user_reward_usd: number;
  max_user_reward_usd: number;
  provider_user_share_overrides: Record<string, number>;
}

export interface OfferProvidersResponse {
  providers: OfferProvider[];
  commissionConfig: OfferCommissionConfig;
}

export interface ProviderSyncLog {
  id: string;
  provider_key: string;
  status: string;
  offers_fetched?: number;
  offers_upserted?: number;
  offers_deactivated?: number;
  duration_ms?: number;
  error_message?: string | null;
  created_at: string;
}

export interface AdminOffer {
  id: string;
  provider_key: string;
  external_offer_id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  provider_payout_usd: number;
  user_reward_usd: number;
  countries?: string[] | null;
  devices?: string[] | null;
  image_url?: string | null;
  is_active: boolean;
  is_featured: boolean;
  clicks_count?: number;
  conversions_count?: number;
  updated_at?: string;
}

export interface PaginatedOffersResponse {
  offers: AdminOffer[];
  total: number;
  page: number;
  limit: number;
}

export interface OfferConversion {
  id: string;
  offer_id?: string;
  offer_title?: string;
  provider_key: string;
  user_id: string;
  username?: string | null;
  provider_payout_usd: number;
  user_reward_usd: number;
  net_margin_usd?: number;
  status: string;
  is_reversed?: boolean;
  transaction_id?: string | null;
  created_at: string;
}

export interface ProviderPostback {
  id: string;
  provider_key: string;
  external_tx_id?: string | null;
  signature_valid: boolean | null;
  processing_status: string;
  payout_usd?: number | null;
  error_message?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface OfferConversionsResponse {
  conversions: OfferConversion[];
  postbacks: ProviderPostback[];
}

export interface OfferDispute {
  id: string;
  user_id: string;
  username?: string | null;
  telegram_id?: string | number | null;
  offer_id?: string | null;
  offer_title?: string | null;
  provider_key?: string | null;
  expected_reward_usd?: number | null;
  description: string;
  proof_url?: string | null;
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  admin_note?: string | null;
  credited_amount?: number | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface OfferAnalytics {
  activeOffers: number;
  totalClicks: number;
  totalConversions: number;
  reversalRatePercent: number;
  totalProviderPayout: number;
  totalUserRewards: number;
  totalNetMargin: number;
  openDisputes: number;
}

export interface AntiFraudConfig {
  vpn_detection_enabled: boolean;
  max_daily_withdrawals: number;
  block_vpn_on_offers: boolean;
  block_vpn_on_tasks: boolean;
  block_vpn_on_checkin: boolean;
  block_vpn_on_withdraw: boolean;
  block_vpn_on_auth: boolean;
  block_hosting_ips: boolean;
  vpn_risk_threshold: number;
  strict_fail_closed: boolean;
}

export interface AntiFraudSecretsStatus {
  proxycheckConfigured: boolean;
  ipapiConfigured: boolean;
  anyConfigured: boolean;
}

export interface VpnBlockEvent {
  id: string;
  user_id?: string | null;
  username?: string | null;
  ip_address?: string | null;
  action_type?: string | null;
  provider?: string | null;
  risk_score?: number | null;
  reason?: string | null;
  country?: string | null;
  created_at: string;
}

export interface AntiFraudResponse {
  config: AntiFraudConfig;
  secretsStatus: AntiFraudSecretsStatus;
  recentVpnBlocks: VpnBlockEvent[];
}

export interface AppSettingItem {
  key: string;
  value: unknown;
  description?: string | null;
  updated_at?: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id?: string;
  admin_email?: string;
  admin_role?: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: Record<string, unknown> | unknown;
  ip_address?: string | null;
  created_at: string;
}

export interface PaginatedAuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminTeamMember {
  id: string;
  email: string;
  full_name?: string | null;
  role: AdminRole;
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  last_login_at?: string | null;
}

export interface ApiEnvelopeSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiEnvelopeError {
  success: false;
  error: string;
  code: string;
  timestamp: string;
}

export type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeError;
