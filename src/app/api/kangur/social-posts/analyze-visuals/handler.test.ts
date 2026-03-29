import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const mocks = vi.hoisted(() => ({
  enqueueKangurSocialPipelineJobMock: vi.fn(),
  recoverKangurSocialPipelineQueueMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  startKangurSocialPipelineQueueMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  isRedisAvailableMock: vi.fn(),
  isRedisReachableMock: vi.fn(),
  updateKangurSocialPostMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => mocks.resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/workers/kangurSocialPipelineQueue', () => ({
  enqueueKangurSocialPipelineJob: (...args: unknown[]) =>
    mocks.enqueueKangurSocialPipelineJobMock(...args),
  recoverKangurSocialPipelineQueue: (...args: unknown[]) =>
    mocks.recoverKangurSocialPipelineQueueMock(...args),
  startKangurSocialPipelineQueue: (...args: unknown[]) =>
    mocks.startKangurSocialPipelineQueueMock(...args),
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: (...args: unknown[]) => mocks.logKangurServerEventMock(...args),
}));

vi.mock('@/features/kangur/server/social-posts-repository', () => ({
  updateKangurSocialPost: (...args: unknown[]) => mocks.updateKangurSocialPostMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

vi.mock('@/shared/lib/queue', () => ({
  isRedisAvailable: (...args: unknown[]) => mocks.isRedisAvailableMock(...args),
  isRedisReachable: (...args: unknown[]) => mocks.isRedisReachableMock(...args),
}));

import { postKangurSocialPostAnalyzeVisualsHandler } from './handler';

const createContext = (body?: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-social-analyze-1',
    traceId: 'trace-social-analyze-1',
    correlationId: 'corr-social-analyze-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('social post analyze visuals handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveKangurActorMock.mockResolvedValue({
      role: 'admin',
      actorId: 'admin-1',
    });
    mocks.enqueueKangurSocialPipelineJobMock.mockResolvedValue('job-analyze-1');
    mocks.recoverKangurSocialPipelineQueueMock.mockResolvedValue([]);
    mocks.isRedisAvailableMock.mockReturnValue(true);
    mocks.isRedisReachableMock.mockResolvedValue(true);
    mocks.updateKangurSocialPostMock.mockResolvedValue(null);
  });

  it('queues visual analysis in the Redis runtime for the selected image add-ons', async () => {
    const response = await postKangurSocialPostAnalyzeVisualsHandler(
      new NextRequest('http://localhost/api/kangur/social-posts/analyze-visuals', {
        method: 'POST',
      }),
      createContext({
        postId: 'post-1',
        docReferences: ['overview'],
        notes: 'Focus on homepage changes.',
        visionModelId: 'vision-1',
        imageAddonIds: ['addon-1'],
      })
    );

    expect(mocks.recoverKangurSocialPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(mocks.startKangurSocialPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueKangurSocialPipelineJobMock).toHaveBeenCalledWith({
      type: 'manual-post-visual-analysis',
      input: {
        postId: 'post-1',
        docReferences: ['overview'],
        notes: 'Focus on homepage changes.',
        visionModelId: 'vision-1',
        imageAddonIds: ['addon-1'],
        actorId: 'admin-1',
      },
    });
    expect(mocks.updateKangurSocialPostMock).toHaveBeenCalledWith('post-1', {
      visualAnalysisStatus: 'queued',
      visualAnalysisJobId: 'job-analyze-1',
      visualAnalysisModelId: 'vision-1',
      updatedBy: 'admin-1',
    });
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      success: true,
      jobId: 'job-analyze-1',
      jobType: 'manual-post-visual-analysis',
    });
  });
});
