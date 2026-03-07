import { describe, it, expect, vi, beforeEach } from 'vitest';

import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { computeBackoffMs, processRun } from '@/features/ai/ai-paths/workers/ai-path-run-processor';
import {
  assertAiPathRunQueueReady,
  getAiPathRunQueueStatus,
  removePathRunQueueEntries,
  scheduleLocalFallbackRun,
  __testOnly,
} from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import {
  computeAiPathRunQueueSlo,
  type QueueSloThresholds,
} from '@/features/ai/ai-paths/workers/ai-path-run-queue-slo';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

const getRuntimeAnalyticsSummaryMock = vi.hoisted(() => vi.fn());
const getRuntimeAnalyticsAvailabilityMock = vi.hoisted(() => vi.fn());
const recordRuntimeRunStartedMock = vi.hoisted(() => vi.fn());
const recordRuntimeRunFinishedMock = vi.hoisted(() => vi.fn());
const recordRuntimeRunQueuedMock = vi.hoisted(() => vi.fn());
const getBrainAssignmentForFeatureMock = vi.hoisted(() => vi.fn());
const getAiInsightsQueueStatusMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/ai-paths/services/path-run-executor', () => ({
  executePathRun: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  getRuntimeAnalyticsAvailability: getRuntimeAnalyticsAvailabilityMock,
  getRuntimeAnalyticsSummary: getRuntimeAnalyticsSummaryMock,
  recordRuntimeRunStarted: recordRuntimeRunStartedMock,
  recordRuntimeRunFinished: recordRuntimeRunFinishedMock,
  recordRuntimeRunQueued: recordRuntimeRunQueuedMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  getBrainAssignmentForFeature: getBrainAssignmentForFeatureMock,
}));

