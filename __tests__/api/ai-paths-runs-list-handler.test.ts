import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAiPathsRunAccessMock = vi.hoisted(() => vi.fn());
const requireAiPathsAccessMock = vi.hoisted(() => vi.fn());
const enforceAiPathsActionRateLimitMock = vi.hoisted(() => vi.fn());
const canAccessGlobalAiPathRunsMock = vi.hoisted(() => vi.fn());

const getPathRunRepositoryMock = vi.hoisted(() => vi.fn());
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
}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-service', () => ({
  deletePathRunsWithRepository: deletePathRunsWithRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-recovery-service', () => ({
  recoverStaleRunningRuns: recoverStaleRunningRunsMock,
  resolveAiPathsStaleRunningCleanupIntervalMs:
    resolveAiPathsStaleRunningCleanupIntervalMsMock,
  resolveAiPathsStaleRunningMaxAgeMs: resolveAiPathsStaleRunningMaxAgeMsMock,
}));

import { GET_handler } from '@/app/api/ai-paths/runs/handler';

describe('AI Paths runs list handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsRunAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
    requireAiPathsAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
    enforceAiPathsActionRateLimitMock.mockResolvedValue(undefined);
    canAccessGlobalAiPathRunsMock.mockReturnValue(false);
    resolveAiPathsStaleRunningCleanupIntervalMsMock.mockReturnValue(60_000);
    resolveAiPathsStaleRunningMaxAgeMsMock.mockReturnValue(30 * 60 * 1000);
    recoverStaleRunningRunsMock.mockResolvedValue(0);
    listRunsMock.mockResolvedValue({ runs: [], total: 0 });
    getPathRunRepositoryMock.mockResolvedValue({
      listRuns: listRunsMock,
    });
  });

  it('passes nodeId filter through to repository list options', async () => {
    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?pathId=path-node-filter&nodeId=node-42&status=failed&limit=25&offset=5',
      ),
      {} as never,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listRunsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        pathId: 'path-node-filter',
        nodeId: 'node-42',
        status: 'failed',
        limit: 25,
        offset: 5,
      }),
    );
    expect(payload).toEqual({ runs: [], total: 0 });
  });

  it('uses distinct cache keys for different node filters', async () => {
    await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?pathId=cache-key-path&nodeId=node-a&limit=1',
      ),
      {} as never,
    );
    await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/runs?pathId=cache-key-path&nodeId=node-b&limit=1',
      ),
      {} as never,
    );

    expect(listRunsMock).toHaveBeenCalledTimes(2);
    expect(listRunsMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        nodeId: 'node-a',
      }),
    );
    expect(listRunsMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        nodeId: 'node-b',
      }),
    );
  });
});
