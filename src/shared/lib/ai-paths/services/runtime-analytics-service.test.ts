import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getRedisConnectionMock,
  getRuntimeAnalyticsAvailabilityMock,
  buildSummaryCacheKeyMock,
  readCachedSummaryMock,
  setCachedSummaryMock,
  readStaleSummaryMock,
  summaryInFlight,
  emptySummaryMock,
  loadRuntimeTraceAnalyticsMock,
  withTimeoutMock,
  toPipelineCountMock,
  toPipelineStringsMock,
  parseDurationMemberMock,
  clampRateMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getRedisConnectionMock: vi.fn(),
  getRuntimeAnalyticsAvailabilityMock: vi.fn(),
  buildSummaryCacheKeyMock: vi.fn(),
  readCachedSummaryMock: vi.fn(),
  setCachedSummaryMock: vi.fn(),
  readStaleSummaryMock: vi.fn(),
  summaryInFlight: new Map<string, Promise<unknown>>(),
  emptySummaryMock: vi.fn(),
  loadRuntimeTraceAnalyticsMock: vi.fn(),
  withTimeoutMock: vi.fn(),
  toPipelineCountMock: vi.fn(),
  toPipelineStringsMock: vi.fn(),
  parseDurationMemberMock: vi.fn(),
  clampRateMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: getRedisConnectionMock,
}));

vi.mock('@/shared/lib/ai-paths/services/runtime-analytics/availability', () => ({
  getRuntimeAnalyticsAvailability: getRuntimeAnalyticsAvailabilityMock,
}));

vi.mock('@/shared/lib/ai-paths/services/runtime-analytics/cache', () => ({
  buildSummaryCacheKey: buildSummaryCacheKeyMock,
  readCachedSummary: readCachedSummaryMock,
  setCachedSummary: setCachedSummaryMock,
  summaryInFlight,
  readStaleSummary: readStaleSummaryMock,
}));

vi.mock('@/shared/lib/ai-paths/services/runtime-analytics/config', () => ({
  keyRuns: (status: string) => `runs:${status}`,
  keyDurations: () => 'durations',
  keyNodes: (status: string) => `nodes:${status}`,
  keyBrain: (status: string) => `brain:${status}`,
  DURATION_SAMPLE_LIMIT: 200,
  SUMMARY_QUERY_TIMEOUT_MS: 5000,
}));

vi.mock('@/shared/lib/ai-paths/services/runtime-analytics/trace', () => ({
  emptySummary: emptySummaryMock,
  loadRuntimeTraceAnalytics: loadRuntimeTraceAnalyticsMock,
}));

