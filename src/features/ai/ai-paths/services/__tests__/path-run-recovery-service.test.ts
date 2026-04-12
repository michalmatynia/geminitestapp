import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getPathRunRepositoryMock,
  markPathRunHandoffReadyMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getPathRunRepositoryMock: vi.fn(),
  markPathRunHandoffReadyMock: vi.fn(),
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

vi.mock('@/features/ai/ai-paths/services/path-run-management-service', () => ({
  markPathRunHandoffReady: markPathRunHandoffReadyMock,
}));

import {
  recoverBlockedLeaseRuns,
  recoverStaleRunningRuns,
  resolveAiPathsBlockedLeaseRecoveryBatchSize,
  resolveAiPathsBlockedLeaseRecoveryGraceMs,
  resolveAiPathsStaleRunningCleanupIntervalMs,
  resolveAiPathsStaleRunningMaxAgeMs,
} from '@/features/ai/ai-paths/services/path-run-recovery-service';

const ORIGINAL_MAX_AGE = process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'];
const ORIGINAL_INTERVAL = process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'];
const ORIGINAL_BLOCKED_LEASE_GRACE = process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_GRACE_MS'];
const ORIGINAL_BLOCKED_LEASE_BATCH_SIZE =
  process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_BATCH_SIZE'];

describe('path-run-recovery-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'];
    delete process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'];
    delete process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_GRACE_MS'];
    delete process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_BATCH_SIZE'];
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

    if (ORIGINAL_BLOCKED_LEASE_GRACE === undefined) {
      delete process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_GRACE_MS'];
    } else {
      process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_GRACE_MS'] = ORIGINAL_BLOCKED_LEASE_GRACE;
    }

    if (ORIGINAL_BLOCKED_LEASE_BATCH_SIZE === undefined) {
      delete process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_BATCH_SIZE'];
    } else {
      process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_BATCH_SIZE'] = ORIGINAL_BLOCKED_LEASE_BATCH_SIZE;
    }
  });

  it('parses positive stale-run timings from env and falls back for invalid values', () => {
    expect(resolveAiPathsStaleRunningMaxAgeMs()).toBe(30 * 60 * 1000);
    expect(resolveAiPathsStaleRunningCleanupIntervalMs()).toBe(120_000);
    expect(resolveAiPathsBlockedLeaseRecoveryGraceMs()).toBe(60_000);
    expect(resolveAiPathsBlockedLeaseRecoveryBatchSize()).toBe(25);

    process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'] = '45000';
    process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'] = '3000';
    process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_GRACE_MS'] = '15000';
    process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_BATCH_SIZE'] = '7';

    expect(resolveAiPathsStaleRunningMaxAgeMs()).toBe(45_000);
    expect(resolveAiPathsStaleRunningCleanupIntervalMs()).toBe(3_000);
    expect(resolveAiPathsBlockedLeaseRecoveryGraceMs()).toBe(15_000);
    expect(resolveAiPathsBlockedLeaseRecoveryBatchSize()).toBe(7);

    process.env['AI_PATHS_STALE_RUNNING_MAX_AGE_MS'] = '0';
    process.env['AI_PATHS_STALE_RUNNING_CLEANUP_INTERVAL_MS'] = '-12';
    process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_GRACE_MS'] = '0';
    process.env['AI_PATHS_BLOCKED_LEASE_RECOVERY_BATCH_SIZE'] = '-1';

    expect(resolveAiPathsStaleRunningMaxAgeMs()).toBe(30 * 60 * 1000);
    expect(resolveAiPathsStaleRunningCleanupIntervalMs()).toBe(120_000);
    expect(resolveAiPathsBlockedLeaseRecoveryGraceMs()).toBe(60_000);
    expect(resolveAiPathsBlockedLeaseRecoveryBatchSize()).toBe(25);
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

  it('moves expired blocked-lease runs to handoff-ready during recovery', async () => {
    const nowMs = Date.parse('2026-03-09T10:06:30.000Z');
    const repo = {
      listRuns: vi.fn().mockResolvedValue({
        runs: [
          {
            id: 'run-1',
            status: 'blocked_on_lease',
            meta: {
              executionLease: {
                ownerAgentId: 'agent-other',
                expiresAt: '2026-03-09T10:05:00.000Z',
              },
            },
          },
          {
            id: 'run-2',
            status: 'blocked_on_lease',
            meta: {
              executionLease: {
                expiresAt: '2026-03-09T10:06:30.000Z',
              },
            },
          },
        ],
        total: 2,
      }),
    };
    markPathRunHandoffReadyMock
      .mockResolvedValueOnce({ id: 'run-1', status: 'handoff_ready' })
      .mockResolvedValueOnce({ id: 'run-2', status: 'blocked_on_lease' });

    await expect(
      recoverBlockedLeaseRuns({
        repo: repo as never,
        nowMs,
        graceMs: 60_000,
        limit: 10,
        source: 'test.lease-recovery',
      })
    ).resolves.toBe(1);

    expect(repo.listRuns).toHaveBeenCalledWith({
      statuses: ['blocked_on_lease'],
      limit: 10,
      offset: 0,
      includeTotal: false,
    });
    expect(markPathRunHandoffReadyMock).toHaveBeenCalledTimes(1);
    expect(markPathRunHandoffReadyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        requestedBy: 'ai-paths-recovery',
        checkpointLineageId: `run-1:lease-recovery:${nowMs}`,
        reason: 'Execution lease held by agent-other remained blocked past expiry.',
      })
    );
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logWarningMock).not.toHaveBeenCalled();
  });

  it('returns 0 when blocked-lease recovery inspection fails', async () => {
    const failure = new Error('repo unavailable');
    const repo = {
      listRuns: vi.fn().mockRejectedValue(failure),
    };

    await expect(
      recoverBlockedLeaseRuns({
        repo: repo as never,
        source: 'worker.lease-recovery',
      })
    ).resolves.toBe(0);

    expect(captureExceptionMock).toHaveBeenCalledWith(failure);
    expect(logWarningMock).toHaveBeenCalledWith(
      '[worker.lease-recovery] Failed to recover blocked lease runs.',
      expect.objectContaining({
        service: 'ai-paths',
        source: 'worker.lease-recovery',
        error: failure,
      })
    );
  });
});
