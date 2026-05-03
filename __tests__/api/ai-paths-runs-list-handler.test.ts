import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import type { AiPathRunListResult } from '@/shared/contracts/ai-paths';

const requireAiPathsRunAccessMock = vi.hoisted(() => vi.fn());
const requireAiPathsAccessMock = vi.hoisted(() => vi.fn());
const enforceAiPathsActionRateLimitMock = vi.hoisted(() => vi.fn());
const canAccessGlobalAiPathRunsMock = vi.hoisted(() => vi.fn());

const getPathRunRepositoryMock = vi.hoisted(() => vi.fn());
const resolvePathRunRepositoryMock = vi.hoisted(() => vi.fn());
const resolveAlternatePathRunRepositoryMock = vi.hoisted(() => vi.fn());
const listRunsMock = vi.hoisted(() => vi.fn());
const deletePathRunsWithRepositoryMock = vi.hoisted(() => vi.fn());

const recoverStaleRunningRunsMock = vi.hoisted(() => vi.fn());
const resolveAiPathsStaleRunningCleanupIntervalMsMock = vi.hoisted(() => vi.fn());
const resolveAiPathsStaleRunningMaxAgeMsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  requireAiPathsAccess: requireAiPathsAccessMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  canAccessGlobalAiPathRuns: canAccessGlobalAiPathRunsMock,
  deletePathRunsWithRepository: deletePathRunsWithRepositoryMock,
  recoverStaleRunningRuns: recoverStaleRunningRunsMock,
  resolveAiPathsStaleRunningCleanupIntervalMs: resolveAiPathsStaleRunningCleanupIntervalMsMock,
  resolveAiPathsStaleRunningMaxAgeMs: resolveAiPathsStaleRunningMaxAgeMsMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/ai-paths/services/path-run-repository')>();

  return {
    ...actual,
    getPathRunRepository: getPathRunRepositoryMock,
    resolvePathRunRepository: resolvePathRunRepositoryMock,
    resolveAlternatePathRunRepository: resolveAlternatePathRunRepositoryMock,
  };
});

import { getHandler, __testOnly } from '@/app/api/ai-paths/runs/handler';

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

const buildScopedRunsListExpectation = (overrides: Record<string, unknown>) =>
  expect.objectContaining({
    userId: 'user-1',
    ...overrides,
  });

const globalRunsListExpectation = expect.not.objectContaining({
  userId: expect.any(String),
});

const statusFreeRunsListExpectation = expect.not.objectContaining({
  status: expect.any(String),
});

const sourceModeFreeRunsListExpectation = expect.not.objectContaining({
  sourceMode: expect.any(String),
});

