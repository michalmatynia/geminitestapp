import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const requireAiPathsRunAccessMock = vi.hoisted(() => vi.fn());
const canAccessGlobalAiPathRunsMock = vi.hoisted(() => vi.fn());
const getAiPathRunQueueStatusMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  canAccessGlobalAiPathRuns: canAccessGlobalAiPathRunsMock,
}));

vi.mock('@/features/jobs/server', () => ({
  getAiPathRunQueueStatus: getAiPathRunQueueStatusMock,
}));

vi.mock('@/features/ai/ai-paths/workers/ai-path-run-queue/status', () => ({
  getAiPathRunQueueStatus: getAiPathRunQueueStatusMock,
}));

import { GET_handler, __testOnly } from '@/app/api/ai-paths/runs/queue-status/handler';

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

describe('AI Paths queue status handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __testOnly.clearQueueStatusCache();
    requireAiPathsRunAccessMock.mockResolvedValue({
      userId: 'user-1',
      permissions: [],
      isElevated: false,
    });
    canAccessGlobalAiPathRunsMock.mockReturnValue(false);
    getAiPathRunQueueStatusMock.mockResolvedValue({
      queuedCount: 0,
      activeRuns: 0,
      waitingCount: 0,
      failedCount: 0,
      delayedCount: 0,
    });
  });

  it('passes scoped visibility through with the current user id', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/queue-status?visibility=scoped'),
      mockContext
    );

    expect(response.status).toBe(200);
    expect(getAiPathRunQueueStatusMock).toHaveBeenCalledWith({
      bypassCache: false,
      userId: 'user-1',
      visibility: 'scoped',
    });
  });

  it('allows explicit global visibility for users with global access', async () => {
    canAccessGlobalAiPathRunsMock.mockReturnValue(true);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/queue-status?visibility=global'),
      mockContext
    );

    expect(response.status).toBe(200);
    expect(getAiPathRunQueueStatusMock).toHaveBeenCalledWith({
      bypassCache: false,
      visibility: 'global',
    });
  });

  it('rejects explicit global visibility without global access', async () => {
    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/runs/queue-status?visibility=global'),
        mockContext
      )
    ).rejects.toMatchObject({ httpStatus: 403 });
  });

  it('uses distinct cache entries for scoped and global visibility', async () => {
    canAccessGlobalAiPathRunsMock.mockReturnValue(true);

    await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/queue-status?visibility=scoped'),
      mockContext
    );
    await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/queue-status?visibility=global'),
      mockContext
    );

    expect(getAiPathRunQueueStatusMock).toHaveBeenCalledTimes(2);
    expect(getAiPathRunQueueStatusMock).toHaveBeenNthCalledWith(1, {
      bypassCache: false,
      userId: 'user-1',
      visibility: 'scoped',
    });
    expect(getAiPathRunQueueStatusMock).toHaveBeenNthCalledWith(2, {
      bypassCache: false,
      visibility: 'global',
    });
  });

  it('bypasses route and worker caches when fresh=1 is provided', async () => {
    getAiPathRunQueueStatusMock
      .mockResolvedValueOnce({ queuedCount: 1 })
      .mockResolvedValueOnce({ queuedCount: 2 });

    const first = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/queue-status?fresh=1'),
      mockContext
    );
    const second = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/queue-status?fresh=1'),
      mockContext
    );

    expect((await first.json()) as { status: { queuedCount: number } }).toEqual({
      status: { queuedCount: 1 },
    });
    expect((await second.json()) as { status: { queuedCount: number } }).toEqual({
      status: { queuedCount: 2 },
    });
    expect(getAiPathRunQueueStatusMock).toHaveBeenCalledTimes(2);
    expect(getAiPathRunQueueStatusMock).toHaveBeenNthCalledWith(1, {
      bypassCache: true,
      userId: 'user-1',
      visibility: 'scoped',
    });
    expect(getAiPathRunQueueStatusMock).toHaveBeenNthCalledWith(2, {
      bypassCache: true,
      userId: 'user-1',
      visibility: 'scoped',
    });
  });
});
