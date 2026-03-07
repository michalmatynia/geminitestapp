import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsAccessMock,
  requireAiPathsRunAccessMock,
  canAccessGlobalAiPathRunsMock,
  enforceAiPathsActionRateLimitMock,
  recoverStaleRunningRunsMock,
  getPathRunRepositoryMock,
  deletePathRunsWithRepositoryMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  requireAiPathsRunAccessMock: vi.fn(),
  canAccessGlobalAiPathRunsMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  recoverStaleRunningRunsMock: vi.fn(),
  getPathRunRepositoryMock: vi.fn(),
  deletePathRunsWithRepositoryMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  canAccessGlobalAiPathRuns: canAccessGlobalAiPathRunsMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-recovery-service', () => ({
  recoverStaleRunningRuns: recoverStaleRunningRunsMock,
  resolveAiPathsStaleRunningCleanupIntervalMs: vi.fn(() => 60_000),
  resolveAiPathsStaleRunningMaxAgeMs: vi.fn(() => 300_000),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-service', () => ({
  deletePathRunsWithRepository: deletePathRunsWithRepositoryMock,
}));

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
    getPathRunRepositoryMock.mockReset().mockResolvedValue(repo);
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
    expect(repo.listRuns).toHaveBeenCalledWith({
      userId: 'user-1',
      pathId: 'path-1',
      requestId: 'trigger:path-1:req-1',
      includeTotal: false,
    });
  });
});
