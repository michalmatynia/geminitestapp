import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  enqueueKangurSocialPipelineJobMock,
  recoverKangurSocialPipelineQueueMock,
  resolveKangurActorMock,
  startKangurSocialPipelineQueueMock,
  isRedisAvailableMock,
  isRedisReachableMock,
} = vi.hoisted(() => ({
  enqueueKangurSocialPipelineJobMock: vi.fn(),
  recoverKangurSocialPipelineQueueMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  startKangurSocialPipelineQueueMock: vi.fn(),
  isRedisAvailableMock: vi.fn(),
  isRedisReachableMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/social/workers/kangurSocialPipelineQueue', () => ({
  enqueueKangurSocialPipelineJob: (...args: unknown[]) =>
    enqueueKangurSocialPipelineJobMock(...args),
  recoverKangurSocialPipelineQueue: (...args: unknown[]) =>
    recoverKangurSocialPipelineQueueMock(...args),
  startKangurSocialPipelineQueue: (...args: unknown[]) =>
    startKangurSocialPipelineQueueMock(...args),
}));

vi.mock('@/shared/lib/queue', () => ({
  isRedisAvailable: (...args: unknown[]) => isRedisAvailableMock(...args),
  isRedisReachable: (...args: unknown[]) => isRedisReachableMock(...args),
}));

import { postHandler } from './handler';

