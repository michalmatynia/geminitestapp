import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getRedisConnectionMock,
  getRuntimeAnalyticsAvailabilityMock,
  buildSummaryCacheKeyMock,
  readCachedSummaryMock,
  readStaleSummaryMock,
  setCachedSummaryMock,
  emptySummaryMock,
  emptyTraceAnalyticsMock,
  loadRuntimeTraceAnalyticsMock,
  withTimeoutMock,
  toPipelineCountMock,
  toPipelineStringsMock,
  parseDurationMemberMock,
  clampRateMock,
  captureExceptionMock,
  logWarningMock,
  summaryInFlight,
} = vi.hoisted(() => ({
  getRedisConnectionMock: vi.fn(),
  getRuntimeAnalyticsAvailabilityMock: vi.fn(),
  buildSummaryCacheKeyMock: vi.fn(),
  readCachedSummaryMock: vi.fn(),
  readStaleSummaryMock: vi.fn(),
  setCachedSummaryMock: vi.fn(),
  emptySummaryMock: vi.fn(),
  emptyTraceAnalyticsMock: vi.fn(),
  loadRuntimeTraceAnalyticsMock: vi.fn(),
  withTimeoutMock: vi.fn(),
  toPipelineCountMock: vi.fn(),
  toPipelineStringsMock: vi.fn(),
  parseDurationMemberMock: vi.fn(),
  clampRateMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
  summaryInFlight: new Map<string, Promise<unknown>>(),
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: getRedisConnectionMock,
}));

vi.mock('../availability', () => ({
  getRuntimeAnalyticsAvailability: getRuntimeAnalyticsAvailabilityMock,
}));

vi.mock('../cache', () => ({
  buildSummaryCacheKey: buildSummaryCacheKeyMock,
  readCachedSummary: readCachedSummaryMock,
  readStaleSummary: readStaleSummaryMock,
  setCachedSummary: setCachedSummaryMock,
  summaryInFlight,
}));

vi.mock('../trace', () => ({
  emptySummary: emptySummaryMock,
  emptyTraceAnalytics: emptyTraceAnalyticsMock,
  loadRuntimeTraceAnalytics: loadRuntimeTraceAnalyticsMock,
}));

