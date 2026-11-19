import type { ApiEnvelope } from '../types/admin';

export class StructuredApiError extends Error {
  code: string;
  status: number;
  timestamp?: string;

  constructor(message: string, code: string, status = 400, timestamp?: string) {
    super(message);
    this.name = 'StructuredApiError';
    this.code = code;
    this.status = status;
    this.timestamp = timestamp;
  }
}

export function unwrapAdminApiResponse<T>(envelope: ApiEnvelope<T>, httpStatus = 200): T {
  if (envelope && envelope.success === true) {
    return envelope.data;
  }
  const errCode = (envelope && 'code' in envelope && envelope.code) || 'UNKNOWN_API_ERROR';
  const errMessage =
    (envelope && 'error' in envelope && envelope.error) || 'Unexpected API error occurred.';
  const ts = envelope && 'timestamp' in envelope ? envelope.timestamp : undefined;
  throw new StructuredApiError(errMessage, errCode, httpStatus, ts);
}

export function formatUsd(value: number | string | null | undefined): string {
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(safe);
}

export function formatNumber(value: number | string | null | undefined): string {
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return new Intl.NumberFormat('en-US').format(safe);
}

export function formatPercent(value: number | string | null | undefined): string {
  const numeric = typeof value === 'string' ? Number.parseFloat(value) : Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `${safe.toFixed(1)}%`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function truncateMiddle(value: string | null | undefined, start = 8, end = 6): string {
  if (!value) return '—';
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function isRejectedTelegramEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@telegram.local');
}

export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isImageUrl(url: string | null | undefined): boolean {
  if (!isSafeHttpUrl(url)) return false;
  const normalized = url!.trim().toLowerCase();
  const pathPart = normalized.split('?')[0];
  if (/\.(png|jpe?g|webp|gif|bmp|avif|svg)$/.test(pathPart)) {
    return true;
  }
  // Signed Supabase Storage URLs for proof images
  if (
    normalized.includes('/storage/v1/object/sign/') &&
    (normalized.includes('proof') ||
      normalized.includes('submission') ||
      normalized.includes('token='))
  ) {
    return true;
  }
  return false;
}

export function validateRejectReason(reason: string): { valid: boolean; error?: string } {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Rejection reason must be at least 3 characters.' };
  }
  return { valid: true };
}

export function validateBalanceAdjustment(
  amountRaw: string | number,
  reason: string,
): { valid: boolean; amount?: number; error?: string } {
  const amount = typeof amountRaw === 'string' ? Number.parseFloat(amountRaw) : amountRaw;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: 'Adjustment amount must be greater than $0.00.' };
  }
  if (reason.trim().length < 3) {
    return { valid: false, error: 'Audit reason must be at least 3 characters.' };
  }
  return { valid: true, amount };
}

export function generateIdempotencyKey(prefix = 'bal'): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const key = `${prefix}-${randomPart}`;
  return key.length >= 8 ? key : `${key}-00000000`;
}

export function getTaskCompletedCount(task: {
  current_completions?: number | null;
  completions_count?: number | null;
}): number {
  return task.current_completions ?? task.completions_count ?? 0;
}

export function validateTelegramChatId(chatIdRaw: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const trimmed = chatIdRaw.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Telegram Channel / Group ID is required for Instant Bot Verify tasks.',
    };
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('t.me/+') || lower.includes('t.me/joinchat/')) {
    return {
      valid: false,
      error:
        'Private invite links (t.me/+... or t.me/joinchat/...) cannot be used as the Chat ID. Enter the numeric -100... chat ID here and put the invite link in Target URL.',
    };
  }

  if (/^-\d{5,}$/.test(trimmed) || /^@[a-zA-Z0-9_]{4,}$/.test(trimmed)) {
    return { valid: true, normalized: trimmed };
  }

  return {
    valid: false,
    error: 'Enter a valid @channel_username or numeric chat ID (e.g. -1001234567890).',
  };
}

export function parseJobLengthMinutes(raw: string | number | undefined): number | undefined {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : undefined;
  }
  if (!raw) return undefined;
  const match = raw.trim().match(/\d+/);
  if (!match) return undefined;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export interface AutoTelegramProofInfo {
  isAuto: boolean;
  metadata?: string;
  chatId?: string;
  memberStatus?: string;
}

export function parseAutoTelegramProof(
  proofValue: string | null | undefined,
): AutoTelegramProofInfo {
  if (!proofValue) return { isAuto: false };
  const trimmed = proofValue.trim();
  if (!trimmed.startsWith('auto_telegram_join:')) {
    return { isAuto: false };
  }

  const remainder = trimmed.slice('auto_telegram_join:'.length).trim();
  if (!remainder) {
    return { isAuto: true };
  }

  const parts = remainder
    .split(/[:|]/)
    .map((p) => p.trim())
    .filter(Boolean);

  let chatId: string | undefined;
  let memberStatus: string | undefined;

  for (const part of parts) {
    if (part.startsWith('status=')) {
      memberStatus = part.slice('status='.length);
    } else if (part.startsWith('chat=')) {
      chatId = part.slice('chat='.length);
    } else if (!chatId && (part.startsWith('@') || /^-?\d{5,}$/.test(part))) {
      chatId = part;
    } else if (!memberStatus) {
      memberStatus = part;
    }
  }

  return {
    isAuto: true,
    metadata: remainder,
    chatId,
    memberStatus,
  };
}

