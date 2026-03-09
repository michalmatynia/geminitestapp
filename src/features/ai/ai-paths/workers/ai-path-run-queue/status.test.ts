import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPathRunRepositoryMock: vi.fn(),
  getRuntimeAnalyticsAvailabilityMock: vi.fn(),
  getRuntimeAnalyticsSummaryMock: vi.fn(),
  getHealthStatusMock: vi.fn(),
  getAiInsightsQueueStatusSnapshotMock: vi.fn(),
  finalizeAiPathRunQueueStatusMock: vi.fn(),
  getQueueStatusScopeKeyMock: vi.fn(),
  aiPathRunQueueStateMock: {
    workerStarted: true,
  },
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: mocks.getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  getRuntimeAnalyticsAvailability: mocks.getRuntimeAnalyticsAvailabilityMock,
  getRuntimeAnalyticsSummary: mocks.getRuntimeAnalyticsSummaryMock,
}));

vi.mock('./state', () => ({
  aiPathRunQueueState: mocks.aiPathRunQueueStateMock,
}));

vi.mock('./queue', () => ({
  queue: {
    getHealthStatus: mocks.getHealthStatusMock,
  },
}));

vi.mock('./status-utils', () => ({
  finalizeAiPathRunQueueStatus: mocks.finalizeAiPathRunQueueStatusMock,
  getAiInsightsQueueStatusSnapshot: mocks.getAiInsightsQueueStatusSnapshotMock,
  getQueueStatusScopeKey: mocks.getQueueStatusScopeKeyMock,
}));

import { clearAiPathRunQueueStatusCache, getAiPathRunQueueStatus } from './status';

describe('getAiPathRunQueueStatus', () => {
  beforeEach(() => {
    clearAiPathRunQueueStatusCache();
    mocks.getPathRunRepositoryMock.mockReset();
    mocks.getRuntimeAnalyticsAvailabilityMock.mockReset();
    mocks.getRuntimeAnalyticsSummaryMock.mockReset();
    mocks.getHealthStatusMock.mockReset();
    mocks.getAiInsightsQueueStatusSnapshotMock.mockReset();
    mocks.finalizeAiPathRunQueueStatusMock.mockReset();
    mocks.getQueueStatusScopeKeyMock.mockReset();

    mocks.aiPathRunQueueStateMock.workerStarted = true;
    mocks.getQueueStatusScopeKeyMock.mockReturnValue('global');
    mocks.getPathRunRepositoryMock.mockResolvedValue({
      getQueueStats: vi.fn().mockResolvedValue({
        queuedCount: 0,
        oldestQueuedAt: null,
      }),
      listRuns: vi.fn().mockResolvedValue({
        runs: [{ id: 'run-1', status: 'running' }],
        total: 1,
      }),
    });
    mocks.getHealthStatusMock.mockResolvedValue({
      running: false,
      healthy: true,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 0,
      delayedCount: 0,
      pausedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });
    mocks.getAiInsightsQueueStatusSnapshotMock.mockResolvedValue({
      running: false,
      healthy: true,
      processing: false,
      activeJobs: 0,
      waitingJobs: 0,
      failedJobs: 0,
      completedJobs: 0,
    });
    mocks.getRuntimeAnalyticsAvailabilityMock.mockResolvedValue({
      enabled: false,
    });
    mocks.finalizeAiPathRunQueueStatusMock.mockImplementation((baseStatus) => baseStatus);
  });

  afterEach(() => {
    clearAiPathRunQueueStatusCache();
  });

  it('counts persisted running runs as active work when worker health lags behind', async () => {
    const status = await getAiPathRunQueueStatus({
      bypassCache: true,
      visibility: 'global',
    });

    expect(status.activeRuns).toBe(1);
    expect(status.processing).toBe(true);
    expect(mocks.finalizeAiPathRunQueueStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeRuns: 1,
        processing: true,
      })
    );
  });
});
