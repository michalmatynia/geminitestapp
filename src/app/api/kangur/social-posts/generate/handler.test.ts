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

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

vi.mock('@/shared/lib/queue', () => ({
  isRedisAvailable: (...args: unknown[]) => mocks.isRedisAvailableMock(...args),
  isRedisReachable: (...args: unknown[]) => mocks.isRedisReachableMock(...args),
}));

import { postKangurSocialPostGenerateHandler } from './handler';

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
    mocks.resolveKangurActorMock.mockResolvedValue({
      role: 'admin',
      actorId: 'admin-1',
    });
    mocks.enqueueKangurSocialPipelineJobMock.mockResolvedValue('job-generate-1');
    mocks.recoverKangurSocialPipelineQueueMock.mockResolvedValue([]);
    mocks.isRedisAvailableMock.mockReturnValue(true);
    mocks.isRedisReachableMock.mockResolvedValue(true);
  });

  it('queues post generation in the Redis runtime for an existing post', async () => {
    const response = await postKangurSocialPostGenerateHandler(
      new NextRequest('http://localhost/api/kangur/social-posts/generate', {
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

    expect(mocks.recoverKangurSocialPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(mocks.startKangurSocialPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueKangurSocialPipelineJobMock).toHaveBeenCalledWith({
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
    await postKangurSocialPostGenerateHandler(
      new NextRequest('http://localhost/api/kangur/social-posts/generate', {
        method: 'POST',
      }),
      createContext({
        postId: 'post-1',
        docReferences: ['overview'],
        imageAddonIds: ['addon-1'],
        prefetchedVisualAnalysis: {
          summary: 'The hero now shows a larger classroom card.',
          highlights: ['Larger classroom card'],
        },
        requireVisualAnalysisInBody: true,
      })
    );

    expect(mocks.enqueueKangurSocialPipelineJobMock).toHaveBeenCalledWith({
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
});
