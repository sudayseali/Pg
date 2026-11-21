import { useId, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  type ActivityWindow,
  buildAreaSvgPath,
  buildDailyActivitySeries,
  buildSmoothSvgPath,
} from '../../lib/activityChart';
import { formatUsd } from '../../lib/formatters';
import type { RecentTransaction } from '../../types/admin';

interface PlatformActivityChartProps {
  transactions: RecentTransaction[];
  timeframe: ActivityWindow;
  onTimeframeChange: (next: ActivityWindow) => void;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 228;
const PAD_LEFT = 54;
const PAD_RIGHT = 18;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;
const PLOT_WIDTH = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

function formatCompactAxisUsd(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}

export function PlatformActivityChart({
  transactions,
  timeframe,
  onTimeframeChange,
}: PlatformActivityChartProps) {
  const uid = useId().replace(/:/g, '');
  const revGradId = `pv-revenue-fill-${uid}`;
  const payGradId = `pv-payouts-fill-${uid}`;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const summary = useMemo(
    () => buildDailyActivitySeries(transactions, timeframe),
    [transactions, timeframe],
  );

  const yCeiling = useMemo(() => {
    if (summary.maxValue <= 0) return 100;
    const raw = summary.maxValue * 1.18;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / magnitude;
    const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return Math.max(10, Math.ceil((normalized * magnitude) / (step * magnitude / 4)) * (step * magnitude / 4));
  }, [summary.maxValue]);

  const { revenueCoords, payoutsCoords, labelIndices } = useMemo(() => {
    const pts = summary.points;
    const count = Math.max(1, pts.length);
    const rev = pts.map((pt, idx) => {
      const x = count === 1 ? PAD_LEFT + PLOT_WIDTH / 2 : PAD_LEFT + (idx / (count - 1)) * PLOT_WIDTH;
      const y = PAD_TOP + PLOT_HEIGHT - (pt.revenue / yCeiling) * PLOT_HEIGHT;
      return { x, y };
    });
    const pay = pts.map((pt, idx) => {
      const x = count === 1 ? PAD_LEFT + PLOT_WIDTH / 2 : PAD_LEFT + (idx / (count - 1)) * PLOT_WIDTH;
      const y = PAD_TOP + PLOT_HEIGHT - (pt.payouts / yCeiling) * PLOT_HEIGHT;
      return { x, y };
    });

    const tickCount = Math.min(5, count);
    const indices: number[] = [];
    if (count <= 5) {
      for (let i = 0; i < count; i += 1) indices.push(i);
    } else {
      for (let i = 0; i < tickCount; i += 1) {
        indices.push(Math.round((i / (tickCount - 1)) * (count - 1)));
      }
    }

    return { revenueCoords: rev, payoutsCoords: pay, labelIndices: indices };
  }, [summary.points, yCeiling]);

  const baselineY = PAD_TOP + PLOT_HEIGHT;
  const revenueLine = buildSmoothSvgPath(revenueCoords);
  const revenueArea = buildAreaSvgPath(revenueCoords, baselineY);
  const payoutsLine = buildSmoothSvgPath(payoutsCoords);
  const payoutsArea = buildAreaSvgPath(payoutsCoords, baselineY);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: yCeiling * ratio,
    y: baselineY - ratio * PLOT_HEIGHT,
  }));

  const hoveredPoint =
    hoveredIdx !== null && hoveredIdx >= 0 && hoveredIdx < summary.points.length
      ? summary.points[hoveredIdx]
      : null;

  return (
    <section
      aria-label="Platform Activity"
      className="fintech-card flex flex-col justify-between rounded-2xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-400">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-50">
              Platform Activity
            </h2>
            <p className="text-xs text-slate-400">
              Daily credits vs. payouts across recent ledger activity
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
              <span>Credits</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-violet-400" aria-hidden="true" />
              <span>Payouts</span>
            </span>
          </div>

          <div
            role="group"
            aria-label="Activity timeframe"
            className="flex items-center gap-1 rounded-lg border border-slate-800/90 bg-[#050914] p-1"
          >
            {(['7D', '30D', '90D'] as ActivityWindow[]).map((win) => (
              <button
                key={win}
                type="button"
                onClick={() => {
                  onTimeframeChange(win);
                  setHoveredIdx(null);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  timeframe === win
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {win}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-5">
        {hoveredPoint && hoveredIdx !== null ? (
          <div className="pointer-events-none absolute right-3 top-2 z-10 rounded-lg border border-slate-700/80 bg-[#050914]/95 px-3 py-2 text-xs shadow-xl backdrop-blur-xs">
            <p className="font-semibold text-slate-100">{hoveredPoint.label}</p>
            <div className="mt-1 space-y-0.5 font-mono tabular-nums">
              <p className="text-sky-300">Credits: {formatUsd(hoveredPoint.revenue)}</p>
              <p className="text-violet-300">Payouts: {formatUsd(hoveredPoint.payouts)}</p>
            </div>
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-56 w-full select-none overflow-visible"
          role="img"
          aria-label={`Platform activity chart over ${timeframe}`}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={revGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={payGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={PAD_LEFT}
                y1={tick.y}
                x2={CHART_WIDTH - PAD_RIGHT}
                y2={tick.y}
                stroke="rgba(148, 163, 184, 0.1)"
                strokeDasharray="3 3"
              />
              <text
                x={PAD_LEFT - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-500 font-mono text-[11px]"
              >
                {formatCompactAxisUsd(tick.value)}
              </text>
            </g>
          ))}

          {/* X-Axis Labels */}
          {labelIndices.map((idx) => {
            const pt = summary.points[idx];
            const coord = revenueCoords[idx];
            if (!pt || !coord) return null;
            return (
              <text
                key={pt.dateKey}
                x={coord.x}
                y={CHART_HEIGHT - 6}
                textAnchor="middle"
                className="fill-slate-400 text-[11px]"
              >
                {pt.label}
              </text>
            );
          })}

          {summary.hasAnyActivity ? (
            <>
              <path d={payoutsArea} fill={`url(#${payGradId})`} />
              <path d={revenueArea} fill={`url(#${revGradId})`} />

              <path
                d={payoutsLine}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
              <path
                d={revenueLine}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Hover vertical guide */}
              {hoveredIdx !== null && revenueCoords[hoveredIdx] ? (
                <line
                  x1={revenueCoords[hoveredIdx].x}
                  y1={PAD_TOP}
                  x2={revenueCoords[hoveredIdx].x}
                  y2={baselineY}
                  stroke="rgba(148, 163, 184, 0.35)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              ) : null}

              {/* Data Nodes (only render dots explicitly for 7D or hovered point for crispness) */}
              {summary.points.map((pt, idx) => {
                const rc = revenueCoords[idx];
                const pc = payoutsCoords[idx];
                const showDots = summary.points.length <= 10 || hoveredIdx === idx;
                return (
                  <g key={pt.dateKey}>
                    {showDots ? (
                      <>
                        <circle
                          cx={pc.x}
                          cy={pc.y}
                          r={hoveredIdx === idx ? 4.5 : 3}
                          fill="#A78BFA"
                          stroke="#091022"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={rc.x}
                          cy={rc.y}
                          r={hoveredIdx === idx ? 5 : 3.5}
                          fill="#38BDF8"
                          stroke="#091022"
                          strokeWidth="1.5"
                        />
                      </>
                    ) : null}
                    <rect
                      x={rc.x - PLOT_WIDTH / (summary.points.length * 2)}
                      y={PAD_TOP}
                      width={Math.max(12, PLOT_WIDTH / summary.points.length)}
                      height={PLOT_HEIGHT}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIdx(idx)}
                    />
                  </g>
                );
              })}
            </>
          ) : (
            <text
              x={PAD_LEFT + PLOT_WIDTH / 2}
              y={PAD_TOP + PLOT_HEIGHT / 2}
              textAnchor="middle"
              className="fill-slate-500 text-xs"
            >
              No recent ledger entries recorded in this {timeframe} window
            </text>
          )}
        </svg>
      </div>
    </section>
  );
}
