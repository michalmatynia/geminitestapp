import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { serviceUnavailableError } from '@/shared/errors/app-error';

const requireAiPathsRunAccessMock = vi.hoisted(() => vi.fn());
const enforceAiPathsRunRateLimitMock = vi.hoisted(() => vi.fn());
const requireAiPathsAccessMock = vi.hoisted(() => vi.fn());
const enforceAiPathsActionRateLimitMock = vi.hoisted(() => vi.fn());
const assertAiPathRunAccessMock = vi.hoisted(() => vi.fn());
const assertAiPathRunQueueReadyMock = vi.hoisted(() => vi.fn());
const parseJsonBodyMock = vi.hoisted(() => vi.fn());
const enqueuePathRunMock = vi.hoisted(() => vi.fn());
const resumePathRunMock = vi.hoisted(() => vi.fn());
const retryPathRunNodeMock = vi.hoisted(() => vi.fn());
const getPathRunRepositoryMock = vi.hoisted(() => vi.fn());
const getAiPathsSettingMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  enforceAiPathsRunRateLimit: enforceAiPathsRunRateLimitMock,
  requireAiPathsAccess: requireAiPathsAccessMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccess: assertAiPathRunAccessMock,
  enqueuePathRun: enqueuePathRunMock,
  resumePathRun: resumePathRunMock,
  retryPathRunNode: retryPathRunNodeMock,
  getAiPathsSetting: getAiPathsSettingMock,
}));

vi.mock('@/features/jobs/server', () => ({
  assertAiPathRunQueueReady: assertAiPathRunQueueReadyMock,
  assertAiPathRunQueueReadyForEnqueue: assertAiPathRunQueueReadyMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

import { POST_handler as enqueueHandler } from '@/app/api/ai-paths/runs/enqueue/handler';
import { POST_handler as resumeHandler } from '@/app/api/ai-paths/runs/[runId]/resume/handler';
import { POST_handler as retryNodeHandler } from '@/app/api/ai-paths/runs/[runId]/retry-node/handler';
import { POST_handler as deadLetterRequeueHandler } from '@/app/api/ai-paths/runs/dead-letter/requeue/handler';

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

describe('AI Paths fail-fast queue guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsRunAccessMock.mockResolvedValue({ userId: 'user-1', isAdmin: true });
    requireAiPathsAccessMock.mockResolvedValue({ userId: 'user-1', isElevated: true });
    enforceAiPathsRunRateLimitMock.mockResolvedValue(undefined);
    enforceAiPathsActionRateLimitMock.mockResolvedValue(undefined);
    assertAiPathRunAccessMock.mockReturnValue(undefined);
    assertAiPathRunQueueReadyMock.mockRejectedValue(
      serviceUnavailableError('AI Paths queue worker is unavailable. Please retry in a few seconds.')
    );
    enqueuePathRunMock.mockResolvedValue({ id: 'run-1' });
    resumePathRunMock.mockResolvedValue({ id: 'run-1' });
    retryPathRunNodeMock.mockResolvedValue({ id: 'run-1' });
    getPathRunRepositoryMock.mockResolvedValue({
      findRunById: vi.fn().mockResolvedValue({ id: 'run-1', status: 'failed' }),
      listRuns: vi.fn().mockResolvedValue({ runs: [] }),
    });
  });

  it('rejects enqueue when queue is unavailable and does not create run', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        pathId: 'path-1',
        pathName: 'Path 1',
        triggerEvent: 'manual',
        triggerNodeId: 'node-aaaaaaaaaaaaaaaaaaaaaaaa',
        nodes: [
          {
            id: 'node-aaaaaaaaaaaaaaaaaaaaaaaa',
            instanceId: 'node-aaaaaaaaaaaaaaaaaaaaaaaa',
            nodeTypeId: 'nt-dff9c882bb670577004a37ea',
            type: 'trigger',
            title: 'Trigger: Product Modal',
            description: '',
            position: { x: 0, y: 0 },
            inputs: [],
            outputs: ['trigger', 'triggerName'],
            config: { trigger: { event: 'manual' } },
          },
        ],
        edges: [],
      },
    });

    await expect(
      enqueueHandler(
        new NextRequest('http://localhost/api/ai-paths/runs/enqueue', { method: 'POST' }),
        mockContext
      )
    ).rejects.toMatchObject({ httpStatus: 503 });

    expect(enqueuePathRunMock).not.toHaveBeenCalled();
  });

  it('rejects resume when queue is unavailable and does not resume run', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: { mode: 'resume' },
    });

    await expect(
      resumeHandler(
        new NextRequest('http://localhost/api/ai-paths/runs/run-1/resume', { method: 'POST' }),
        mockContext,
        { runId: 'run-1' }
      )
    ).rejects.toMatchObject({ httpStatus: 503 });

    expect(resumePathRunMock).not.toHaveBeenCalled();
  });

  it('rejects retry-node when queue is unavailable and does not retry node', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: { nodeId: 'node-1' },
    });

    await expect(
      retryNodeHandler(
        new NextRequest('http://localhost/api/ai-paths/runs/run-1/retry-node', {
          method: 'POST',
        }),
        mockContext,
        { runId: 'run-1' }
      )
    ).rejects.toMatchObject({ httpStatus: 503 });

    expect(retryPathRunNodeMock).not.toHaveBeenCalled();
  });

  it('rejects dead-letter requeue when queue is unavailable', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: { runIds: ['run-1'], mode: 'resume' },
    });

    await expect(
      deadLetterRequeueHandler(
        new NextRequest('http://localhost/api/ai-paths/runs/dead-letter/requeue', {
          method: 'POST',
        }),
        mockContext
      )
    ).rejects.toMatchObject({ httpStatus: 503 });

    expect(getPathRunRepositoryMock).not.toHaveBeenCalled();
    expect(resumePathRunMock).not.toHaveBeenCalled();
  });
});