vi.mock('@/shared/lib/ai-paths/services/runtime-analytics/utils', () => ({
  withTimeout: withTimeoutMock,
  toPipelineCount: toPipelineCountMock,
  toPipelineStrings: toPipelineStringsMock,
  parseDurationMember: parseDurationMemberMock,
  clampRate: clampRateMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

import { getRuntimeAnalyticsSummary } from '@/shared/lib/ai-paths/services/runtime-analytics-service';

describe('getRuntimeAnalyticsSummary', () => {
  const from = new Date('2026-03-22T10:00:00.000Z');
  const to = new Date('2026-03-22T11:00:00.000Z');

  beforeEach(() => {
    summaryInFlight.clear();
    getRedisConnectionMock.mockReset();
    getRuntimeAnalyticsAvailabilityMock.mockReset();
    buildSummaryCacheKeyMock.mockReset();
    readCachedSummaryMock.mockReset();
    setCachedSummaryMock.mockReset();
    readStaleSummaryMock.mockReset();
    emptySummaryMock.mockReset();
    loadRuntimeTraceAnalyticsMock.mockReset();
    withTimeoutMock.mockReset();
    toPipelineCountMock.mockReset();
    toPipelineStringsMock.mockReset();
    parseDurationMemberMock.mockReset();
    clampRateMock.mockReset();
    captureExceptionMock.mockReset();
    logWarningMock.mockReset();

    buildSummaryCacheKeyMock.mockReturnValue('cache-key');
    readCachedSummaryMock.mockReturnValue(null);
    readStaleSummaryMock.mockReturnValue(null);
    withTimeoutMock.mockImplementation(async (promise: Promise<unknown>) => await promise);
    toPipelineCountMock.mockImplementation((value: unknown) =>
      typeof value === 'number' ? value : Number.parseInt(String(value ?? 0), 10) || 0
    );
    toPipelineStringsMock.mockImplementation((value: unknown) =>
      Array.isArray(value) ? (value as string[]) : []
    );
    parseDurationMemberMock.mockImplementation((member: string) => Number(member));
    clampRateMock.mockImplementation((value: number) => Number(value.toFixed(1)));
    loadRuntimeTraceAnalyticsMock.mockResolvedValue({
      slowestRuns: [],
      failureReasons: [],
    });
  });

  it('returns cached summaries once analytics storage is available', async () => {
    const cached = {
      from: from.toISOString(),
      to: to.toISOString(),
      range: '24h',
      storage: 'redis',
    };
    getRuntimeAnalyticsAvailabilityMock.mockResolvedValue({
      enabled: true,
      storage: 'redis',
    });
    getRedisConnectionMock.mockReturnValue({
      pipeline: vi.fn(),
    });
    readCachedSummaryMock.mockReturnValue(cached);

    await expect(getRuntimeAnalyticsSummary({ from, to }, '24h')).resolves.toBe(cached as never);
    expect(getRuntimeAnalyticsAvailabilityMock).toHaveBeenCalledTimes(1);
    expect(getRedisConnectionMock).toHaveBeenCalledTimes(1);
  });

  it('returns an empty summary when runtime analytics are disabled', async () => {
    const emptySummary = {
      from: from.toISOString(),
      to: to.toISOString(),
      range: '7d',
      storage: 'disabled',
    };
    getRuntimeAnalyticsAvailabilityMock.mockResolvedValue({
      enabled: false,
      storage: 'memory',
    });
    emptySummaryMock.mockReturnValue(emptySummary);

    await expect(getRuntimeAnalyticsSummary({ from, to }, '7d')).resolves.toBe(emptySummary as never);
    expect(emptySummaryMock).toHaveBeenCalledWith(from, to, '7d');
    expect(getRedisConnectionMock).not.toHaveBeenCalled();
  });

  it('builds and caches a redis-backed summary from runtime counters', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(123456789);

    getRuntimeAnalyticsAvailabilityMock.mockResolvedValue({
      enabled: true,
      storage: 'redis',
    });

    const pipeline = {
      zcount: vi.fn().mockReturnThis(),
      zrangebyscore: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, 10],
        [null, 2],
        [null, 9],
        [null, 8],
        [null, 1],
        [null, 0],
        [null, 1],
        [null, 2],
        [null, 3],
        [null, 11],
        [null, 10],
        [null, 1],
        [null, 4],
        [null, 5],
        [null, 6],
        [null, 7],
        [null, 8],
        [null, 9],
        [null, 12],
        [null, ['150', '50']],
      ]),
    };
    getRedisConnectionMock.mockReturnValue({
      pipeline: vi.fn(() => pipeline),
    });

    const summary = await getRuntimeAnalyticsSummary({ from, to }, 'custom');

    expect(summary).toEqual({
      from: from.toISOString(),
      to: to.toISOString(),
      range: 'custom',
      storage: 'redis',
      runs: {
        total: 10,
        queued: 2,
        started: 9,
        completed: 8,
        failed: 1,
        canceled: 0,
        successRate: 88.9,
        failureRate: 11.1,
        avgDurationMs: 100,
        p95DurationMs: 150,
      },
      nodes: {
        started: 1,
        completed: 2,
        failed: 3,
        queued: 11,
        running: 10,
        polling: 1,
        cached: 4,
        waitingCallback: 5,
      },
      brain: {
        analyticsReports: 6,
        logReports: 7,
        totalReports: 8,
        warningReports: 9,
        errorReports: 12,
      },
      traces: {
        slowestRuns: [],
        failureReasons: [],
      },
      generatedAt: expect.any(String),
    });
    expect(setCachedSummaryMock).toHaveBeenCalledWith('cache-key', summary, expect.any(Number));
  });
});
