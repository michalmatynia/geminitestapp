import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  resolveKangurActorMock,
  getKangurSocialPipelineQueueMock,
  getHealthStatusMock,
  getQueueMock,
  getJobMock,
  getJobsMock,
  jobGetStateMock,
  jobRemoveMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  getKangurSocialPipelineQueueMock: vi.fn(),
  getHealthStatusMock: vi.fn(),
  getQueueMock: vi.fn(),
  getJobMock: vi.fn(),
  getJobsMock: vi.fn(),
  jobGetStateMock: vi.fn(),
  jobRemoveMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/social/workers/kangurSocialPipelineQueue', () => ({
  getKangurSocialPipelineQueue: (...args: unknown[]) =>
    getKangurSocialPipelineQueueMock(...args),
}));

import { DELETE_handler, GET_handler } from './handler';

const createContext = (query: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-social-pipeline-jobs-1',
    traceId: 'trace-social-pipeline-jobs-1',
    correlationId: 'corr-social-pipeline-jobs-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

const buildJob = (overrides?: Partial<Record<string, unknown>>) => ({
  id: 'job-1',
  data: null,
  progress: null,
  returnvalue: null,
  failedReason: null,
  processedOn: null,
  finishedOn: null,
  timestamp: 1_700_000_000_000,
  getState: jobGetStateMock,
  remove: jobRemoveMock,
  ...overrides,
});

describe('social pipeline jobs handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      role: 'admin',
      actorId: 'admin-1',
    });
    getKangurSocialPipelineQueueMock.mockReturnValue({
      getHealthStatus: getHealthStatusMock,
      getQueue: getQueueMock,
    });
    getHealthStatusMock.mockResolvedValue({
      running: true,
      healthy: true,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });
    getQueueMock.mockReturnValue({
      getJob: getJobMock,
      getJobs: getJobsMock,
    });
    getJobMock.mockResolvedValue(buildJob());
    getJobsMock.mockResolvedValue([]);
    jobGetStateMock.mockResolvedValue('completed');
    jobRemoveMock.mockResolvedValue(undefined);
  });

  it('returns a compact manual job summary in list mode', async () => {
    getJobsMock.mockResolvedValue([
      buildJob({
        id: 'job-manual-1',
        data: {
          type: 'manual-post-pipeline',
          input: {
            postId: 'post-1',
            docReferences: ['docs/a.mdx', 'docs/b.mdx'],
            imageAddonIds: ['addon-1'],
            imageAssets: [{ id: 'asset-1', url: '/asset-1.png' }],
            forwardCookies: 'secret=1',
          },
        },
        progress: {
          type: 'manual-post-pipeline',
          step: 'capturing',
          captureMode: 'fresh_capture',
          message: 'Captured 3 screenshots.',
          updatedAt: 1_700_000_000_500,
          contextDocCount: 2,
          contextSummary: 'summary',
          addonsCreated: 3,
          captureFailureCount: 1,
          captureFailures: [{ id: 'preset-b', reason: 'Timeout' }],
          requestedPresetCount: 4,
          usedPresetCount: 3,
          usedPresetIds: ['preset-a', 'preset-b', 'preset-c'],
          captureCompletedCount: 3,
          captureRemainingCount: 0,
          captureTotalCount: 4,
          runId: 'run-1',
        },
        returnvalue: {
          type: 'manual-post-pipeline',
          postId: 'post-1',
          captureMode: 'fresh_capture',
          addonsCreated: 3,
          failures: 1,
          runId: 'run-1',
          generatedPost: {
            id: 'post-1',
            bodyPl: 'Large body',
          },
        },
      }),
    ]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/jobs', {
        method: 'GET',
      }),
      createContext({})
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 'job-manual-1',
        status: 'completed',
        data: {
          type: 'manual-post-pipeline',
          input: {
            postId: 'post-1',
            docReferenceCount: 2,
            imageAddonCount: 1,
            imageAssetCount: 1,
          },
        },
        progress: {
          type: 'manual-post-pipeline',
          step: 'capturing',
          captureMode: 'fresh_capture',
          message: 'Captured 3 screenshots.',
          updatedAt: 1_700_000_000_500,
          contextDocCount: 2,
          addonsCreated: 3,
          captureFailureCount: 1,
          requestedPresetCount: 4,
          usedPresetCount: 3,
          captureCompletedCount: 3,
          captureRemainingCount: 0,
          captureTotalCount: 4,
          runId: 'run-1',
        },
        result: {
          type: 'manual-post-pipeline',
          postId: 'post-1',
          captureMode: 'fresh_capture',
          addonsCreated: 3,
          failures: 1,
          runId: 'run-1',
        },
        failedReason: null,
        processedOn: null,
        finishedOn: null,
        timestamp: 1_700_000_000_000,
        duration: null,
      },
    ]);
  });

  it('returns the full manual job result when requesting a specific job id', async () => {
    getJobMock.mockResolvedValue(
      buildJob({
        data: {
          type: 'manual-post-pipeline',
          input: {
            postId: 'post-1',
            docReferences: ['docs/a.mdx'],
            imageAddonIds: ['addon-1'],
            imageAssets: [{ id: 'asset-1', url: '/asset-1.png' }],
            forwardCookies: 'secret=1',
          },
        },
        progress: {
          type: 'manual-post-pipeline',
          step: 'previewing',
          captureMode: 'existing_assets',
          message: 'Preparing documentation diff...',
          updatedAt: 1_700_000_001_000,
          contextDocCount: 1,
          contextSummary: 'summary',
          addonsCreated: 2,
          captureFailureCount: 0,
          captureFailures: [],
          requestedPresetCount: 0,
          usedPresetCount: 0,
          usedPresetIds: [],
          captureCompletedCount: 0,
          captureRemainingCount: 0,
          captureTotalCount: 0,
          runId: 'run-1',
        },
        returnvalue: {
          type: 'manual-post-pipeline',
          postId: 'post-1',
          captureMode: 'existing_assets',
          addonsCreated: 2,
          failures: 0,
          runId: 'run-1',
          contextSummary: 'summary',
          contextDocCount: 1,
          imageAddonIds: ['addon-1'],
          imageAssets: [{ id: 'asset-1', url: '/asset-1.png' }],
          batchCaptureResult: {
            addons: [{ id: 'addon-1' }],
            failures: [],
            runId: 'run-1',
          },
          generatedPost: {
            id: 'post-1',
            titlePl: 'Generated title',
          },
        },
      })
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/jobs?id=job-1', {
        method: 'GET',
      }),
      createContext({ id: 'job-1' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 'job-1',
      status: 'completed',
      data: {
        type: 'manual-post-pipeline',
        input: {
          postId: 'post-1',
          docReferenceCount: 1,
          imageAddonCount: 1,
          imageAssetCount: 1,
        },
      },
      progress: {
        type: 'manual-post-pipeline',
        step: 'previewing',
        captureMode: 'existing_assets',
        message: 'Preparing documentation diff...',
        updatedAt: 1_700_000_001_000,
        contextDocCount: 1,
        addonsCreated: 2,
        captureFailureCount: 0,
        requestedPresetCount: 0,
        usedPresetCount: 0,
        captureCompletedCount: 0,
        captureRemainingCount: 0,
        captureTotalCount: 0,
        runId: 'run-1',
        contextSummary: 'summary',
        captureFailures: [],
        usedPresetIds: [],
      },
      result: {
        type: 'manual-post-pipeline',
        postId: 'post-1',
        captureMode: 'existing_assets',
        addonsCreated: 2,
        failures: 0,
        runId: 'run-1',
        contextSummary: 'summary',
        contextDocCount: 1,
        imageAddonIds: ['addon-1'],
        imageAssets: [{ id: 'asset-1', url: '/asset-1.png' }],
        batchCaptureResult: {
          addons: [{ id: 'addon-1' }],
          failures: [],
          runId: 'run-1',
        },
        generatedPost: {
          id: 'post-1',
          titlePl: 'Generated title',
        },
      },
      failedReason: null,
      processedOn: null,
      finishedOn: null,
      timestamp: 1_700_000_000_000,
      duration: null,
    });
  });

  it('deletes a completed pipeline job', async () => {
    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/jobs?id=job-1', {
        method: 'DELETE',
      }),
      createContext({ id: 'job-1' })
    );

    expect(getJobMock).toHaveBeenCalledWith('job-1');
    expect(jobGetStateMock).toHaveBeenCalledTimes(1);
    expect(jobRemoveMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      deleted: true,
      jobId: 'job-1',
    });
  });

  it('rejects non-admin deletion attempts', async () => {
    resolveKangurActorMock.mockResolvedValue({
      role: 'user',
      actorId: 'user-1',
    });

    await expect(
      DELETE_handler(
        new NextRequest('http://localhost/api/kangur/social-pipeline/jobs?id=job-1', {
          method: 'DELETE',
        }),
        createContext({ id: 'job-1' })
      )
    ).rejects.toThrow('Only admins can delete social pipeline jobs.');
  });

  it('rejects deleting non-terminal jobs', async () => {
    jobGetStateMock.mockResolvedValue('active');

    await expect(
      DELETE_handler(
        new NextRequest('http://localhost/api/kangur/social-pipeline/jobs?id=job-1', {
          method: 'DELETE',
        }),
        createContext({ id: 'job-1' })
      )
    ).rejects.toThrow('Job is active. Only completed or failed pipeline jobs can be deleted.');

    expect(jobRemoveMock).not.toHaveBeenCalled();
  });

  it('fails when the job does not exist', async () => {
    getJobMock.mockResolvedValue(null);

    await expect(
      DELETE_handler(
        new NextRequest('http://localhost/api/kangur/social-pipeline/jobs?id=missing-job', {
          method: 'DELETE',
        }),
        createContext({ id: 'missing-job' })
      )
    ).rejects.toThrow('Job not found.');
  });

  it('returns compact visual-analysis and generation job summaries in list mode', async () => {
    getJobsMock.mockResolvedValue([
      buildJob({
        id: 'job-analysis-1',
        data: {
          type: 'manual-post-visual-analysis',
          input: {
            postId: 'post-1',
            imageAddonIds: ['addon-1', 'addon-2'],
          },
        },
        progress: {
          type: 'manual-post-visual-analysis',
          step: 'saving',
          message: 'Image analysis saved on the post.',
          updatedAt: 1_700_000_002_000,
          postId: 'post-1',
          imageAddonCount: 2,
          highlightCount: 2,
        },
        returnvalue: {
          type: 'manual-post-visual-analysis',
          postId: 'post-1',
          imageAddonIds: ['addon-1', 'addon-2'],
          analysis: {
            summary: 'Updated hero',
            highlights: ['Updated hero', 'New CTA'],
          },
        },
      }),
      buildJob({
        id: 'job-generate-1',
        data: {
          type: 'manual-post-generation',
          input: {
            postId: 'post-2',
            docReferences: ['overview'],
            imageAddonIds: ['addon-3'],
            prefetchedVisualAnalysis: {
              summary: 'Updated hero',
              highlights: ['New CTA'],
            },
            requireVisualAnalysisInBody: true,
          },
        },
        progress: {
          type: 'manual-post-generation',
          step: 'previewing',
          message: 'Draft generated and saved on the post.',
          updatedAt: 1_700_000_002_100,
          postId: 'post-2',
          imageAddonCount: 1,
          docReferenceCount: 1,
          visualSummaryPresent: true,
          highlightCount: 1,
        },
        returnvalue: {
          type: 'manual-post-generation',
          postId: 'post-2',
          imageAddonIds: ['addon-3'],
          generatedPost: { id: 'post-2', titlePl: 'Generated title' },
          draft: null,
        },
      }),
    ]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/jobs', {
        method: 'GET',
      }),
      createContext({})
    );

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'job-analysis-1',
        data: {
          type: 'manual-post-visual-analysis',
          input: {
            postId: 'post-1',
            imageAddonCount: 2,
          },
        },
        progress: {
          type: 'manual-post-visual-analysis',
          step: 'saving',
          message: 'Image analysis saved on the post.',
          updatedAt: 1_700_000_002_000,
          postId: 'post-1',
          imageAddonCount: 2,
          highlightCount: 2,
        },
        result: {
          type: 'manual-post-visual-analysis',
          postId: 'post-1',
          imageAddonCount: 2,
          highlightCount: 2,
        },
      }),
      expect.objectContaining({
        id: 'job-generate-1',
        data: {
          type: 'manual-post-generation',
          input: {
            postId: 'post-2',
            docReferenceCount: 1,
            imageAddonCount: 1,
            usesVisualAnalysisContext: true,
          },
        },
        progress: {
          type: 'manual-post-generation',
          step: 'previewing',
          message: 'Draft generated and saved on the post.',
          updatedAt: 1_700_000_002_100,
          postId: 'post-2',
          imageAddonCount: 1,
          docReferenceCount: 1,
          visualSummaryPresent: true,
          highlightCount: 1,
        },
        result: {
          type: 'manual-post-generation',
          postId: 'post-2',
          imageAddonCount: 1,
          saved: true,
        },
      }),
    ]);
  });

  it('returns the full visual-analysis job payload when requesting a specific job id', async () => {
    getJobMock.mockResolvedValue(
      buildJob({
        data: {
          type: 'manual-post-visual-analysis',
          input: {
            postId: 'post-1',
            imageAddonIds: ['addon-1'],
          },
        },
        progress: {
          type: 'manual-post-visual-analysis',
          step: 'saving',
          message: 'Image analysis saved on the post.',
          updatedAt: 1_700_000_002_000,
          postId: 'post-1',
          imageAddonCount: 1,
          highlightCount: 2,
        },
        returnvalue: {
          type: 'manual-post-visual-analysis',
          postId: 'post-1',
          imageAddonIds: ['addon-1'],
          analysis: {
            summary: 'Updated hero',
            highlights: ['Updated hero', 'New CTA'],
          },
          savedPost: {
            id: 'post-1',
            visualSummary: 'Updated hero',
          },
        },
      })
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/kangur/social-pipeline/jobs?id=job-1', {
        method: 'GET',
      }),
      createContext({ id: 'job-1' })
    );

    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        data: {
          type: 'manual-post-visual-analysis',
          input: {
            postId: 'post-1',
            imageAddonCount: 1,
          },
        },
        result: {
          type: 'manual-post-visual-analysis',
          postId: 'post-1',
          imageAddonCount: 1,
          highlightCount: 2,
          analysis: {
            summary: 'Updated hero',
            highlights: ['Updated hero', 'New CTA'],
          },
          savedPost: {
            id: 'post-1',
            visualSummary: 'Updated hero',
          },
        },
      })
    );
  });
});
