import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  __resetAiPathsRunRateLimitProbeCacheForTests,
  enforceAiPathsRunRateLimit,
} from '../access';

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
    createdAt: new Date().toISOString(),
    updatedAt: null,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  }) as AiPathRunRecord;

describe('enforceAiPathsRunRateLimit', () => {
  beforeEach(() => {
    __resetAiPathsRunRateLimitProbeCacheForTests();
    listRunsMock.mockReset().mockResolvedValue({ runs: [], total: 0 });
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

  afterEach(() => {
    vi.useRealTimers();
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
        source: 'ai_paths_ui',
        sourceMode: 'include',
      })
    );
  });

  it('ignores non-AI-path run sources when probing active admission limits', async () => {
    listRunsMock.mockImplementation(
      async (options: {
        statuses?: AiPathRunStatus[];
        source?: string;
        sourceMode?: 'include' | 'exclude';
      }) => {
        if (Array.isArray(options.statuses) && options.statuses.includes('running')) {
          if (options.source === 'ai_paths_ui' && options.sourceMode === 'include') {
            return { runs: [], total: 0 };
          }
          return {
            runs: Array.from({ length: 5 }, (_, index) =>
              buildRun(`run-ext-${index + 1}`, 'running', {
                meta: { source: 'integration_base_export' },
              })
            ),
            total: 5,
          };
        }
        return { runs: [], total: 0 };
      }
    );

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
        source: 'ai_paths_ui',
        sourceMode: 'include',
      })
    );
    expect(getQueueStatsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'ai_paths_ui',
        sourceMode: 'include',
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

  it('does not mark stale runs from the admission hot path', async () => {
    listRunsMock.mockResolvedValueOnce({ runs: [], total: 0 }).mockResolvedValueOnce({
      runs: [
        buildRun('run-r1', 'running'),
        buildRun('run-r2', 'running'),
        buildRun('run-r3', 'running'),
        buildRun('run-r4', 'running'),
        buildRun('run-r5', 'running'),
      ],
      total: 5,
    });

    await expect(
      enforceAiPathsRunRateLimit({
        userId: 'user-1',
        permissions: [],
        isElevated: false,
      })
    ).rejects.toThrow('Too many active runs. Wait for one to finish before starting another.');

    expect(listRunsMock).toHaveBeenCalledTimes(2);
    expect(markStaleRunningRunsMock).not.toHaveBeenCalled();
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

  it('fails closed with 503 when an active-run probe times out and no cache is available', async () => {
    vi.useFakeTimers();
    listRunsMock
      .mockResolvedValueOnce({ runs: [], total: 0 })
      .mockImplementationOnce(() => new Promise(() => {}));

    const expectation = expect(
      enforceAiPathsRunRateLimit({
        userId: 'user-1',
        permissions: [],
        isElevated: false,
      })
    ).rejects.toMatchObject({
      httpStatus: 503,
      retryAfterMs: 5_000,
    });

    await vi.advanceTimersByTimeAsync(1_600);
    await expectation;
  });

  it('uses a fresh cached active-run probe result when a later active probe times out', async () => {
    listRunsMock.mockResolvedValue({ runs: [], total: 0 });

    await expect(
      enforceAiPathsRunRateLimit({
        userId: 'user-1',
        permissions: [],
        isElevated: false,
      })
    ).resolves.toBeUndefined();

    vi.useFakeTimers();
    listRunsMock.mockReset();
    getQueueStatsMock.mockReset().mockResolvedValue({
      queuedCount: 0,
      oldestQueuedAt: null,
    });
    listRunsMock.mockImplementation(
      async (options: { statuses?: AiPathRunStatus[] }) => {
        if (Array.isArray(options.statuses) && options.statuses.includes('running')) {
          return new Promise(() => {});
        }
        return { runs: [], total: 0 };
      }
    );

    const expectation = expect(
      enforceAiPathsRunRateLimit({
        userId: 'user-1',
        permissions: [],
        isElevated: false,
      })
    ).resolves.toBeUndefined();

    await vi.advanceTimersByTimeAsync(1_600);
    await expectation;
  });
});