const createContext = (body?: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-social-pipeline-trigger-1',
    traceId: 'trace-social-pipeline-trigger-1',
    correlationId: 'corr-social-pipeline-trigger-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('social pipeline trigger handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      role: 'admin',
      actorId: 'admin-1',
    });
    recoverKangurSocialPipelineQueueMock.mockResolvedValue([]);
    enqueueKangurSocialPipelineJobMock.mockResolvedValue('job-123');
    isRedisAvailableMock.mockReturnValue(true);
    isRedisReachableMock.mockResolvedValue(true);
  });

  it('recovers stale jobs, starts the worker, and enqueues the scheduled tick job by default', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
        method: 'POST',
      }),
      createContext()
    );

    expect(recoverKangurSocialPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(startKangurSocialPipelineQueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueKangurSocialPipelineJobMock).toHaveBeenCalledWith({
      type: 'pipeline-tick',
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      jobId: 'job-123',
      jobType: 'pipeline-tick',
    });
  });

  it('enqueues a manual post pipeline job with forwarded cookies', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
        method: 'POST',
        headers: {
          cookie: 'session=abc123',
        },
      }),
      createContext({
        jobType: 'manual-post-pipeline',
        input: {
          postId: 'post-1',
          captureMode: 'fresh_capture',
          editorState: {
            titlePl: 'Tytul',
            titleEn: 'Title',
            bodyPl: 'Body PL',
            bodyEn: 'Body EN',
          },
          imageAssets: [],
          imageAddonIds: [],
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1'],
          batchCapturePresetLimit: 1,
          linkedinConnectionId: null,
          brainModelId: 'brain-1',
          visionModelId: 'vision-1',
          projectUrl: 'https://example.com/project',
          generationNotes: 'Focus on visuals',
          docReferences: ['docs/kangur/example.mdx'],
        },
      })
    );

    expect(enqueueKangurSocialPipelineJobMock).toHaveBeenCalledWith({
      type: 'manual-post-pipeline',
      input: expect.objectContaining({
        postId: 'post-1',
        captureMode: 'fresh_capture',
        batchCapturePresetLimit: 1,
        actorId: 'admin-1',
        forwardCookies: 'session=abc123',
      }),
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      jobId: 'job-123',
      jobType: 'manual-post-pipeline',
    });
  });

  it('accepts more than 12 attached images for a manual post pipeline job', async () => {
    const imageAssets = Array.from({ length: 13 }, (_, index) => ({
      id: `asset-${index + 1}`,
      url: `/asset-${index + 1}.png`,
    }));

    const response = await postHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
        method: 'POST',
      }),
      createContext({
        jobType: 'manual-post-pipeline',
        input: {
          postId: 'post-1',
          captureMode: 'existing_assets',
          editorState: {
            titlePl: 'Tytul',
            titleEn: 'Title',
            bodyPl: 'Body PL',
            bodyEn: 'Body EN',
          },
          imageAssets,
          imageAddonIds: ['addon-1'],
          linkedinConnectionId: null,
          brainModelId: 'brain-1',
          visionModelId: 'vision-1',
          projectUrl: 'https://example.com/project',
          generationNotes: 'Focus on visuals',
          docReferences: ['docs/kangur/example.mdx'],
        },
      })
    );

    expect(enqueueKangurSocialPipelineJobMock).toHaveBeenCalledWith({
      type: 'manual-post-pipeline',
      input: expect.objectContaining({
        postId: 'post-1',
        captureMode: 'existing_assets',
        imageAssets,
        imageAddonIds: ['addon-1'],
        actorId: 'admin-1',
        forwardCookies: '',
      }),
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      jobId: 'job-123',
      jobType: 'manual-post-pipeline',
    });
  });

  it('fails fast when Redis is configured but unreachable', async () => {
    isRedisReachableMock.mockResolvedValueOnce(false);

    await expect(
      postHandler(
        new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
          method: 'POST',
        }),
        createContext()
      )
    ).rejects.toMatchObject({
      message: 'Social pipeline queue is not available. Redis is configured but unreachable.',
    });

    expect(recoverKangurSocialPipelineQueueMock).not.toHaveBeenCalled();
    expect(startKangurSocialPipelineQueueMock).not.toHaveBeenCalled();
    expect(enqueueKangurSocialPipelineJobMock).not.toHaveBeenCalled();
  });

  it('enqueues a manual visual analysis job', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
        method: 'POST',
      }),
      createContext({
        jobType: 'manual-post-visual-analysis',
        input: {
          postId: 'post-1',
          visionModelId: 'vision-1',
          imageAddonIds: ['addon-1'],
        },
      })
    );

    expect(enqueueKangurSocialPipelineJobMock).toHaveBeenCalledWith({
      type: 'manual-post-visual-analysis',
      input: {
        postId: 'post-1',
        visionModelId: 'vision-1',
        imageAddonIds: ['addon-1'],
        actorId: 'admin-1',
      },
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      jobId: 'job-123',
      jobType: 'manual-post-visual-analysis',
    });
  });

  it('rejects manual pipeline jobs when Project URL is missing or localhost-only', async () => {
    await expect(
      postHandler(
        new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
          method: 'POST',
        }),
        createContext({
          jobType: 'manual-post-pipeline',
          input: {
            postId: 'post-1',
            captureMode: 'existing_assets',
            editorState: {
              titlePl: 'Tytul',
              titleEn: 'Title',
              bodyPl: 'Body PL',
              bodyEn: 'Body EN',
            },
            imageAssets: [],
            imageAddonIds: ['addon-1'],
            linkedinConnectionId: null,
            brainModelId: 'brain-1',
            visionModelId: 'vision-1',
            generationNotes: 'Focus on visuals',
            docReferences: ['docs/kangur/example.mdx'],
          },
        })
      )
    ).rejects.toMatchObject({
      message: 'Set Settings Project URL before generating social posts.',
    });

    await expect(
      postHandler(
        new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
          method: 'POST',
        }),
        createContext({
          jobType: 'manual-post-pipeline',
          input: {
            postId: 'post-1',
            captureMode: 'existing_assets',
            editorState: {
              titlePl: 'Tytul',
              titleEn: 'Title',
              bodyPl: 'Body PL',
              bodyEn: 'Body EN',
            },
            imageAssets: [],
            imageAddonIds: ['addon-1'],
            linkedinConnectionId: null,
            brainModelId: 'brain-1',
            visionModelId: 'vision-1',
            projectUrl: 'http://localhost:3000',
            generationNotes: 'Focus on visuals',
            docReferences: ['docs/kangur/example.mdx'],
          },
        })
      )
    ).rejects.toMatchObject({
      message:
        'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.',
    });

    expect(recoverKangurSocialPipelineQueueMock).not.toHaveBeenCalled();
    expect(startKangurSocialPipelineQueueMock).not.toHaveBeenCalled();
    expect(enqueueKangurSocialPipelineJobMock).not.toHaveBeenCalled();
  });

  it('enqueues a manual post generation job', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
        method: 'POST',
      }),
      createContext({
        jobType: 'manual-post-generation',
        input: {
          postId: 'post-1',
          docReferences: ['overview'],
          notes: 'Focus on the updated hero.',
          modelId: 'brain-1',
          visionModelId: 'vision-1',
          imageAddonIds: ['addon-1'],
          projectUrl: 'https://studiq.example.com/project',
          prefetchedVisualAnalysis: {
            summary: 'Updated hero card',
            highlights: ['Updated hero card'],
          },
          requireVisualAnalysisInBody: true,
        },
      })
    );

    expect(enqueueKangurSocialPipelineJobMock).toHaveBeenCalledWith({
      type: 'manual-post-generation',
      input: {
        postId: 'post-1',
        docReferences: ['overview'],
        notes: 'Focus on the updated hero.',
        modelId: 'brain-1',
        visionModelId: 'vision-1',
        imageAddonIds: ['addon-1'],
        projectUrl: 'https://studiq.example.com/project',
        prefetchedVisualAnalysis: {
          summary: 'Updated hero card',
          highlights: ['Updated hero card'],
        },
        requireVisualAnalysisInBody: true,
        actorId: 'admin-1',
      },
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      jobId: 'job-123',
      jobType: 'manual-post-generation',
    });
  });

  it('rejects manual post generation jobs when Project URL is missing or localhost-only', async () => {
    await expect(
      postHandler(
        new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
          method: 'POST',
        }),
        createContext({
          jobType: 'manual-post-generation',
          input: {
            postId: 'post-1',
            docReferences: ['overview'],
            notes: 'Focus on the updated hero.',
            modelId: 'brain-1',
            visionModelId: 'vision-1',
            imageAddonIds: ['addon-1'],
          },
        })
      )
    ).rejects.toMatchObject({
      message: 'Set Settings Project URL before generating social posts.',
    });

    await expect(
      postHandler(
        new NextRequest('http://localhost/api/kangur/social-pipeline/trigger', {
          method: 'POST',
        }),
        createContext({
          jobType: 'manual-post-generation',
          input: {
            postId: 'post-1',
            docReferences: ['overview'],
            notes: 'Focus on the updated hero.',
            modelId: 'brain-1',
            visionModelId: 'vision-1',
            imageAddonIds: ['addon-1'],
            projectUrl: 'http://localhost:3000',
          },
        })
      )
    ).rejects.toMatchObject({
      message:
        'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.',
    });

    expect(recoverKangurSocialPipelineQueueMock).not.toHaveBeenCalled();
    expect(startKangurSocialPipelineQueueMock).not.toHaveBeenCalled();
    expect(enqueueKangurSocialPipelineJobMock).not.toHaveBeenCalled();
  });
});
