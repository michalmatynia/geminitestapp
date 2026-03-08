import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const requireAiPathsAccessMock = vi.hoisted(() => vi.fn());
const enforceAiPathsActionRateLimitMock = vi.hoisted(() => vi.fn());
const assertAiPathRunAccessMock = vi.hoisted(() => vi.fn());

const findRunByIdMock = vi.hoisted(() => vi.fn());
const getPathRunRepositoryMock = vi.hoisted(() => vi.fn());

const cancelPathRunWithRepositoryMock = vi.hoisted(() => vi.fn());
const removePathRunQueueEntriesMock = vi.hoisted(() => vi.fn());

const runRepositoryMock = vi.hoisted(() => ({
  findRunById: findRunByIdMock,
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccess: assertAiPathRunAccessMock,
  cancelPathRunWithRepository: cancelPathRunWithRepositoryMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('@/features/ai/server', () => ({
  removePathRunQueueEntries: removePathRunQueueEntriesMock,
}));

import { POST_handler } from '@/app/api/ai-paths/runs/[runId]/cancel/handler';

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

type CancelRunResponse = {
  run: AiPathRunRecord | null;
  canceled: boolean;
  runId: string;
  message?: string;
};

describe('AI Paths run cancel handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
    enforceAiPathsActionRateLimitMock.mockResolvedValue(undefined);
    assertAiPathRunAccessMock.mockReturnValue(undefined);
    removePathRunQueueEntriesMock.mockResolvedValue({ removed: 0, requested: 1 });
    getPathRunRepositoryMock.mockResolvedValue(runRepositoryMock);
  });

  it('removes queue entry when run is missing', async () => {
    findRunByIdMock.mockResolvedValue(null);

    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-missing/cancel', {
        method: 'POST',
      }),
      mockContext,
      { runId: 'run-missing' }
    );
    const payload = (await response.json()) as CancelRunResponse;

    expect(response.status).toBe(200);
    expect(cancelPathRunWithRepositoryMock).not.toHaveBeenCalled();
    expect(removePathRunQueueEntriesMock).toHaveBeenCalledWith(['run-missing']);
    expect(findRunByIdMock).toHaveBeenCalledTimes(1);
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
      mockContext,
      { runId: 'run-terminal' }
    );
    const payload = (await response.json()) as CancelRunResponse;

    expect(response.status).toBe(200);
    expect(cancelPathRunWithRepositoryMock).toHaveBeenCalledWith(
      runRepositoryMock,
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
      mockContext,
      { runId: 'run-active' }
    );
    const payload = (await response.json()) as CancelRunResponse;

    expect(response.status).toBe(200);
    expect(cancelPathRunWithRepositoryMock).toHaveBeenCalledWith(
      runRepositoryMock,
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