vi.mock('@/features/ai/insights/workers/aiInsightsQueue', () => ({
  getAiInsightsQueueStatus: getAiInsightsQueueStatusMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

describe('AI Path Run Queue Worker', () => {
  const mockRepo = {
    findRunById: vi.fn(),
    updateRun: vi.fn(),
    updateRunIfStatus: vi.fn(),
    claimRunForProcessing: vi.fn(),
    getQueueStats: vi.fn(),
    createRunEvent: vi.fn(),
    finalizeRun: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    __testOnly.clearAiPathsEnabledCache();
    getBrainAssignmentForFeatureMock.mockResolvedValue({ enabled: true });
    recordRuntimeRunStartedMock.mockResolvedValue(undefined);
    recordRuntimeRunFinishedMock.mockResolvedValue(undefined);
    recordRuntimeRunQueuedMock.mockResolvedValue(undefined);
    getRuntimeAnalyticsAvailabilityMock.mockResolvedValue({
      enabled: false,
      storage: 'disabled',
    });
    getAiInsightsQueueStatusMock.mockResolvedValue({
      running: true,
      healthy: true,
      processing: false,
      activeJobs: 0,
      waitingJobs: 0,
      failedJobs: 0,
      completedJobs: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });
    getRuntimeAnalyticsSummaryMock.mockResolvedValue({
      runs: {
        completed: 0,
        failed: 0,
        canceled: 0,
        deadLettered: 0,
        successRate: 100,
        deadLetterRate: 0,
        avgDurationMs: null,
        p95DurationMs: null,
      },
      brain: {
        totalReports: 0,
        analyticsReports: 0,
        logReports: 0,
        warningReports: 0,
        errorReports: 0,
      },
    });
    mockRepo.findRunById.mockResolvedValue(null);
    mockRepo.updateRunIfStatus.mockResolvedValue(null);
    mockRepo.claimRunForProcessing.mockResolvedValue(null);
    mockRepo.getQueueStats.mockResolvedValue({ queuedCount: 0, oldestQueuedAt: null });
    vi.mocked(getPathRunRepository).mockReturnValue(mockRepo as any);
  });

  describe('computeBackoffMs', () => {
    it('computes exponential backoff', () => {
      // Base is 5000 (default)
      // retryCount 0 -> 5000 * 2^0 = 5000 (+ jitter)
      const res0 = computeBackoffMs(0);
      expect(res0).toBeGreaterThanOrEqual(5000);
      expect(res0).toBeLessThan(6500); // 5000 + 10% jitter (500)

      // retryCount 1 -> 5000 * 2^1 = 10000
      const res1 = computeBackoffMs(1);
      expect(res1).toBeGreaterThanOrEqual(10000);
    });

    it('respects max backoff', () => {
      // Default max is 60000
      const resLarge = computeBackoffMs(10);
      expect(resLarge).toBeLessThanOrEqual(61000); // 60000 + jitter
    });
  });

  describe('computeAiPathRunQueueSlo', () => {
    const thresholds: QueueSloThresholds = {
      queueLagWarningMs: 60_000,
      queueLagCriticalMs: 180_000,
      successRateWarningPct: 95,
      successRateCriticalPct: 90,
      deadLetterRateWarningPct: 1,
      deadLetterRateCriticalPct: 3,
      brainErrorRateWarningPct: 5,
      brainErrorRateCriticalPct: 15,
      minTerminalSamples: 10,
      minBrainSamples: 20,
    };

    it('returns critical when worker is stopped', () => {
      const result = computeAiPathRunQueueSlo(
        {
          queueRunning: false,
          queueHealthy: false,
          queueLagMs: null,
          successRate24h: 99,
          terminalRuns24h: 200,
          deadLetterRate24h: 0,
          brainErrorRate24h: 1,
          brainTotalReports24h: 100,
        },
        thresholds
      );
      expect(result.overall).toBe('critical');
      expect(result.indicators.workerHealth.level).toBe('critical');
      expect(result.breachCount).toBeGreaterThanOrEqual(1);
    });

    it('returns warning for elevated dead-letter rate', () => {
      const result = computeAiPathRunQueueSlo(
        {
          queueRunning: true,
          queueHealthy: true,
          queueLagMs: 2_000,
          successRate24h: 97,
          terminalRuns24h: 120,
          deadLetterRate24h: 1.5,
          brainErrorRate24h: 2,
          brainTotalReports24h: 80,
        },
        thresholds
      );
      expect(result.indicators.deadLetterRate24h.level).toBe('warning');
      expect(result.overall).toBe('warning');
    });

    it('ignores rate indicators when sample size is too small', () => {
      const result = computeAiPathRunQueueSlo(
        {
          queueRunning: true,
          queueHealthy: true,
          queueLagMs: null,
          successRate24h: 10,
          terminalRuns24h: 2,
          deadLetterRate24h: 90,
          brainErrorRate24h: 50,
          brainTotalReports24h: 2,
        },
        thresholds
      );
      expect(result.indicators.successRate24h.level).toBe('ok');
      expect(result.indicators.deadLetterRate24h.level).toBe('ok');
      expect(result.indicators.brainErrorRate24h.level).toBe('ok');
      expect(result.overall).toBe('ok');
    });
  });

  describe('processRun', () => {
    it('successfully processes a run', async () => {
      const run = { id: 'run-1', pathId: 'path-1', status: 'running' } as any;
      vi.mocked(executePathRun).mockResolvedValue(undefined);

      await processRun(run);

      expect(executePathRun).toHaveBeenCalledWith(run, undefined);
      expect(mockRepo.updateRun).not.toHaveBeenCalled(); // No status update on success here (handled by executor usually)
      expect(mockRepo.updateRunIfStatus).not.toHaveBeenCalled();
    });

    it('retries on failure if attempts remaining', async () => {
      const run = { id: 'run-1', pathId: 'path-1', retryCount: 0, maxAttempts: 3 } as any;
      vi.mocked(executePathRun).mockRejectedValue(new Error('Network Error'));
      mockRepo.updateRunIfStatus.mockResolvedValueOnce({
        id: 'run-1',
        status: 'queued',
        retryCount: 1,
      });

      const outcome = await processRun(run);
      expect(outcome).toEqual(
        expect.objectContaining({
          requeueDelayMs: expect.any(Number),
        })
      );

      expect(mockRepo.updateRunIfStatus).toHaveBeenCalledWith(
        'run-1',
        ['running', 'queued'],
        expect.objectContaining({
          status: 'queued',
          retryCount: 1,
          errorMessage: 'Network Error',
          nextRetryAt: expect.any(String),
        })
      );
      expect(mockRepo.createRunEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-1',
          level: 'warn',
        })
      );
    });

    it('moves to dead-letter on max retries', async () => {
      const run = { id: 'run-1', pathId: 'path-1', retryCount: 2, maxAttempts: 3 } as any;
      vi.mocked(executePathRun).mockRejectedValue(new Error('Fatal Error'));

      await processRun(run);

      expect(mockRepo.finalizeRun).toHaveBeenCalledWith(
        'run-1',
        'dead_lettered',
        expect.objectContaining({
          errorMessage: 'Fatal Error',
        })
      );
    });
  });

  describe('removePathRunQueueEntries', () => {
    it('clears local fallback timers when queue entries are removed', async () => {
      vi.useFakeTimers();
      try {
        scheduleLocalFallbackRun('run-local-fallback', 5_000);
        const result = await removePathRunQueueEntries(['run-local-fallback']);
        expect(result.requested).toBe(1);
        expect(result.removed).toBeGreaterThanOrEqual(1);

        await vi.advanceTimersByTimeAsync(5_000);
        expect(mockRepo.claimRunForProcessing).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('queue readiness', () => {
    it('bypasses cache when bypassCache=true', async () => {
      await getAiPathRunQueueStatus({ bypassCache: true });
      await getAiPathRunQueueStatus({ bypassCache: true });

      expect(mockRepo.getQueueStats).toHaveBeenCalledTimes(2);
    });

    it('keys queue status cache by visibility scope', async () => {
      mockRepo.getQueueStats
        .mockResolvedValueOnce({ queuedCount: 1, oldestQueuedAt: null })
        .mockResolvedValueOnce({ queuedCount: 2, oldestQueuedAt: null });

      const globalStatus = await getAiPathRunQueueStatus({
        bypassCache: true,
        visibility: 'global',
      });
      const scopedStatus = await getAiPathRunQueueStatus({
        bypassCache: true,
        visibility: 'scoped',
        userId: 'user-1',
      });

      expect(globalStatus.queuedCount).toBe(1);
      expect(scopedStatus.queuedCount).toBe(2);
      expect(mockRepo.getQueueStats).toHaveBeenNthCalledWith(1, undefined);
      expect(mockRepo.getQueueStats).toHaveBeenNthCalledWith(2, { userId: 'user-1' });
    });

    it('passes the scoped user id through to queue stats reads', async () => {
      await getAiPathRunQueueStatus({
        bypassCache: true,
        visibility: 'scoped',
        userId: 'user-123',
      });

      expect(mockRepo.getQueueStats).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('throws service unavailable when worker is not running', async () => {
      getBrainAssignmentForFeatureMock.mockResolvedValueOnce({ enabled: false });
      await expect(assertAiPathRunQueueReady()).rejects.toThrow(
        'AI Paths execution is disabled in Brain settings'
      );
    });
  });
});
