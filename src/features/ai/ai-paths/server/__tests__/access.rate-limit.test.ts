import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPathRunRecord, AiPathRunStatus } from '@/shared/contracts/ai-paths';

const { listRunsMock, getQueueStatsMock, markStaleRunningRunsMock, getPathRunRepositoryMock } =
  vi.hoisted(() => ({
    listRunsMock: vi.fn(),
    getQueueStatsMock: vi.fn(),
    markStaleRunningRunsMock: vi.fn(),
    getPathRunRepositoryMock: vi.fn(),
  }));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/server/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(),
}));

import { enforceAiPathsRunRateLimit } from '../access';

const buildRun = (
  id: string,
  status: AiPathRunStatus,
  overrides: Partial<AiPathRunRecord> = {}
): AiPathRunRecord =>
  ({
    id,
    userId: 'user-1',
    pathId: 'path-1',
    pathName: 'Path 1',
    status,
    triggerEvent: null,
    triggerNodeId: null,
    triggerContext: null,
    graph: { nodes: [], edges: [] },
    runtimeState: null,
    meta: null,
    entityId: null,
    entityType: null,
    errorMessage: null,
    retryCount: 0,
    maxAttempts: 3,
    nextRetryAt: null,
    deadLetteredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  }) as AiPathRunRecord;

describe('enforceAiPathsRunRateLimit', () => {
  beforeEach(() => {
    listRunsMock.mockReset();
    getQueueStatsMock.mockReset().mockResolvedValue({
      queuedCount: 0,
      oldestQueuedAt: null,
    });
    markStaleRunningRunsMock.mockReset().mockResolvedValue({ count: 0 });
    getPathRunRepositoryMock.mockReset().mockResolvedValue({
      listRuns: listRunsMock,
      getQueueStats: getQueueStatsMock,
      markStaleRunningRuns: markStaleRunningRunsMock,
    });
  });

  it('does not count queued runs as active-limit blockers', async () => {
    listRunsMock.mockImplementation(async (options: { statuses?: AiPathRunStatus[] }) => {
      if (Array.isArray(options.statuses)) {
        if (options.statuses.includes('running')) {
          return { runs: [], total: 0 };
        }
        return {
          runs: [
            buildRun('run-q1', 'queued'),
            buildRun('run-q2', 'queued'),
            buildRun('run-q3', 'queued'),
            buildRun('run-q4', 'queued'),
            buildRun('run-q5', 'queued'),
          ],
          total: 5,
        };
      }
      return { runs: [], total: 0 };
    });

    await expect(
      enforceAiPathsRunRateLimit({
        userId: 'user-1',
        permissions: [],
        isElevated: false,
      })
    ).resolves.toBeUndefined();

    expect(listRunsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: ['running'],
      })
    );
  });

  it('blocks when running runs reach active limit', async () => {
    listRunsMock.mockImplementation(async (options: { statuses?: AiPathRunStatus[] }) => {
      if (Array.isArray(options.statuses)) {
        if (!options.statuses.includes('running')) {
          return { runs: [], total: 0 };
        }
        return {
          runs: [
            buildRun('run-r1', 'running'),
            buildRun('run-r2', 'running'),
            buildRun('run-r3', 'running'),
            buildRun('run-r4', 'running'),
            buildRun('run-r5', 'running'),
          ],
          total: 5,
        };
      }
      return { runs: [], total: 0 };
    });

    await expect(
      enforceAiPathsRunRateLimit({
        userId: 'user-1',
        permissions: [],
        isElevated: false,
      })
    ).rejects.toThrow('Too many active runs. Wait for one to finish before starting another.');
  });

  it('rechecks active slots before rejecting when initial probe hits the limit', async () => {
    listRunsMock
      .mockResolvedValueOnce({ runs: [], total: 0 }) // recent
      .mockResolvedValueOnce({
        runs: [
          buildRun('run-r1', 'running'),
          buildRun('run-r2', 'running'),
          buildRun('run-r3', 'running'),
          buildRun('run-r4', 'running'),
          buildRun('run-r5', 'running'),
        ],
        total: 5,
      }) // active (initial)
      .mockResolvedValueOnce({ runs: [], total: 0 }); // active (post-recovery)
    markStaleRunningRunsMock.mockResolvedValueOnce({ count: 3 });

    await expect(
      enforceAiPathsRunRateLimit({
        userId: 'user-1',
        permissions: [],
        isElevated: false,
      })
    ).resolves.toBeUndefined();

    expect(listRunsMock).toHaveBeenCalledTimes(3);
  });

  it('ignores stale running runs when all active candidates are older than stale max age', async () => {
    const staleTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    listRunsMock.mockImplementation(async (options: { statuses?: AiPathRunStatus[] }) => {
      if (Array.isArray(options.statuses) && options.statuses.includes('running')) {
        return {
          runs: [
            buildRun('run-r1', 'running', {
              createdAt: staleTimestamp,
              updatedAt: staleTimestamp,
              startedAt: staleTimestamp,
            }),
            buildRun('run-r2', 'running', {
              createdAt: staleTimestamp,
              updatedAt: staleTimestamp,
              startedAt: staleTimestamp,
            }),
            buildRun('run-r3', 'running', {
              createdAt: staleTimestamp,
              updatedAt: staleTimestamp,
              startedAt: staleTimestamp,
            }),
            buildRun('run-r4', 'running', {
              createdAt: staleTimestamp,
              updatedAt: staleTimestamp,
              startedAt: staleTimestamp,
            }),
            buildRun('run-r5', 'running', {
              createdAt: staleTimestamp,
              updatedAt: staleTimestamp,
              startedAt: staleTimestamp,
            }),
          ],
          total: 5,
        };
      }
      return { runs: [], total: 0 };
    });

    await expect(
      enforceAiPathsRunRateLimit({
        userId: 'user-1',
        permissions: [],
        isElevated: false,
      })
    ).resolves.toBeUndefined();
  });
});
