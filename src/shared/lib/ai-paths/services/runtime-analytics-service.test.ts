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
  parseDurationMemberMock,
  clampRateMock,
  captureExceptionMock,
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
  parseDurationMemberMock: vi.fn(),
  clampRateMock: vi.fn(),
  captureExceptionMock: vi.fn(),
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
  SUMMARY_QUERY_TIMEOUT_MS: 5000,
}));

vi.mock('@/shared/lib/ai-paths/services/runtime-analytics/trace', () => ({
  emptySummary: emptySummaryMock,
  loadRuntimeTraceAnalytics: loadRuntimeTraceAnalyticsMock,
}));

vi.mock('@/shared/lib/ai-paths/services/runtime-analytics/utils', () => ({
  withTimeout: withTimeoutMock,
  parseDurationMember: parseDurationMemberMock,
  clampRate: clampRateMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
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
    parseDurationMemberMock.mockReset();
    clampRateMock.mockReset();
    captureExceptionMock.mockReset();

    buildSummaryCacheKeyMock.mockReturnValue('cache-key');
    readCachedSummaryMock.mockReturnValue(null);
    readStaleSummaryMock.mockReturnValue(null);
    withTimeoutMock.mockImplementation(async (promise: Promise<unknown>) => await promise);
    parseDurationMemberMock.mockImplementation((member: string) => Number(member));
    clampRateMock.mockImplementation((value: number) => Number(value.toFixed(1)));
    loadRuntimeTraceAnalyticsMock.mockResolvedValue({
      slowestRuns: [],
      failureReasons: [],
    });
  });

  it('returns cached summaries before hitting availability or redis', async () => {
    const cached = {
      from: from.toISOString(),
      to: to.toISOString(),
      range: '24h',
      storage: 'redis',
    };
    readCachedSummaryMock.mockReturnValue(cached);

    await expect(getRuntimeAnalyticsSummary({ from, to }, '24h')).resolves.toBe(cached as never);
    expect(getRuntimeAnalyticsAvailabilityMock).not.toHaveBeenCalled();
    expect(getRedisConnectionMock).not.toHaveBeenCalled();
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

    const redis = {
      zcount: vi
        .fn()
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(9)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(11)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(9)
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(13)
        .mockResolvedValueOnce(14)
        .mockResolvedValueOnce(15),
      zrangebyscore: vi.fn().mockResolvedValue(['150', '50']),
    };
    getRedisConnectionMock.mockReturnValue(redis);

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
        deadLettered: 1,
        blockedOnLease: 2,
        handoffReady: 3,
        successRate: 80,
        failureRate: 10,
        deadLetterRate: 10,
        avgDurationMs: 100,
        p95DurationMs: 150,
      },
      nodes: {
        started: 11,
        completed: 10,
        failed: 1,
        queued: 4,
        running: 5,
        polling: 6,
        cached: 7,
        waitingCallback: 8,
      },
      brain: {
        analyticsReports: 9,
        logReports: 12,
        totalReports: 21,
        warningReports: 13,
        errorReports: 14,
      },
      traces: {
        slowestRuns: [],
        failureReasons: [],
      },
      generatedAt: expect.any(String),
    });
    expect(setCachedSummaryMock).toHaveBeenCalledWith('cache-key', summary, 123456789);
  });
});
