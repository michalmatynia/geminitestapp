import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  enqueueSocialPublishingPipelineJobMock: vi.fn(),
  recoverSocialPublishingPipelineQueueMock: vi.fn(),
  resolveSocialPublishingActorMock: vi.fn(),
  startSocialPublishingPipelineQueueMock: vi.fn(),
  logSocialPublishingServerEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  isRedisAvailableMock: vi.fn(),
  isRedisReachableMock: vi.fn(),
  updateSocialPublishingPostMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => mocks.resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/workers/socialPublishingPipelineQueue', () => ({
  enqueueSocialPublishingPipelineJob: (...args: unknown[]) =>
    mocks.enqueueSocialPublishingPipelineJobMock(...args),
  recoverSocialPublishingPipelineQueue: (...args: unknown[]) =>
    mocks.recoverSocialPublishingPipelineQueueMock(...args),
  startSocialPublishingPipelineQueue: (...args: unknown[]) =>
    mocks.startSocialPublishingPipelineQueueMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-observability', () => ({
  logSocialPublishingServerEvent: (...args: unknown[]) => mocks.logSocialPublishingServerEventMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-posts-repository', () => ({
  updateSocialPublishingPost: (...args: unknown[]) => mocks.updateSocialPublishingPostMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

vi.mock('@/shared/lib/queue', () => ({
  isRedisAvailable: (...args: unknown[]) => mocks.isRedisAvailableMock(...args),
  isRedisReachable: (...args: unknown[]) => mocks.isRedisReachableMock(...args),
}));

import { postSocialPublishingPostAnalyzeVisualsHandler } from './handler';

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
    mocks.resolveSocialPublishingActorMock.mockResolvedValue({
      role: 'admin',
      actorId: 'admin-1',
    });
    mocks.enqueueSocialPublishingPipelineJobMock.mockResolvedValue('job-analyze-1');
    mocks.recoverSocialPublishingPipelineQueueMock.mockResolvedValue([]);
    mocks.isRedisAvailableMock.mockReturnValue(true);
    mocks.isRedisReachableMock.mockResolvedValue(true);
    mocks.updateSocialPublishingPostMock.mockResolvedValue(null);
  });

  it('queues visual analysis in the Redis runtime for the selected image add-ons', async () => {
    const response = await postSocialPublishingPostAnalyzeVisualsHandler(
      new NextRequest('http://localhost/api/filemaker/social-posts/analyze-visuals', {
        method: 'POST',
      }),
      createContext({
        postId: 'post-1',
        visionModelId: 'vision-1',
        imageAddonIds: ['addon-1'],
      })
    );

    expect(mocks.recoverSocialPublishingPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(mocks.startSocialPublishingPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueSocialPublishingPipelineJobMock).toHaveBeenCalledWith({
      type: 'manual-post-visual-analysis',
      input: {
        postId: 'post-1',
        visionModelId: 'vision-1',
        imageAddonIds: ['addon-1'],
        actorId: 'admin-1',
      },
    });
    expect(mocks.updateSocialPublishingPostMock).toHaveBeenCalledWith('post-1', {
      visualAnalysisStatus: 'queued',
      visualAnalysisJobId: 'job-analyze-1',
      visualAnalysisModelId: 'vision-1',
      visualAnalysisError: null,
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
