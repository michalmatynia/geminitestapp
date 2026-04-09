import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getPathRunRepositoryMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getPathRunRepositoryMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

import {
  recoverStaleRunningRuns,
  resolveAiPathsStaleRunningCleanupIntervalMs,
  resolveAiPathsStaleRunningMaxAgeMs,
} from '@/features/ai/ai-paths/services/path-run-recovery-service';

const ORIGINAL_MAX_AGE = process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'];
const ORIGINAL_INTERVAL = process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'];

describe('path-run-recovery-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'];
    delete process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'];
  });

  afterEach(() => {
    if (ORIGINAL_MAX_AGE === undefined) {
      delete process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'];
    } else {
      process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'] = ORIGINAL_MAX_AGE;
    }

    if (ORIGINAL_INTERVAL === undefined) {
      delete process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'];
    } else {
      process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'] = ORIGINAL_INTERVAL;
    }
  });

  it('parses positive stale-run timings from env and falls back for invalid values', () => {
    expect(resolveAiPathsStaleRunningMaxAgeMs()).toBe(30 * 60 * 1000);
    expect(resolveAiPathsStaleRunningCleanupIntervalMs()).toBe(120_000);

    process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'] = '45000';
    process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'] = '3000';

    expect(resolveAiPathsStaleRunningMaxAgeMs()).toBe(45_000);
    expect(resolveAiPathsStaleRunningCleanupIntervalMs()).toBe(3_000);

    process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'] = '0';
    process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'] = '-12';

    expect(resolveAiPathsStaleRunningMaxAgeMs()).toBe(30 * 60 * 1000);
    expect(resolveAiPathsStaleRunningCleanupIntervalMs()).toBe(120_000);
  });

  it('uses the provided repository and returns the recovered stale-run count', async () => {
    const repo = {
      markStaleRunningRuns: vi.fn().mockResolvedValue({ count: 4 }),
    };

    await expect(
      recoverStaleRunningRuns({
        repo: repo as never,
        maxAgeMs: 15_000,
        source: 'test.recovery',
      })
    ).resolves.toBe(4);

    expect(repo.markStaleRunningRuns).toHaveBeenCalledWith(15_000);
    expect(getPathRunRepositoryMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logWarningMock).not.toHaveBeenCalled();
  });

  it('falls back to the shared repository and returns 0 when stale-run cleanup fails', async () => {
    const failure = new Error('db unavailable');
    const repo = {
      markStaleRunningRuns: vi.fn().mockRejectedValue(failure),
    };
    getPathRunRepositoryMock.mockResolvedValue(repo);

    await expect(recoverStaleRunningRuns({ source: 'worker.recovery' })).resolves.toBe(0);

    expect(getPathRunRepositoryMock).toHaveBeenCalledTimes(1);
    expect(repo.markStaleRunningRuns).toHaveBeenCalledWith(30 * 60 * 1000);
    expect(captureExceptionMock).toHaveBeenCalledWith(failure);
    expect(logWarningMock).toHaveBeenCalledWith(
      '[worker.recovery] Failed to cleanup stale running runs.',
      expect.objectContaining({
        service: 'ai-paths',
        source: 'worker.recovery',
        error: failure,
        maxAgeMs: 30 * 60 * 1000,
      })
    );
  });
});