describe('AI Paths runs list handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __testOnly.clearRunsListResponseCache();
    requireAiPathsRunAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
    requireAiPathsAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
    enforceAiPathsActionRateLimitMock.mockResolvedValue(undefined);
    canAccessGlobalAiPathRunsMock.mockReturnValue(false);
    resolveAiPathsStaleRunningCleanupIntervalMsMock.mockReturnValue(60_000);
    resolveAiPathsStaleRunningMaxAgeMsMock.mockReturnValue(30 * 60 * 1000);
    recoverStaleRunningRunsMock.mockResolvedValue(0);
    listRunsMock.mockResolvedValue({ runs: [], total: 0 });
    getPathRunRepositoryMock.mockResolvedValue({ listRuns: listRunsMock });
    resolvePathRunRepositoryMock.mockResolvedValue({
      provider: 'mongodb',
      routeMode: 'explicit',
      collection: 'ai_path_runs',
      repo: {
        listRuns: listRunsMock,
      },
    });
    resolveAlternatePathRunRepositoryMock.mockResolvedValue(null);
  });

  it('passes nodeId filter through to repository list options', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?pathId=path-node-filter&nodeId=node-42&status=failed&limit=25&offset=5'
      ),
      mockContext
    );
    const payload = (await response.json()) as AiPathRunListResult;

    expect(response.status).toBe(200);
    expect(listRunsMock).toHaveBeenCalledWith(buildScopedRunsListExpectation({
      pathId: 'path-node-filter',
      nodeId: 'node-42',
      status: 'failed',
      limit: 25,
      offset: 5,
    }));
    expect(payload).toEqual({ runs: [], total: 0 });
  });

  it('uses distinct cache keys for different node filters', async () => {
    await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?pathId=cache-key-path&nodeId=node-a&limit=1'
      ),
      mockContext
    );
    await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?pathId=cache-key-path&nodeId=node-b&limit=1'
      ),
      mockContext
    );

    expect(listRunsMock).toHaveBeenCalledTimes(2);
    expect(listRunsMock).toHaveBeenNthCalledWith(
      1,
      buildScopedRunsListExpectation({
        nodeId: 'node-a',
      })
    );
    expect(listRunsMock).toHaveBeenNthCalledWith(
      2,
      buildScopedRunsListExpectation({
        nodeId: 'node-b',
      })
    );
  });

  it('treats status=all as an unfiltered run list', async () => {
    await getHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?status=all&limit=25&offset=0'),
      mockContext
    );

    expect(listRunsMock).toHaveBeenCalledWith(statusFreeRunsListExpectation);
  });

  it('forwards source and sourceMode when source is provided', async () => {
    await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?source=ai_paths_ui&sourceMode=exclude&limit=50'
      ),
      mockContext
    );

    expect(listRunsMock).toHaveBeenCalledWith(buildScopedRunsListExpectation({
      source: 'ai_paths_ui',
      sourceMode: 'exclude',
      limit: 50,
    }));
  });

  it('allows explicit global visibility for users with global run access', async () => {
    canAccessGlobalAiPathRunsMock.mockReturnValue(true);

    await getHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?visibility=global&limit=10'),
      mockContext
    );

    expect(listRunsMock).toHaveBeenCalledWith(globalRunsListExpectation);
  });

  it('rejects explicit global visibility without global run access', async () => {
    await expect(
      getHandler(
        new NextRequest('http://localhost/api/ai-paths/runs?visibility=global&limit=10'),
        mockContext
      )
    ).rejects.toMatchObject({ httpStatus: 403 });
  });

  it('bypasses the list response cache when fresh=1 is provided', async () => {
    listRunsMock
      .mockResolvedValueOnce({ runs: [], total: 1 })
      .mockResolvedValueOnce({ runs: [], total: 2 });

    const first = await getHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?pathId=fresh-run-cache&fresh=1'),
      mockContext
    );
    const second = await getHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?pathId=fresh-run-cache&fresh=1'),
      mockContext
    );

    expect((await first.json()) as AiPathRunListResult).toEqual({ runs: [], total: 1 });
    expect((await second.json()) as AiPathRunListResult).toEqual({ runs: [], total: 2 });
    expect(listRunsMock).toHaveBeenCalledTimes(2);
  });

  it('uses distinct cache keys for scoped and global visibility', async () => {
    canAccessGlobalAiPathRunsMock.mockReturnValue(true);

    await getHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?pathId=visibility-split&limit=1'),
      mockContext
    );
    await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?pathId=visibility-split&limit=1&visibility=global'
      ),
      mockContext
    );

    expect(listRunsMock).toHaveBeenCalledTimes(2);
    expect(listRunsMock).toHaveBeenNthCalledWith(
      1,
      buildScopedRunsListExpectation({})
    );
    expect(listRunsMock).toHaveBeenNthCalledWith(
      2,
      globalRunsListExpectation
    );
  });

  it('ignores sourceMode when source is missing', async () => {
    await getHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?sourceMode=exclude&limit=10'),
      mockContext
    );

    expect(listRunsMock).toHaveBeenCalledWith(sourceModeFreeRunsListExpectation);
  });
});
