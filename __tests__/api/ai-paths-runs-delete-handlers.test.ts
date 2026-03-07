import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const requireAiPathsAccessMock = vi.hoisted(() => vi.fn());
const requireAiPathsRunAccessMock = vi.hoisted(() => vi.fn());
const enforceAiPathsActionRateLimitMock = vi.hoisted(() => vi.fn());
const assertAiPathRunAccessMock = vi.hoisted(() => vi.fn());
const canAccessGlobalAiPathRunsMock = vi.hoisted(() => vi.fn());

const findRunByIdMock = vi.hoisted(() => vi.fn());
const getPathRunRepositoryMock = vi.hoisted(() => vi.fn());

const deletePathRunWithRepositoryMock = vi.hoisted(() => vi.fn());
const deletePathRunsWithRepositoryMock = vi.hoisted(() => vi.fn());
const recoverStaleRunningRunsMock = vi.hoisted(() => vi.fn());
const resolveAiPathsStaleRunningCleanupIntervalMsMock = vi.hoisted(() => vi.fn());
const resolveAiPathsStaleRunningMaxAgeMsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccess: assertAiPathRunAccessMock,
  canAccessGlobalAiPathRuns: canAccessGlobalAiPathRunsMock,
  deletePathRunWithRepository: deletePathRunWithRepositoryMock,
  deletePathRunsWithRepository: deletePathRunsWithRepositoryMock,
  recoverStaleRunningRuns: recoverStaleRunningRunsMock,
  resolveAiPathsStaleRunningCleanupIntervalMs:
    resolveAiPathsStaleRunningCleanupIntervalMsMock,
  resolveAiPathsStaleRunningMaxAgeMs: resolveAiPathsStaleRunningMaxAgeMsMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

import { DELETE_handler as deleteRunHandler } from '@/app/api/ai-paths/runs/[runId]/handler';
import { DELETE_handler as clearRunsHandler } from '@/app/api/ai-paths/runs/handler';

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

describe('AI Paths run delete handlers', () => {
  const repoMock = {
    findRunById: findRunByIdMock,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
    requireAiPathsRunAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
    enforceAiPathsActionRateLimitMock.mockResolvedValue(undefined);
    assertAiPathRunAccessMock.mockReturnValue(undefined);
    canAccessGlobalAiPathRunsMock.mockReturnValue(false);
    getPathRunRepositoryMock.mockResolvedValue(repoMock);
    recoverStaleRunningRunsMock.mockResolvedValue(0);
    resolveAiPathsStaleRunningCleanupIntervalMsMock.mockReturnValue(120_000);
    resolveAiPathsStaleRunningMaxAgeMsMock.mockReturnValue(30 * 60 * 1000);
  });

  it('deletes a single run via service helper', async () => {
    findRunByIdMock.mockResolvedValue({ id: 'run-delete-1', status: 'queued' });
    deletePathRunWithRepositoryMock.mockResolvedValue(true);

    const response = await deleteRunHandler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-delete-1', {
        method: 'DELETE',
      }),
      mockContext,
      { runId: 'run-delete-1' }
    );
    const payload = (await response.json()) as { deleted: boolean; runId: string };

    expect(response.status).toBe(200);
    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(expect.anything(), 'run-delete');
    expect(deletePathRunWithRepositoryMock).toHaveBeenCalledWith(repoMock, 'run-delete-1');
    expect(payload).toMatchObject({
      deleted: true,
      runId: 'run-delete-1',
    });
  });

  it('clears terminal runs via service helper with scoped filters', async () => {
    deletePathRunsWithRepositoryMock.mockResolvedValue({ count: 3 });

    const response = await clearRunsHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?scope=terminal&pathId=path-1&source=trigger&sourceMode=exclude',
        { method: 'DELETE' }
      ),
      mockContext
    );
    const payload = (await response.json()) as { deleted: number; scope: string };

    expect(response.status).toBe(200);
    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(expect.anything(), 'runs-clear');
    expect(deletePathRunsWithRepositoryMock).toHaveBeenCalledWith(
      repoMock,
      expect.objectContaining({
        userId: 'user-1',
        pathId: 'path-1',
        source: 'trigger',
        sourceMode: 'exclude',
        statuses: ['completed', 'failed', 'canceled', 'dead_lettered'],
      })
    );
    expect(payload).toMatchObject({
      deleted: 3,
      scope: 'terminal',
    });
  });

  it('clears all runs without user scope when access is global', async () => {
    canAccessGlobalAiPathRunsMock.mockReturnValue(true);
    deletePathRunsWithRepositoryMock.mockResolvedValue({ count: 7 });

    const response = await clearRunsHandler(
      new NextRequest('http://localhost/api/ai-paths/runs?scope=all', {
        method: 'DELETE',
      }),
      mockContext
    );
    const payload = (await response.json()) as { deleted: number; scope: string };

    expect(response.status).toBe(200);
    expect(deletePathRunsWithRepositoryMock).toHaveBeenCalledWith(repoMock, {});
    expect(payload).toMatchObject({
      deleted: 7,
      scope: 'all',
    });
  });
});
