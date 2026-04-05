import type { KangurRouteHealth, KangurRouteLatencyStats, KangurRouteMetrics, KangurObservabilityRange } from '@/shared/contracts/kangur-observability';
import { SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS } from '@/shared/lib/observability/workers/system-log-alerts/config';
import { KANGUR_ROUTE_DEFINITIONS } from './summary.constants';
import { toPercent } from './summary.analytics';

export const buildEmptyRouteHealth = (source: string): KangurRouteHealth => ({
  metrics: null,
  latency: null,
  investigation: {
    label: 'Inspect route logs',
    href: `/admin/system/logs?source=${encodeURIComponent(source)}`,
  },
});

export const emptyRouteMetrics = (): KangurRouteMetrics => ({
  authMeGet: buildEmptyRouteHealth(KANGUR_ROUTE_DEFINITIONS.authMeGet.source),
  learnerSignInPost: buildEmptyRouteHealth(KANGUR_ROUTE_DEFINITIONS.learnerSignInPost.source),
  progressPatch: buildEmptyRouteHealth(KANGUR_ROUTE_DEFINITIONS.progressPatch.source),
  scoresPost: buildEmptyRouteHealth(KANGUR_ROUTE_DEFINITIONS.scoresPost.source),
  assignmentsPost: buildEmptyRouteHealth(KANGUR_ROUTE_DEFINITIONS.assignmentsPost.source),
  learnersPost: buildEmptyRouteHealth(KANGUR_ROUTE_DEFINITIONS.learnersPost.source),
  ttsPost: buildEmptyRouteHealth(KANGUR_ROUTE_DEFINITIONS.ttsPost.source),
});

export const percentile = (values: number[], value: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left: number, right: number) => left - right);
  const rank = Math.max(0, Math.ceil((value / 100) * sorted.length) - 1);
  return sorted[Math.min(rank, sorted.length - 1)] ?? null;
};

export const buildRouteLatencyStats = (
  durations: number[],
  slowThresholdMs: number = SYSTEM_LOG_SLOW_REQUEST_THRESHOLD_MS
): KangurRouteLatencyStats | null => {
  if (durations.length === 0) return null;
  const totalDurationMs = durations.reduce((sum: number, current: number) => sum + current, 0);
  const maxDurationMs = durations.reduce(
    (currentMax: number, current: number) => Math.max(currentMax, current),
    0
  );
  const slowRequestCount = durations.filter((durationMs: number) => durationMs >= slowThresholdMs).length;
  return {
    sampleSize: durations.length,
    avgDurationMs: Math.round(totalDurationMs / durations.length),
    p95DurationMs: percentile(durations, 95),
    maxDurationMs,
    slowRequestCount,
    slowRequestRatePercent: toPercent(slowRequestCount, durations.length),
    slowThresholdMs,
  };
};

export const buildSystemLogsHref = (input: {
  query?: string;
  source?: string;
  level?: 'info' | 'warn' | 'error';
  minDurationMs?: number;
  from: Date;
  to: Date;
}): string => {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.source) params.set('source', input.source);
  if (input.level) params.set('level', input.level);
  if (typeof input.minDurationMs === 'number' && Number.isFinite(input.minDurationMs)) {
    params.set('minDurationMs', String(Math.max(0, Math.round(input.minDurationMs))));
  }
  params.set('from', input.from.toISOString());
  params.set('to', input.to.toISOString());
  return `/admin/system/logs?${params.toString()}`;
};

export const resolveKangurObservabilityRangeWindow = (
  range: KangurObservabilityRange,
  now: Date = new Date()
): { from: Date; to: Date } => {
  const to = new Date(now);
  const from = new Date(now);
  if (range === '7d') {
    from.setUTCDate(from.getUTCDate() - 7);
  } else if (range === '30d') {
    from.setUTCDate(from.getUTCDate() - 30);
  } else {
    from.setUTCHours(from.getUTCHours() - 24);
  }
  return { from, to };
};
