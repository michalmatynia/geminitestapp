import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createManagedQueueMock,
  getPathRunRepositoryMock,
  getRuntimeAnalyticsAvailabilityMock,
  getRuntimeAnalyticsSummaryMock,
  getAiInsightsQueueStatusMock,
} = vi.hoisted(() => ({
  createManagedQueueMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  getRuntimeAnalyticsAvailabilityMock: vi.fn(),
  getRuntimeAnalyticsSummaryMock: vi.fn(),
  getAiInsightsQueueStatusMock: vi.fn(),
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: createManagedQueueMock,
  getRedisConnection: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  getRuntimeAnalyticsAvailability: getRuntimeAnalyticsAvailabilityMock,
  getRuntimeAnalyticsSummary: getRuntimeAnalyticsSummaryMock,
  recordRuntimeRunStarted: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/path-run-recovery-service', () => ({
  resolveAiPathsStaleRunningCleanupIntervalMs: () => 60_000,
}));

vi.mock('@/features/ai/ai-paths/workers/ai-path-run-processor', () => ({
  processRun: vi.fn(),
  processStaleRunRecovery: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  getBrainAssignmentForFeature: vi.fn().mockResolvedValue({ enabled: true }),
}));

vi.mock('@/features/ai/insights/workers/aiInsightsQueue', () => ({
  getAiInsightsQueueStatus: getAiInsightsQueueStatusMock,
}));

const queueHealthStatus = {
  running: true,
  healthy: true,
  processing: true,
  activeCount: 2,
  waitingCount: 5,
  failedCount: 0,
  completedCount: 3,
  lastPollTime: 1709337600000,
  timeSinceLastPoll: 250,
};

const createQueueMock = () => ({
  startWorker: vi.fn(),
  stopWorker: vi.fn(),
  enqueue: vi.fn(),
  getQueue: vi.fn(() => ({})),
  getHealthStatus: vi.fn().mockResolvedValue(queueHealthStatus),
});

const loadModule = async () => await import('@/features/ai/ai-paths/workers/aiPathRunQueue');

describe('aiPathRunQueue status', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createManagedQueueMock.mockReturnValue(createQueueMock());
    getPathRunRepositoryMock.mockResolvedValue({
      getQueueStats: vi.fn().mockResolvedValue({
        queuedCount: 4,
        oldestQueuedAt: new Date('2026-03-02T00:00:00.000Z'),
      }),
    });
    getAiInsightsQueueStatusMock.mockResolvedValue({
      running: true,
      healthy: true,
      processing: false,
      activeJobs: 1,
      waitingJobs: 2,
      failedJobs: 0,
      completedJobs: 8,
      lastPollTime: 1709337600000,
      timeSinceLastPoll: 500,
    });
    (
      globalThis as typeof globalThis & {
        __aiPathRunQueueState__?: { workerStarted: boolean; recoveryScheduled: boolean };
      }
    ).__aiPathRunQueueState__ = {
      workerStarted: true,
      recoveryScheduled: false,
    };
  });

  it('returns base queue health when runtime analytics is disabled', async () => {
    getRuntimeAnalyticsAvailabilityMock.mockResolvedValue({
      enabled: false,
      storage: 'disabled',
    });

    const { getAiPathRunQueueStatus } = await loadModule();
    const status = await getAiPathRunQueueStatus({ bypassCache: true });

    expect(status.running).toBe(true);
    expect(status.queuedCount).toBe(4);
    expect(status.runtimeAnalytics).toEqual({
      enabled: false,
      storage: 'disabled',
    });
    expect(status.avgRuntimeMs).toBeNull();
    expect(status.p95RuntimeMs).toBeNull();
    expect(status.brainAnalytics24h.totalReports).toBe(0);
    expect(status.slo.indicators.successRate24h.sampleSize).toBe(0);
    expect(getRuntimeAnalyticsSummaryMock).not.toHaveBeenCalled();
  });

  it('uses lightweight runtime analytics enrichment without traces when enabled', async () => {
    getRuntimeAnalyticsAvailabilityMock.mockResolvedValue({
      enabled: true,
      storage: 'redis',
    });
    getRuntimeAnalyticsSummaryMock.mockResolvedValue({
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-02T00:00:00.000Z',
      range: '24h',
      storage: 'redis',
      runs: {
        total: 6,
        queued: 1,
        started: 2,
        completed: 5,
        failed: 1,
        canceled: 0,
        deadLettered: 0,
        successRate: 83.3,
        failureRate: 16.7,
        deadLetterRate: 0,
        avgDurationMs: 1200,
        p95DurationMs: 2400,
      },
      nodes: {
        started: 0,
        completed: 0,
        failed: 0,
        queued: 0,
        running: 0,
        polling: 0,
        cached: 0,
        waitingCallback: 0,
      },
      brain: {
        analyticsReports: 4,
        logReports: 1,
        totalReports: 5,
        warningReports: 1,
        errorReports: 1,
      },
      traces: {
        source: 'none',
        sampledRuns: 0,
        sampledSpans: 0,
        completedSpans: 0,
        failedSpans: 0,
        cachedSpans: 0,
        avgDurationMs: null,
        p95DurationMs: null,
        slowestSpan: null,
        topSlowNodes: [],
        topFailedNodes: [],
        kernelParity: {
          sampledRuns: 0,
          runsWithKernelParity: 0,
          sampledHistoryEntries: 0,
          strategyCounts: {
            compatibility: 0,
            code_object_v3: 0,
            unknown: 0,
          },
          resolutionSourceCounts: {
            override: 0,
            registry: 0,
            missing: 0,
            unknown: 0,
          },
          codeObjectIds: [],
        },
        truncated: false,
      },
      generatedAt: '2026-03-02T00:00:00.000Z',
    });

    const { getAiPathRunQueueStatus } = await loadModule();
    const status = await getAiPathRunQueueStatus({ bypassCache: true });

    expect(getRuntimeAnalyticsSummaryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        range: '24h',
        includeTraces: false,
      })
    );
    expect(status.runtimeAnalytics).toEqual({
      enabled: true,
      storage: 'redis',
    });
    expect(status.avgRuntimeMs).toBe(1200);
    expect(status.p95RuntimeMs).toBe(2400);
    expect(status.brainAnalytics24h.totalReports).toBe(5);
  });
});
