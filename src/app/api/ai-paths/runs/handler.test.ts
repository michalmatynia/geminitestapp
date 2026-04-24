import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsAccessMock,
  requireAiPathsRunAccessMock,
  canAccessGlobalAiPathRunsMock,
  enforceAiPathsActionRateLimitMock,
  resolvePathRunRepositoryMock,
  deletePathRunsWithRepositoryMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  requireAiPathsRunAccessMock: vi.fn(),
  canAccessGlobalAiPathRunsMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  resolvePathRunRepositoryMock: vi.fn(),
  deletePathRunsWithRepositoryMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  canAccessGlobalAiPathRuns: canAccessGlobalAiPathRunsMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  deletePathRunsWithRepository: deletePathRunsWithRepositoryMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/ai-paths/services/path-run-repository')>();
  return {
    ...actual,
    resolvePathRunRepository: resolvePathRunRepositoryMock,
  };
});

import { __testOnly, getPathRunsHandler as getHandler } from './handler';

describe('ai-paths runs handler', () => {
  const repo = {
    listRuns: vi.fn(),
  };

  beforeEach(() => {
    __testOnly.clearRunsListResponseCache();
    requireAiPathsAccessMock.mockReset().mockResolvedValue({ userId: 'user-1' });
    requireAiPathsRunAccessMock.mockReset().mockResolvedValue({ userId: 'user-1' });
    canAccessGlobalAiPathRunsMock.mockReset().mockReturnValue(false);
    enforceAiPathsActionRateLimitMock.mockReset().mockResolvedValue(undefined);
    deletePathRunsWithRepositoryMock.mockReset().mockResolvedValue({ count: 0 });
    repo.listRuns.mockReset().mockResolvedValue({
      runs: [{ id: 'run-1', status: 'queued', pathId: 'path-1' }],
      total: 1,
    });
    resolvePathRunRepositoryMock.mockReset().mockResolvedValue({
      provider: 'mongodb',
      routeMode: 'explicit',
      collection: 'ai_path_runs',
      repo,
    });
  });

  it('forwards requestId filters to the repository list call', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?pathId=path-1&requestId=trigger:path-1:req-1&includeTotal=0&fresh=1'
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      runs: [{ id: 'run-1', status: 'queued', pathId: 'path-1' }],
      total: 1,
    });
    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Route-Mode')).toBe('explicit');
    expect(response.headers.get('X-Ai-Paths-Run-Read-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Read-Mode')).toBe('selected');
    expect(repo.listRuns).toHaveBeenCalledWith({
      userId: 'user-1',
      pathId: 'path-1',
      requestId: 'trigger:path-1:req-1',
      includeTotal: false,
    });
  });

  it('surfaces writer-reader repository mismatch headers when listed runs were enqueued through another provider', async () => {
    repo.listRuns.mockResolvedValueOnce({
      runs: [
        {
          id: 'run-2',
          status: 'queued',
          pathId: 'path-2',
          meta: {
            runRepository: {
              collection: 'ai_path_runs',
              provider: 'mongodb',
              routeMode: 'fallback',
            },
          },
        },
      ],
      total: 1,
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?fresh=1'),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Provider-Mismatch')).toBe('1');
    expect(response.headers.get('X-Ai-Paths-Run-Provider-Mismatch-Count')).toBe('1');
    expect(response.headers.get('X-Ai-Paths-Run-Writer-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Writer-Route-Mode')).toBe('fallback');
  });

  it('returns an empty result with selected repository headers when requestId lookups miss', async () => {
    repo.listRuns.mockResolvedValueOnce({
      runs: [],
      total: 0,
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?requestId=req-alt&fresh=1'),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Read-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Read-Mode')).toBe('selected');
    await expect(response.json()).resolves.toEqual({
      runs: [],
      total: 0,
    });
    expect(repo.listRuns).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        requestId: 'req-alt',
      })
    );
  });

  it('lists Base export runs without invoking side effects', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?pathId=integration-base-export&fresh=1'),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(repo.listRuns).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: 'integration-base-export',
      })
    );
  });
});
