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

describe('kangur observability alerts', () => {
  it('flags sign-in failure rate warnings when enough attempts exist', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      serverLogMetrics: createServerLogMetrics({ total: 100, errors: 1 }),
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
  });

  it('treats tts fallback rate as insufficient data below the minimum sample', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
      analytics: createAnalyticsSnapshot(),
      ttsRequestCount: 5,
      ttsFallbackCount: 2,
      performanceBaseline: null,
    });

    const ttsAlert = alerts.find((alert) => alert.id === 'kangur-tts-fallback-rate');
    expect(ttsAlert?.status).toBe('insufficient_data');
    expect(ttsAlert?.value).toBe(40);
  });

  it('marks the performance baseline warning when the latest e2e run is infra-failed', () => {
    const alerts = __testables.buildKangurObservabilityAlerts({
      range: '24h',
      serverLogMetrics: createServerLogMetrics({ total: 50, errors: 0 }),
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
  });
});
