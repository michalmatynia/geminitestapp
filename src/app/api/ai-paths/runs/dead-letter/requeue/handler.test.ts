import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { aiPathRunDeadLetterRequeueRequestSchema } from '@/shared/contracts/ai-paths';

const {
  requireAiPathsAccessMock,
  enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccessMock,
  resumePathRunMock,
  assertAiPathRunQueueReadyMock,
  parseJsonBodyMock,
  findRunByIdMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  assertAiPathRunAccessMock: vi.fn(),
  resumePathRunMock: vi.fn(),
  assertAiPathRunQueueReadyMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  findRunByIdMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccess: assertAiPathRunAccessMock,
  resumePathRun: resumePathRunMock,
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
    listRuns: vi.fn().mockResolvedValue({ runs: [], total: 0 }),
    getQueueStats: vi.fn().mockResolvedValue({ queuedCount: 0, processingCount: 0 }),
    markStaleRunningRuns: vi.fn(),
  })),
}));

import { postHandler } from './handler';

describe('ai-paths dead-letter requeue handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue({
      userId: 'user-1',
      isElevated: false,
    });
    enforceAiPathsActionRateLimitMock.mockReset().mockResolvedValue(undefined);
    assertAiPathRunAccessMock.mockReset().mockReturnValue(undefined);
    resumePathRunMock.mockReset().mockResolvedValue({ id: 'run-1', status: 'queued' });
    assertAiPathRunQueueReadyMock.mockReset().mockResolvedValue(undefined);
    parseJsonBodyMock.mockReset().mockResolvedValue({
      ok: true,
      data: {
        runIds: ['run-1'],
        mode: 'replay',
      },
    });
    findRunByIdMock.mockReset().mockResolvedValue({ id: 'run-1', status: 'dead_lettered' });
  });

  it('parses the shared requeue DTO and requeues the requested dead-letter run', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/ai-paths/runs/dead-letter/requeue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runIds: ['run-1'], mode: 'replay' }),
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(parseJsonBodyMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      aiPathRunDeadLetterRequeueRequestSchema,
      expect.objectContaining({ logPrefix: 'ai-paths.runs.dead-letter.requeue' })
    );
    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'run-requeue'
    );
    expect(assertAiPathRunAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      expect.objectContaining({ id: 'run-1', status: 'dead_lettered' })
    );
    expect(resumePathRunMock).toHaveBeenCalledWith('run-1', 'replay');
    await expect(response.json()).resolves.toEqual({
      requeued: 1,
      runIds: ['run-1'],
      errors: [],
    });
  });
});
