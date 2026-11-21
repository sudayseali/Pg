import type { RecentTransaction } from '../types/admin';

export type ActivityWindow = '7D' | '30D' | '90D';

export interface DailyActivityPoint {
  dateKey: string;
  label: string;
  revenue: number;
  payouts: number;
  txCount: number;
}

export interface ActivitySeriesSummary {
  points: DailyActivityPoint[];
  totalRevenue: number;
  totalPayouts: number;
  maxValue: number;
  hasAnyActivity: boolean;
}

export interface SvgCoord {
  x: number;
  y: number;
}

export interface TransactionTypeMeta {
  label: string;
  tone: 'blue' | 'emerald' | 'violet' | 'slate';
  isOutflow: boolean;
}

const WINDOW_DAYS: Record<ActivityWindow, number> = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toUtcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(date: Date): string {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function isOutflowTransaction(tx: Pick<RecentTransaction, 'type' | 'amount'>): boolean {
  const normalizedType = (tx.type ?? '').toLowerCase();
  if (tx.amount < 0) return true;
  return (
    normalizedType.includes('withdraw') ||
    normalizedType.includes('payout') ||
    normalizedType.includes('deduct') ||
    normalizedType.includes('reversal')
  );
}

export function getTransactionBadgeMeta(type: string, amount = 0): TransactionTypeMeta {
  const lower = (type ?? '').toLowerCase();
  if (lower.includes('withdraw') || lower.includes('payout')) {
    return { label: 'Withdrawal', tone: 'blue', isOutflow: true };
  }
  if (lower.includes('task')) {
    return { label: 'Task Reward', tone: 'emerald', isOutflow: amount < 0 };
  }
  if (lower.includes('offer')) {
    return { label: 'Offer Reward', tone: 'violet', isOutflow: amount < 0 };
  }
  if (lower.includes('deduct') || lower.includes('revers')) {
    return { label: 'Adjustment', tone: 'slate', isOutflow: true };
  }
  const formatted = (type || 'Transaction')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
  return { label: formatted, tone: 'slate', isOutflow: amount < 0 };
}

export function buildDailyActivitySeries(
  transactions: RecentTransaction[],
  window: ActivityWindow,
  referenceNow: Date = new Date(),
): ActivitySeriesSummary {
  const daysCount = WINDOW_DAYS[window];
  const endUtc = new Date(
    Date.UTC(
      referenceNow.getUTCFullYear(),
      referenceNow.getUTCMonth(),
      referenceNow.getUTCDate(),
    ),
  );

  const buckets = new Map<string, DailyActivityPoint>();
  const orderedKeys: string[] = [];

  for (let offset = daysCount - 1; offset >= 0; offset -= 1) {
    const d = new Date(endUtc.getTime() - offset * 86_400_000);
    const key = toUtcDateKey(d);
    orderedKeys.push(key);
    buckets.set(key, {
      dateKey: key,
      label: formatShortDate(d),
      revenue: 0,
      payouts: 0,
      txCount: 0,
    });
  }

  let totalRevenue = 0;
  let totalPayouts = 0;

  for (const tx of transactions) {
    if (!tx.created_at) continue;
    const parsed = new Date(tx.created_at);
    if (Number.isNaN(parsed.getTime())) continue;

    const key = toUtcDateKey(parsed);
    const bucket = buckets.get(key);
    if (!bucket) continue;

    const absAmount = Math.abs(Number(tx.amount) || 0);
    bucket.txCount += 1;
    if (isOutflowTransaction(tx)) {
      bucket.payouts = Number((bucket.payouts + absAmount).toFixed(2));
      totalPayouts = Number((totalPayouts + absAmount).toFixed(2));
    } else {
      bucket.revenue = Number((bucket.revenue + absAmount).toFixed(2));
      totalRevenue = Number((totalRevenue + absAmount).toFixed(2));
    }
  }

  const points = orderedKeys.map((key) => buckets.get(key)!);
  let maxValue = 0;
  let hasAnyActivity = false;
  for (const pt of points) {
    if (pt.txCount > 0) hasAnyActivity = true;
    if (pt.revenue > maxValue) maxValue = pt.revenue;
    if (pt.payouts > maxValue) maxValue = pt.payouts;
  }

  return {
    points,
    totalRevenue,
    totalPayouts,
    maxValue,
    hasAnyActivity,
  };
}

export function buildSmoothSvgPath(coords: SvgCoord[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;

  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX.toFixed(2)} ${p0.y.toFixed(2)}, ${midX.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
}

export function buildAreaSvgPath(coords: SvgCoord[], baselineY: number): string {
  if (coords.length === 0) return '';
  const line = buildSmoothSvgPath(coords);
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${line} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}
