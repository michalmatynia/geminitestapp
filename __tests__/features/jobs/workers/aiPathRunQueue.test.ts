import { describe, it, expect, vi, beforeEach } from 'vitest';

import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import {
  computeAiPathRunQueueSlo,
  type QueueSloThresholds,
} from '@/features/jobs/workers/aiPathRunQueue';
import {
  computeBackoffMs,
  processRun,
} from '@/features/jobs/processors/ai-path-run-processor';

vi.mock('@/features/ai/ai-paths/services/path-run-executor', () => ({
  executePathRun: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('@/features/observability/services/error-system', () => ({
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
    createRunEvent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.findRunById.mockResolvedValue(null);
    mockRepo.updateRunIfStatus.mockResolvedValue(null);
    mockRepo.claimRunForProcessing.mockResolvedValue(null);
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

      expect(executePathRun).toHaveBeenCalledWith(run);
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

      expect(mockRepo.updateRunIfStatus).toHaveBeenCalledWith('run-1', ['running', 'queued'], expect.objectContaining({
        status: 'queued',
        retryCount: 1,
        errorMessage: 'Network Error',
        nextRetryAt: expect.any(Date),
      }));
      expect(mockRepo.createRunEvent).toHaveBeenCalledWith(expect.objectContaining({
        runId: 'run-1',
        level: 'warning',
      }));
    });

    it('moves to dead-letter on max retries', async () => {
      const run = { id: 'run-1', pathId: 'path-1', retryCount: 2, maxAttempts: 3 } as any;
      vi.mocked(executePathRun).mockRejectedValue(new Error('Fatal Error'));
      mockRepo.updateRunIfStatus.mockResolvedValueOnce({
        id: 'run-1',
        status: 'dead_lettered',
        retryCount: 3,
      });

      await processRun(run);

      expect(mockRepo.updateRunIfStatus).toHaveBeenCalledWith('run-1', ['running', 'queued'], expect.objectContaining({
        status: 'dead_lettered',
        retryCount: 3,
        errorMessage: 'Fatal Error',
      }));
      expect(mockRepo.createRunEvent).toHaveBeenCalledWith(expect.objectContaining({
        runId: 'run-1',
        level: 'error',
        message: expect.stringContaining('dead-letter'),
      }));
    });
  });
});
