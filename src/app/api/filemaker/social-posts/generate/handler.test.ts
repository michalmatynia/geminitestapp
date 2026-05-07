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

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

vi.mock('@/shared/lib/queue', () => ({
  isRedisAvailable: (...args: unknown[]) => mocks.isRedisAvailableMock(...args),
  isRedisReachable: (...args: unknown[]) => mocks.isRedisReachableMock(...args),
}));

import { postSocialPublishingPostGenerateHandler } from './handler';

const createContext = (body?: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-social-generate-1',
    traceId: 'trace-social-generate-1',
    correlationId: 'corr-social-generate-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('social post generate handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSocialPublishingActorMock.mockResolvedValue({
      role: 'admin',
      actorId: 'admin-1',
    });
    mocks.enqueueSocialPublishingPipelineJobMock.mockResolvedValue('job-generate-1');
    mocks.recoverSocialPublishingPipelineQueueMock.mockResolvedValue([]);
    mocks.isRedisAvailableMock.mockReturnValue(true);
    mocks.isRedisReachableMock.mockResolvedValue(true);
  });

  it('queues post generation in the Redis runtime for an existing post', async () => {
    const response = await postSocialPublishingPostGenerateHandler(
      new NextRequest('http://localhost/api/filemaker/social-posts/generate', {
        method: 'POST',
      }),
      createContext({
        postId: 'post-1',
        docReferences: ['overview'],
        notes: 'Focus on onboarding.',
        modelId: 'brain-1',
        visionModelId: 'vision-1',
        imageAddonIds: [],
        projectUrl: 'https://studiq.example.com/project',
      })
    );

    expect(mocks.recoverSocialPublishingPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(mocks.startSocialPublishingPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueSocialPublishingPipelineJobMock).toHaveBeenCalledWith({
      type: 'manual-post-generation',
      input: expect.objectContaining({
        postId: 'post-1',
        docReferences: ['overview'],
        notes: 'Focus on onboarding.',
        modelId: 'brain-1',
        visionModelId: 'vision-1',
        imageAddonIds: [],
        projectUrl: 'https://studiq.example.com/project',
        actorId: 'admin-1',
      }),
    });
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      success: true,
      jobId: 'job-generate-1',
      jobType: 'manual-post-generation',
    });
  });

  it('passes prefetched visual analysis through to the queued generation job when provided', async () => {
    await postSocialPublishingPostGenerateHandler(
      new NextRequest('http://localhost/api/filemaker/social-posts/generate', {
        method: 'POST',
      }),
      createContext({
        postId: 'post-1',
        docReferences: ['overview'],
        imageAddonIds: ['addon-1'],
        projectUrl: 'https://studiq.example.com/project',
        prefetchedVisualAnalysis: {
          summary: 'The hero now shows a larger classroom card.',
          highlights: ['Larger classroom card'],
        },
        requireVisualAnalysisInBody: true,
      })
    );

    expect(mocks.enqueueSocialPublishingPipelineJobMock).toHaveBeenCalledWith({
      type: 'manual-post-generation',
      input: expect.objectContaining({
        prefetchedVisualAnalysis: {
          summary: 'The hero now shows a larger classroom card.',
          highlights: ['Larger classroom card'],
        },
        requireVisualAnalysisInBody: true,
      }),
    });
  });

  it('rejects generation when Project URL is missing or localhost-only', async () => {
    await expect(
      postSocialPublishingPostGenerateHandler(
        new NextRequest('http://localhost/api/filemaker/social-posts/generate', {
          method: 'POST',
        }),
        createContext({
          postId: 'post-1',
          docReferences: ['overview'],
          imageAddonIds: ['addon-1'],
        })
      )
    ).rejects.toMatchObject({
      message: 'Set Settings Project URL before generating social posts.',
    });

    await expect(
      postSocialPublishingPostGenerateHandler(
        new NextRequest('http://localhost/api/filemaker/social-posts/generate', {
          method: 'POST',
        }),
        createContext({
          postId: 'post-1',
          docReferences: ['overview'],
          imageAddonIds: ['addon-1'],
          projectUrl: 'http://localhost:3000',
        })
      )
    ).rejects.toMatchObject({
      message:
        'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.',
    });

    expect(mocks.recoverSocialPublishingPipelineQueueMock).not.toHaveBeenCalled();
    expect(mocks.startSocialPublishingPipelineQueueMock).not.toHaveBeenCalled();
    expect(mocks.enqueueSocialPublishingPipelineJobMock).not.toHaveBeenCalled();
  });
});
