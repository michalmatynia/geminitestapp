import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPathRunRepositoryMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: (...args: unknown[]) => mocks.getPathRunRepositoryMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

describe('base-export-run-recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks stale pre-dispatch Base export runs failed while ignoring live queued-worker runs', async () => {
    const repo = {
      listRuns: vi
        .fn()
        .mockResolvedValueOnce({
          runs: [
            {
              id: 'run-stale',
              status: 'running',
              userId: 'user-1',
              pathId: 'integration-base-export',
              entityId: 'product-1',
              meta: {
                source: 'integration_base_export',
                sourceInfo: { connectionId: 'connection-1' },
              },
              createdAt: '2026-04-04T22:00:00.000Z',
              updatedAt: '2026-04-04T22:00:00.000Z',
              startedAt: '2026-04-04T22:00:05.000Z',
            },
            {
              id: 'run-live',
              status: 'running',
              userId: 'user-1',
              pathId: 'integration-base-export',
              entityId: 'product-1',
              meta: {
                source: 'integration_base_export',
                sourceInfo: { connectionId: 'connection-1' },
                jobId: 'job-live',
              },
              createdAt: '2026-04-04T22:00:00.000Z',
              updatedAt: '2026-04-04T22:00:00.000Z',
              startedAt: '2026-04-04T22:00:05.000Z',
            },
          ],
          total: 2,
        })
        .mockResolvedValueOnce({ runs: [], total: 0 }),
      updateRunIfStatus: vi.fn().mockResolvedValue({ id: 'run-stale', status: 'failed' }),
      createRunEvent: vi.fn().mockResolvedValue(undefined),
    };
    mocks.getPathRunRepositoryMock.mockResolvedValue(repo);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T22:20:00.000Z'));

    const { recoverStaleBaseExportRuns } = await import('./base-export-run-recovery');
    await expect(
      recoverStaleBaseExportRuns({
        userId: 'user-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        maxAgeMs: 5 * 60 * 1000,
      })
    ).resolves.toBe(1);

    expect(repo.listRuns).toHaveBeenCalledWith({
      userId: 'user-1',
      pathId: 'integration-base-export',
      source: 'integration_base_export',
      status: 'running',
      limit: 100,
      offset: 0,
      includeTotal: false,
    });
    expect(repo.updateRunIfStatus).toHaveBeenCalledTimes(1);
    expect(repo.updateRunIfStatus).toHaveBeenCalledWith(
      'run-stale',
      ['running'],
      expect.objectContaining({
        status: 'failed',
        errorMessage: 'Run marked failed because Base.com export never reached the queue worker.',
      })
    );
    expect(repo.createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-stale',
        level: 'error',
        message:
          'Export failed: Run marked failed because Base.com export never reached the queue worker.',
      })
    );
    vi.useRealTimers();
  });
});
