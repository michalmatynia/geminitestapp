import { describe, it, expect, vi, beforeEach } from 'vitest';

import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { processRun, computeBackoffMs } from '@/features/jobs/workers/aiPathRunQueue';

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
    updateRun: vi.fn(),
    createRunEvent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('processRun', () => {
    it('successfully processes a run', async () => {
      const run = { id: 'run-1', pathId: 'path-1', status: 'running' } as any;
      vi.mocked(executePathRun).mockResolvedValue(undefined);

      await processRun(run);

      expect(executePathRun).toHaveBeenCalledWith(run);
      expect(mockRepo.updateRun).not.toHaveBeenCalled(); // No status update on success here (handled by executor usually)
    });

    it('retries on failure if attempts remaining', async () => {
      const run = { id: 'run-1', pathId: 'path-1', retryCount: 0, maxAttempts: 3 } as any;
      vi.mocked(executePathRun).mockRejectedValue(new Error('Network Error'));

      await processRun(run);

      expect(mockRepo.updateRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
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

      await processRun(run);

      expect(mockRepo.updateRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
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
