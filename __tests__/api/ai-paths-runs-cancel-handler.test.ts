import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAiPathsAccessMock = vi.hoisted(() => vi.fn());
const enforceAiPathsActionRateLimitMock = vi.hoisted(() => vi.fn());
const assertAiPathRunAccessMock = vi.hoisted(() => vi.fn());

const findRunByIdMock = vi.hoisted(() => vi.fn());
const getPathRunRepositoryMock = vi.hoisted(() => vi.fn());

const cancelPathRunWithRepositoryMock = vi.hoisted(() => vi.fn());
const removePathRunQueueEntriesMock = vi.hoisted(() => vi.fn());

const prismaPathRunRepositoryMock = vi.hoisted(() => ({
  findRunById: findRunByIdMock,
}));
const mongoPathRunRepositoryMock = vi.hoisted(() => ({
  findRunById: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccess: assertAiPathRunAccessMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository/prisma-path-run-repository', () => ({
  prismaPathRunRepository: prismaPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-repository/mongo-path-run-repository', () => ({
  mongoPathRunRepository: mongoPathRunRepositoryMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-service', () => ({
  cancelPathRunWithRepository: cancelPathRunWithRepositoryMock,
}));

vi.mock('@/features/jobs/workers/aiPathRunQueue', () => ({
  removePathRunQueueEntries: removePathRunQueueEntriesMock,
}));

import { POST_handler } from '@/app/api/ai-paths/runs/[runId]/cancel/handler';

describe('AI Paths run cancel handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
    enforceAiPathsActionRateLimitMock.mockResolvedValue(undefined);
    assertAiPathRunAccessMock.mockReturnValue(undefined);
    removePathRunQueueEntriesMock.mockResolvedValue({ removed: 0, requested: 1 });
    getPathRunRepositoryMock.mockResolvedValue(prismaPathRunRepositoryMock);
  });

  it('removes queue entry when run is missing', async () => {
    findRunByIdMock.mockResolvedValue(null);

    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-missing/cancel', {
        method: 'POST',
      }),
      {} as never,
      { runId: 'run-missing' }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(cancelPathRunWithRepositoryMock).not.toHaveBeenCalled();
    expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith(['run-missing']);
    expect(payload).toMatchObject({
      run: null,
      canceled: false,
      runId: 'run-missing',
    });
  });

  it('uses service-level cancellation for terminal runs without direct queue cleanup', async () => {
    findRunByIdMock.mockResolvedValue({
      id: 'run-terminal',
      status: 'completed',
    });
    cancelPathRunWithRepositoryMock.mockResolvedValue({
      id: 'run-terminal',
      status: 'completed',
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-terminal/cancel', {
        method: 'POST',
      }),
      {} as never,
      { runId: 'run-terminal' }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(cancelPathRunWithRepositoryMock).toHaveBeenCalledWith(
      prismaPathRunRepositoryMock,
      'run-terminal'
    );
    expect(removePathRunQueueEntriesMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      canceled: false,
      runId: 'run-terminal',
      message: 'Run is already completed.',
    });
  });

  it('cancels active runs via service without direct queue cleanup', async () => {
    findRunByIdMock.mockResolvedValue({
      id: 'run-active',
      status: 'running',
    });
    cancelPathRunWithRepositoryMock.mockResolvedValue({
      id: 'run-active',
      status: 'canceled',
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-active/cancel', {
        method: 'POST',
      }),
      {} as never,
      { runId: 'run-active' }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(cancelPathRunWithRepositoryMock).toHaveBeenCalledWith(
      prismaPathRunRepositoryMock,
      'run-active'
    );
    expect(removePathRunQueueEntriesMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      canceled: true,
      runId: 'run-active',
      run: { id: 'run-active', status: 'canceled' },
    });
  });
});
