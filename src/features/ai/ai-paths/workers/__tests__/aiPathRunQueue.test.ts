import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createManagedQueueMock,
  getPathRunRepositoryMock,
  getRuntimeAnalyticsAvailabilityMock,
  getRuntimeAnalyticsSummaryMock,
  getAiInsightsQueueStatusMock,
  getAiPathsEnabledCachedMock,
  clearAiPathsEnabledCacheMock,
  captureExceptionMock,
  logWarningMock,
  processRunMock,
  getMongoClientMock,
} = vi.hoisted(() => ({
  createManagedQueueMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  getRuntimeAnalyticsAvailabilityMock: vi.fn(),
  getRuntimeAnalyticsSummaryMock: vi.fn(),
  getAiInsightsQueueStatusMock: vi.fn(),
  getAiPathsEnabledCachedMock: vi.fn(),
  clearAiPathsEnabledCacheMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
  processRunMock: vi.fn(),
  getMongoClientMock: vi.fn(),
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

vi.mock('@/features/ai/ai-paths/workers/ai-path-run-queue/brain-gate', () => ({
  getAiPathsEnabledCached: getAiPathsEnabledCachedMock,
  assertAiPathsEnabled: vi.fn(),
  clearAiPathsEnabledCache: clearAiPathsEnabledCacheMock,
}));

vi.mock('@/features/ai/ai-paths/workers/ai-path-run-processor', () => ({
  processRun: processRunMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  getBrainAssignmentForFeature: vi.fn().mockResolvedValue({ enabled: true }),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoClient: getMongoClientMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
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
  enqueue: vi.fn().mockResolvedValue(undefined),
  getQueue: vi.fn(() => ({})),
  getHealthStatus: vi.fn().mockResolvedValue(queueHealthStatus),
});

const loadModule = async () => await import('@/features/ai/ai-paths/workers/aiPathRunQueue');

describe('aiPathRunQueue status', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    delete process.env.AI_PATHS_REQUIRE_DURABLE_QUEUE;
    delete process.env.AI_PATHS_ALLOW_LOCAL_QUEUE_FALLBACK;
    createManagedQueueMock.mockReturnValue(createQueueMock());
    getAiPathsEnabledCachedMock.mockResolvedValue(true);
    getMongoClientMock.mockResolvedValue({});
    getPathRunRepositoryMock.mockResolvedValue({
      getQueueStats: vi.fn().mockResolvedValue({
        queuedCount: 4,
        oldestQueuedAt: new Date('2026-03-02T00:00:00.000Z'),
      }),
      listRuns: vi.fn().mockResolvedValue({
        items: [],
        total: 2,
      }),
      claimRunForProcessing: vi.fn(),
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
        __aiPathRunQueueState__?: { workerStarted: boolean };
      }
    ).__aiPathRunQueueState__ = {
      workerStarted: true,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
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
        successRate: 83.3,
        failureRate: 16.7,
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

  it('starts the worker when queue readiness is requested', async () => {
    (
      globalThis as typeof globalThis & {
        __aiPathRunQueueState__?: { workerStarted: boolean };
      }
    ).__aiPathRunQueueState__ = {
      workerStarted: false,
    };
    const queueMock = createQueueMock();
    createManagedQueueMock.mockReturnValue(queueMock);

    const { assertAiPathRunQueueReady } = await loadModule();
    const status = await assertAiPathRunQueueReady();

    expect(queueMock.startWorker).toHaveBeenCalledTimes(1);
    expect(queueMock.enqueue).not.toHaveBeenCalled();
    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(status.running).toBe(true);
  });

  it('rejects queue readiness when AI Paths is disabled', async () => {
    getAiPathsEnabledCachedMock.mockResolvedValue(false);

    const { assertAiPathRunQueueReady } = await loadModule();

    await expect(assertAiPathRunQueueReady()).rejects.toMatchObject({
      message:
        'AI Paths execution is disabled in Brain settings. Enable AI Paths and retry.',
    });
  });

  it('rejects enqueue readiness when the waiting queue is saturated', async () => {
    const queueMock = createQueueMock();
    queueMock.getHealthStatus.mockResolvedValue({
      ...queueHealthStatus,
      waitingCount: 2_500,
    });
    createManagedQueueMock.mockReturnValue(queueMock);
    (
      globalThis as typeof globalThis & {
        __aiPathRunQueueState__?: { workerStarted: boolean };
      }
    ).__aiPathRunQueueState__ = {
      workerStarted: false,
    };

    const { assertAiPathRunQueueReadyForEnqueue } = await loadModule();

    await expect(assertAiPathRunQueueReadyForEnqueue()).rejects.toMatchObject({
      message: 'AI Paths queue is currently saturated. Please retry in a few seconds.',
    });
  });

  it('runs local fallback jobs once and replaces older timers for the same run', async () => {
    vi.useFakeTimers();
    const claimRunForProcessing = vi.fn().mockResolvedValue({
      id: 'run-1',
      status: 'queued',
    });
    getPathRunRepositoryMock.mockResolvedValue({
      getQueueStats: vi.fn().mockResolvedValue({
        queuedCount: 0,
        oldestQueuedAt: null,
      }),
      listRuns: vi.fn().mockResolvedValue({
        items: [],
        total: 0,
      }),
      claimRunForProcessing,
    });

    const { scheduleLocalFallbackRun } = await loadModule();

    scheduleLocalFallbackRun('run-1', 100);
    scheduleLocalFallbackRun('run-1', 100);
    await vi.advanceTimersByTimeAsync(100);

    expect(claimRunForProcessing).toHaveBeenCalledTimes(1);
    expect(processRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'run-1',
      })
    );
  });

  it('dedupes queue removals, clears timers, and logs non-critical queue API failures', async () => {
    vi.useFakeTimers();
    const removeMock = vi.fn().mockResolvedValue(undefined);
    const queueMock = createQueueMock();
    queueMock.getQueue.mockReturnValue({
      getJob: vi.fn(async (runId: string) => {
        if (runId === 'run-1') {
          return {
            remove: removeMock,
          };
        }
        throw new Error('redis unavailable');
      }),
    });
    createManagedQueueMock.mockReturnValue(queueMock);

    const { scheduleLocalFallbackRun, removePathRunQueueEntries } = await loadModule();

    scheduleLocalFallbackRun('run-1', 5_000);
    const result = await removePathRunQueueEntries([' run-1 ', 'run-1', 'run-2']);

    expect(result).toEqual({
      requested: 2,
      removed: 2,
    });
    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(logWarningMock).toHaveBeenCalledWith(
      'Non-critical queue removal failure for run run-2',
      expect.objectContaining({
        action: 'removePathRunQueueEntries',
        runId: 'run-2',
      })
    );
  });
});