vi.mock('../utils', () => ({
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

import {
  getRuntimeAnalyticsSummaryBase,
  resolveRuntimeAnalyticsRangeWindow,
} from '../summary';

describe('runtime analytics summary', () => {
  beforeEach(() => {
    summaryInFlight.clear();
    getRedisConnectionMock.mockReset();
    getRuntimeAnalyticsAvailabilityMock.mockReset();
    buildSummaryCacheKeyMock.mockReset();
    readCachedSummaryMock.mockReset();
    readStaleSummaryMock.mockReset();
    setCachedSummaryMock.mockReset();
    emptySummaryMock.mockReset();
    emptyTraceAnalyticsMock.mockReset();
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
    emptyTraceAnalyticsMock.mockReturnValue({
      source: 'none',
      sampledRuns: 0,
    });
    loadRuntimeTraceAnalyticsMock.mockResolvedValue({
      source: 'db_sample',
      sampledRuns: 1,
    });
    withTimeoutMock.mockImplementation(async (promise: Promise<unknown>) => await promise);
    toPipelineCountMock.mockImplementation((value: unknown) =>
      typeof value === 'number' ? value : Number.parseInt(String(value ?? 0), 10) || 0
    );
    toPipelineStringsMock.mockImplementation((value: unknown) =>
      Array.isArray(value) ? (value as string[]) : []
    );
    parseDurationMemberMock.mockImplementation((member: string) => Number(member));
    clampRateMock.mockImplementation((value: number) => Number(value.toFixed(1)));
  });

  it('resolves time windows relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-22T12:00:00.000Z'));

    expect(resolveRuntimeAnalyticsRangeWindow('1h')).toEqual({
      from: new Date('2026-03-22T11:00:00.000Z'),
      to: new Date('2026-03-22T12:00:00.000Z'),
    });

    vi.useRealTimers();
  });

  it('returns empty summaries when analytics or redis are unavailable', async () => {
    const fallback = {
      from: '2026-03-22T10:00:00.000Z',
      to: '2026-03-22T11:00:00.000Z',
      range: '24h',
      storage: 'disabled',
    };
    getRuntimeAnalyticsAvailabilityMock.mockResolvedValueOnce({
      enabled: false,
      storage: 'disabled',
    });
    emptySummaryMock.mockReturnValue(fallback);

    const from = new Date('2026-03-22T10:00:00.000Z');
    const to = new Date('2026-03-22T11:00:00.000Z');
    await expect(getRuntimeAnalyticsSummaryBase({ from, to, range: '24h' })).resolves.toBe(
      fallback as never
    );

    getRuntimeAnalyticsAvailabilityMock.mockResolvedValueOnce({
      enabled: true,
      storage: 'redis',
    });
    getRedisConnectionMock.mockReturnValueOnce(null);
    await expect(getRuntimeAnalyticsSummaryBase({ from, to, range: '24h' })).resolves.toBe(
      fallback as never
    );
  });

  it('builds and caches a summary from pipeline counters', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000);

    getRuntimeAnalyticsAvailabilityMock.mockResolvedValue({
      enabled: true,
      storage: 'redis',
    });
    const execResults = [
      [null, 20],
      [null, 4],
      [null, 18],
      [null, 12],
      [null, 3],
      [null, 1],
      [null, 2],
      [null, 5],
      [null, 6],
      [null, 30],
      [null, 22],
      [null, 2],
      [null, 7],
      [null, 8],
      [null, 9],
      [null, 10],
      [null, 11],
      [null, 13],
      [null, 17],
      [null, 30],
      [null, 19],
      [null, 23],
      [null, ['150', '50']],
    ];
    const pipeline = {
      zcount: vi.fn(),
      zrangebyscore: vi.fn(),
      exec: vi.fn().mockResolvedValue(execResults),
    };
    getRedisConnectionMock.mockReturnValue({
      pipeline: () => pipeline,
    });

    const summary = await getRuntimeAnalyticsSummaryBase({
      from: new Date('2026-03-22T10:00:00.000Z'),
      to: new Date('2026-03-22T11:00:00.000Z'),
      range: 'custom',
      includeTraces: false,
    });

    expect(summary).toEqual({
      from: '2026-03-22T10:00:00.000Z',
      to: '2026-03-22T11:00:00.000Z',
      range: 'custom',
      storage: 'redis',
      runs: {
        total: 20,
        queued: 4,
        started: 18,
        completed: 12,
        failed: 3,
        canceled: 1,
        deadLettered: 2,
        blockedOnLease: 5,
        handoffReady: 6,
        successRate: 66.7,
        failureRate: 33.3,
        deadLetterRate: 11.1,
        avgDurationMs: 100,
        p95DurationMs: 150,
      },
      nodes: {
        started: 30,
        completed: 22,
        failed: 2,
        queued: 7,
        running: 8,
        polling: 9,
        cached: 10,
        waitingCallback: 11,
      },
      brain: {
        analyticsReports: 13,
        logReports: 17,
        totalReports: 30,
        warningReports: 19,
        errorReports: 23,
      },
      traces: {
        source: 'none',
        sampledRuns: 0,
      },
      generatedAt: expect.any(String),
    });
    expect(setCachedSummaryMock).toHaveBeenCalledWith('cache-key', summary, 5_000);
  });

  it('returns stale cached summaries when the pipeline fails', async () => {
    const error = new Error('redis broke');
    const staleSummary = {
      from: '2026-03-22T10:00:00.000Z',
      to: '2026-03-22T11:00:00.000Z',
      range: '7d',
      storage: 'redis',
    };
    getRuntimeAnalyticsAvailabilityMock.mockResolvedValue({
      enabled: true,
      storage: 'redis',
    });
    getRedisConnectionMock.mockReturnValue({
      pipeline: () => ({
        zcount: vi.fn(),
        zrangebyscore: vi.fn(),
        exec: vi.fn().mockRejectedValue(error),
      }),
    });
    readStaleSummaryMock.mockReturnValue(staleSummary);

    await expect(
      getRuntimeAnalyticsSummaryBase({
        from: new Date('2026-03-22T10:00:00.000Z'),
        to: new Date('2026-03-22T11:00:00.000Z'),
        range: '7d',
      })
    ).resolves.toBe(staleSummary as never);

    expect(captureExceptionMock).toHaveBeenCalledWith(error);
    expect(logWarningMock).toHaveBeenCalledWith(
      'Failed to load runtime analytics summary',
      expect.objectContaining({
        service: 'ai-paths-analytics',
        error,
        range: '7d',
      })
    );
  });
});
