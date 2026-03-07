import { describe, expect, it } from 'vitest';

import { __testables } from './summary';

const createAnalyticsSnapshot = (overrides?: {
  signInSuccess?: number;
  signInFailure?: number;
  progressSyncFailure?: number;
}): {
  totals: { events: number; pageviews: number };
  visitors: number;
  sessions: number;
  topPaths: Array<{ path: string; count: number }>;
  topEventNames: Array<{ name: string; count: number }>;
  importantEvents: Array<{ name: string; count: number }>;
  recent: never[];
} => ({
  totals: { events: 0, pageviews: 0 },
  visitors: 0,
  sessions: 0,
  topPaths: [],
  topEventNames: [],
  importantEvents: [
    {
      name: 'kangur_learner_signin_succeeded',
      count: overrides?.signInSuccess ?? 0,
    },
    {
      name: 'kangur_learner_signin_failed',
      count: overrides?.signInFailure ?? 0,
    },
    {
      name: 'kangur_progress_sync_failed',
      count: overrides?.progressSyncFailure ?? 0,
    },
  ],
  recent: [],
});

const createServerLogMetrics = (input: {
  total: number;
  errors: number;
}): {
  total: number;
  levels: { info: number; warn: number; error: number };
  last24Hours: number;
  last7Days: number;
  topSources: never[];
  topServices: never[];
  topPaths: never[];
  generatedAt: string;
} => ({
  total: input.total,
  levels: {
    info: Math.max(0, input.total - input.errors),
    warn: 0,
    error: input.errors,
  },
  last24Hours: input.total,
  last7Days: input.total,
  topSources: [],
  topServices: [],
  topPaths: [],
  generatedAt: '2026-03-07T12:00:00.000Z',
});

const createRouteHealth = (
  source: string,
  overrides?: {
    latency?: {
      sampleSize: number;
      avgDurationMs: number | null;
      p95DurationMs: number | null;
      maxDurationMs: number | null;
      slowRequestCount: number;
      slowRequestRatePercent: number | null;
      slowThresholdMs: number;
    } | null;
  }
) => ({
  metrics: null,
  latency: overrides?.latency ?? null,
  investigation: {
    label: 'Inspect route logs',
    href: `/admin/system/logs?source=${encodeURIComponent(source)}`,
  },
});

const createRouteMetrics = (overrides?: {
  progressPatchLatency?: {
    sampleSize: number;
    avgDurationMs: number | null;
    p95DurationMs: number | null;
    maxDurationMs: number | null;
    slowRequestCount: number;
    slowRequestRatePercent: number | null;
    slowThresholdMs: number;
  } | null;
}) => ({
  authMeGet: createRouteHealth('kangur.auth.me.GET'),
  learnerSignInPost: createRouteHealth('kangur.auth.learnerSignIn.POST'),
  progressPatch: createRouteHealth('kangur.progress.PATCH', {
    latency: overrides?.progressPatchLatency ?? null,
  }),
  scoresPost: createRouteHealth('kangur.scores.POST'),
  assignmentsPost: createRouteHealth('kangur.assignments.POST'),
  learnersPost: createRouteHealth('kangur.learners.POST'),
  ttsPost: createRouteHealth('kangur.tts.POST'),
});

describe('kangur observability alerts', () => {
  it('flags sign-in failure rate warnings when enough attempts exist', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 100, errors: 1 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot({ signInSuccess: 19, signInFailure: 1 }),
      ttsRequestCount: 20,
      ttsFallbackCount: 1,
      performanceBaseline: {
        generatedAt: '2026-03-07T12:00:00.000Z',
        unitStatus: 'pass',
        unitDurationMs: 1000,
        e2eStatus: 'pass',
        e2eDurationMs: 2000,
        infraFailures: 0,
        failedRuns: 0,
        bundleRiskTotalBytes: 100,
        bundleRiskTotalLines: 10,
      },
    });

    const signInAlert = alerts.find((alert) => alert.id === 'kangur-learner-signin-failure-rate');
    expect(signInAlert?.status).toBe('warning');
    expect(signInAlert?.value).toBe(5);
    expect(signInAlert?.investigation).toEqual({
      label: 'Review sign-in analytics',
      href: '/admin/kangur/observability?range=24h#recent-analytics-events',
    });
  });

  it('treats tts fallback rate as insufficient data below the minimum sample', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot(),
      ttsRequestCount: 5,
      ttsFallbackCount: 2,
      performanceBaseline: null,
    });

    const ttsAlert = alerts.find((alert) => alert.id === 'kangur-tts-fallback-rate');
    expect(ttsAlert?.status).toBe('insufficient_data');
    expect(ttsAlert?.value).toBe(40);
    expect(ttsAlert?.investigation).toEqual({
      label: 'View fallback logs',
      href: '/admin/system/logs?source=kangur.tts.fallback&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z',
    });
  });

  it('marks the performance baseline warning when the latest e2e run is infra-failed', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics(),
      analytics: createAnalyticsSnapshot(),
      ttsRequestCount: 20,
      ttsFallbackCount: 0,
      performanceBaseline: {
        generatedAt: '2026-03-07T12:00:00.000Z',
        unitStatus: 'pass',
        unitDurationMs: 1000,
        e2eStatus: 'infra_fail',
        e2eDurationMs: 2000,
        infraFailures: 1,
        failedRuns: 0,
        bundleRiskTotalBytes: 100,
        bundleRiskTotalLines: 10,
      },
    });

    const performanceAlert = alerts.find((alert) => alert.id === 'kangur-performance-baseline');
    expect(performanceAlert?.status).toBe('warning');
    expect(performanceAlert?.investigation).toEqual({
      label: 'Open baseline details',
      href: '/admin/kangur/observability?range=24h#performance-baseline',
    });
  });

  it('flags progress sync latency when p95 exceeds the slow-request threshold', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      from: new Date('2026-03-06T12:00:00.000Z'),
      to: new Date('2026-03-07T12:00:00.000Z'),
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      routeMetrics: createRouteMetrics({
        progressPatchLatency: {
          sampleSize: 12,
          avgDurationMs: 420,
          p95DurationMs: 980,
          maxDurationMs: 1200,
          slowRequestCount: 3,
          slowRequestRatePercent: 25,
          slowThresholdMs: 750,
        },
      }),
      analytics: createAnalyticsSnapshot(),
      ttsRequestCount: 20,
      ttsFallbackCount: 0,
      performanceBaseline: null,
    });

    const latencyAlert = alerts.find((alert) => alert.id === 'kangur-progress-sync-latency');
    expect(latencyAlert?.status).toBe('warning');
    expect(latencyAlert?.value).toBe(980);
    expect(latencyAlert?.investigation).toEqual({
      label: 'View slow sync logs',
      href: '/admin/system/logs?source=kangur.progress.PATCH&minDurationMs=750&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z',
    });
  });
});

describe('kangur route latency stats', () => {
  it('computes sample, avg, p95, and slow-request rate for route durations', () => {
    const latency = __testables.buildRouteLatencyStats([120, 250, 400, 800, 900], 750);

    expect(latency).toEqual({
      sampleSize: 5,
      avgDurationMs: 494,
      p95DurationMs: 900,
      maxDurationMs: 900,
      slowRequestCount: 2,
      slowRequestRatePercent: 40,
      slowThresholdMs: 750,
    });
  });
});
