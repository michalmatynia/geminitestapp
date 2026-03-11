import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsAccessMock,
  requireAiPathsRunAccessMock,
  canAccessGlobalAiPathRunsMock,
  enforceAiPathsActionRateLimitMock,
  recoverStaleRunningRunsMock,
  resolvePathRunRepositoryMock,
  resolveAlternatePathRunRepositoryMock,
  deletePathRunsWithRepositoryMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  requireAiPathsRunAccessMock: vi.fn(),
  canAccessGlobalAiPathRunsMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  recoverStaleRunningRunsMock: vi.fn(),
  resolvePathRunRepositoryMock: vi.fn(),
  resolveAlternatePathRunRepositoryMock: vi.fn(),
  deletePathRunsWithRepositoryMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  canAccessGlobalAiPathRuns: canAccessGlobalAiPathRunsMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  recoverStaleRunningRuns: recoverStaleRunningRunsMock,
  resolveAiPathsStaleRunningCleanupIntervalMs: vi.fn(() => 60_000),
  resolveAiPathsStaleRunningMaxAgeMs: vi.fn(() => 300_000),
  deletePathRunsWithRepository: deletePathRunsWithRepositoryMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/lib/ai-paths/services/path-run-repository')>();
  return {
    ...actual,
    resolvePathRunRepository: resolvePathRunRepositoryMock,
    resolveAlternatePathRunRepository: resolveAlternatePathRunRepositoryMock,
  };
});

import { __testOnly, GET_handler } from './handler';

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
    recoverStaleRunningRunsMock.mockReset().mockResolvedValue(undefined);
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
    resolveAlternatePathRunRepositoryMock.mockReset().mockResolvedValue(null);
  });

  it('forwards requestId filters to the repository list call', async () => {
    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?pathId=path-1&requestId=trigger:path-1:req-1&includeTotal=0&fresh=1'
      ),
      {} as Parameters<typeof GET_handler>[1]
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
              provider: 'prisma',
              routeMode: 'fallback',
            },
          },
        },
      ],
      total: 1,
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs?fresh=1'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Provider-Mismatch')).toBe('1');
    expect(response.headers.get('X-Ai-Paths-Run-Provider-Mismatch-Count')).toBe('1');
    expect(response.headers.get('X-Ai-Paths-Run-Writer-Provider')).toBe('prisma');
    expect(response.headers.get('X-Ai-Paths-Run-Writer-Route-Mode')).toBe('fallback');
  });

  it('falls back to the alternate provider for requestId lookups when the selected provider has no runs', async () => {
    repo.listRuns.mockResolvedValueOnce({
      runs: [],
      total: 0,
    });
    const alternateRepo = {
      listRuns: vi.fn().mockResolvedValue({
        runs: [{ id: 'run-alt', status: 'queued', pathId: 'path-alt' }],
        total: 1,
      }),
    };
    resolveAlternatePathRunRepositoryMock.mockResolvedValueOnce({
      provider: 'prisma',
      collection: 'ai_path_runs',
      repo: alternateRepo,
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs?requestId=req-alt&fresh=1'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Read-Provider')).toBe('prisma');
    expect(response.headers.get('X-Ai-Paths-Run-Read-Mode')).toBe('alternate');
    await expect(response.json()).resolves.toEqual({
      runs: [{ id: 'run-alt', status: 'queued', pathId: 'path-alt' }],
      total: 1,
    });
    expect(alternateRepo.listRuns).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        requestId: 'req-alt',
      })
    );
  });
});
