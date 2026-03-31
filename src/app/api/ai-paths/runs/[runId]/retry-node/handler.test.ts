import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { aiPathRunRetryNodeRequestSchema } from '@/shared/contracts/ai-paths';

const {
  requireAiPathsAccessMock,
  enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccessMock,
  retryPathRunNodeMock,
  assertAiPathRunQueueReadyMock,
  parseJsonBodyMock,
  findRunByIdMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  assertAiPathRunAccessMock: vi.fn(),
  retryPathRunNodeMock: vi.fn(),
  assertAiPathRunQueueReadyMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  findRunByIdMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccess: assertAiPathRunAccessMock,
  retryPathRunNode: retryPathRunNodeMock,
}));

vi.mock('@/features/jobs/server', () => ({
  assertAiPathRunQueueReady: assertAiPathRunQueueReadyMock,
}));

vi.mock('@/features/ai/ai-paths/workers/aiPathRunQueue', () => ({
  assertAiPathRunQueueReady: assertAiPathRunQueueReadyMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(async () => ({
    findRunById: findRunByIdMock,
    getQueueStats: vi.fn().mockResolvedValue({ queuedCount: 0, processingCount: 0 }),
  })),
}));

import { POST_handler } from './handler';

describe('ai-paths run retry-node handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue({ userId: 'user-1' });
    enforceAiPathsActionRateLimitMock.mockReset().mockResolvedValue(undefined);
    assertAiPathRunAccessMock.mockReset().mockReturnValue(undefined);
    retryPathRunNodeMock.mockReset().mockResolvedValue({ id: 'run-1', status: 'queued' });
    assertAiPathRunQueueReadyMock.mockReset().mockResolvedValue(undefined);
    parseJsonBodyMock.mockReset().mockResolvedValue({
      ok: true,
      data: { nodeId: 'node-1' },
    });
    findRunByIdMock.mockReset().mockResolvedValue({ id: 'run-1', status: 'failed' });
  });

  it('parses the shared retry DTO and retries the requested node', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/runs/run-1/retry-node', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nodeId: 'node-1' }),
      }),
      {} as Parameters<typeof POST_handler>[1],
      { runId: 'run-1' }
    );

    expect(response.status).toBe(200);
    expect(parseJsonBodyMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      aiPathRunRetryNodeRequestSchema,
      expect.objectContaining({ logPrefix: 'ai-paths.runs.retry-node' })
    );
    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      { userId: 'user-1' },
      'run-retry'
    );
    expect(assertAiPathRunAccessMock).toHaveBeenCalledWith(
      { userId: 'user-1' },
      expect.objectContaining({ id: 'run-1' })
    );
    expect(retryPathRunNodeMock).toHaveBeenCalledWith('run-1', 'node-1');
    await expect(response.json()).resolves.toEqual({
      run: { id: 'run-1', status: 'queued' },
    });
  });
});
