import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  cleanMock,
  createManagedQueueMock,
  enqueueMock,
  getMock,
  getHealthStatusMock,
  getRedisConnectionMock,
  getQueueMock,
  logInfoMock,
  runSocialPublishingPostGenerationJobMock,
  runSocialPublishingPostPipelineMock,
  runSocialPublishingPostVisualAnalysisJobMock,
  setMock,
  startWorkerMock,
  updateSocialPublishingPostMock,
} = vi.hoisted(() => ({
  cleanMock: vi.fn(),
  createManagedQueueMock: vi.fn(),
  enqueueMock: vi.fn(),
  getMock: vi.fn(),
  getHealthStatusMock: vi.fn(),
  getRedisConnectionMock: vi.fn(),
  getQueueMock: vi.fn(),
  logInfoMock: vi.fn(),
  runSocialPublishingPostGenerationJobMock: vi.fn(),
  runSocialPublishingPostPipelineMock: vi.fn(),
  runSocialPublishingPostVisualAnalysisJobMock: vi.fn(),
  setMock: vi.fn(),
  startWorkerMock: vi.fn(),
  updateSocialPublishingPostMock: vi.fn(),
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: createManagedQueueMock,
  getRedisConnection: (...args: unknown[]) => getRedisConnectionMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logInfo: (...args: unknown[]) => logInfoMock(...args),
    captureException: vi.fn(),
  },
}));

vi.mock('@/features/filemaker/social/server/social-image-addons-batch', () => ({
  createSocialPublishingImageAddonsBatch: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-posts-pipeline', () => ({
  runSocialPublishingPostPipeline: (...args: unknown[]) =>
    runSocialPublishingPostPipelineMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-posts-runtime', () => ({
  runSocialPublishingPostVisualAnalysisJob: (...args: unknown[]) =>
    runSocialPublishingPostVisualAnalysisJobMock(...args),
  runSocialPublishingPostGenerationJob: (...args: unknown[]) =>
    runSocialPublishingPostGenerationJobMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-posts-repository', () => ({
  updateSocialPublishingPost: (...args: unknown[]) => updateSocialPublishingPostMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: vi.fn(),
}));

vi.mock('@/features/filemaker/social/settings', () => ({
  SOCIAL_PUBLISHING_SETTINGS_KEY: 'social_publishing_settings_v1',
  parseSocialPublishingSettings: vi.fn(),
}));

const createQueueMock = () => ({
  startWorker: startWorkerMock,
  stopWorker: vi.fn(),
  enqueue: enqueueMock,
  getQueue: getQueueMock,
  getHealthStatus: getHealthStatusMock,
  processInline: vi.fn(),
});

describe('socialPublishingPipelineQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete (
      globalThis as typeof globalThis & {
        __socialPublishingPipelineQueueState__?: unknown;
      }
    ).__socialPublishingPipelineQueueState__;
    createManagedQueueMock.mockReturnValue(createQueueMock());
    enqueueMock.mockResolvedValue('job-1');
    getRedisConnectionMock.mockReturnValue({
      set: setMock,
      get: getMock,
    });
    setMock.mockResolvedValue('OK');
    getMock.mockResolvedValue(null);
    getHealthStatusMock.mockResolvedValue({
      running: false,
      healthy: false,
      processing: true,
      activeCount: 1,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });
    getQueueMock.mockReturnValue({
      clean: cleanMock,
    });
    cleanMock.mockResolvedValue(['stale-job-1']);
    updateSocialPublishingPostMock.mockResolvedValue({ id: 'post-1' });
  });

  it('cleans stale active jobs when the worker is offline', async () => {
    const { recoverSocialPublishingPipelineQueue } = await import('./socialPublishingPipelineQueue');

    await expect(recoverSocialPublishingPipelineQueue()).resolves.toEqual(['stale-job-1']);
    expect(cleanMock).toHaveBeenCalledWith(0, 20, 'active');
    expect(logInfoMock).toHaveBeenCalledWith(
      'Recovered stale social publishing pipeline active jobs',
      expect.objectContaining({
        action: 'recoverStaleActiveJobs',
        removedJobIds: ['stale-job-1'],
      })
    );
  });

  it('does not clean active jobs when the worker is already running', async () => {
    getHealthStatusMock.mockResolvedValue({
      running: true,
      healthy: true,
      processing: true,
      activeCount: 1,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 0,
      lastPollTime: Date.now(),
      timeSinceLastPoll: 1000,
    });

    const { recoverSocialPublishingPipelineQueue } = await import('./socialPublishingPipelineQueue');

    await expect(recoverSocialPublishingPipelineQueue()).resolves.toEqual([]);
    expect(cleanMock).not.toHaveBeenCalled();
  });

  it('delegates manual post pipeline jobs to the server-side pipeline runner', async () => {
    const manualResult = {
      type: 'manual-post-pipeline' as const,
      postId: 'post-1',
      captureMode: 'existing_assets' as const,
      addonsCreated: 2,
      failures: 0,
      runId: 'run-1',
      contextSummary: 'summary',
      contextDocCount: 1,
      imageAddonIds: ['addon-1'],
      imageAssets: [],
      batchCaptureResult: {
        addons: [],
        failures: [],
        runId: 'run-1',
      },
      savedPost: { id: 'post-1' },
      generatedPost: { id: 'post-1', titlePl: 'Generated' },
    };
    runSocialPublishingPostPipelineMock.mockResolvedValue(manualResult);

    await import('./socialPublishingPipelineQueue');

    const config = createManagedQueueMock.mock.calls.at(-1)?.[0];
    expect(config).toBeTruthy();

    const result = await config.processor(
      {
        type: 'manual-post-pipeline',
        input: {
          postId: 'post-1',
          captureMode: 'existing_assets',
        },
      },
      'job-1',
      undefined,
      {
        updateProgress: vi.fn(),
      }
    );

    expect(runSocialPublishingPostPipelineMock).toHaveBeenCalledWith(
      {
        postId: 'post-1',
        captureMode: 'existing_assets',
      },
      expect.objectContaining({
        reportProgress: expect.any(Function),
      })
    );
    expect(result).toEqual(manualResult);
  });

  it('writes a shared worker heartbeat when the queue worker starts', async () => {
    vi.useFakeTimers();
    const { startSocialPublishingPipelineQueue } = await import('./socialPublishingPipelineQueue');

    startSocialPublishingPipelineQueue();
    await Promise.resolve();

    expect(startWorkerMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(
      'social-publishing-pipeline:worker-heartbeat',
      expect.any(String),
      'EX',
      120
    );
  });

  it('reads the shared worker heartbeat timestamp from redis', async () => {
    const heartbeatAt = Date.now() - 1_000;
    getMock.mockResolvedValueOnce(JSON.stringify({ heartbeatAt, pid: 123 }));

    const { getSocialPublishingPipelineWorkerHeartbeat } = await import(
      './socialPublishingPipelineQueue'
    );

    await expect(getSocialPublishingPipelineWorkerHeartbeat()).resolves.toBe(heartbeatAt);
  });

  it('delegates manual visual analysis jobs to the server runtime helper', async () => {
    runSocialPublishingPostVisualAnalysisJobMock.mockResolvedValue({
      type: 'manual-post-visual-analysis',
      postId: 'post-1',
      imageAddonIds: ['addon-1'],
      visionModelId: 'vision-1',
      analysis: {
        summary: 'Updated classroom card',
        highlights: ['Updated classroom card'],
      },
      savedPost: { id: 'post-1' },
    });

    await import('./socialPublishingPipelineQueue');
    const config = createManagedQueueMock.mock.calls.at(-1)?.[0];
    const updateProgressMock = vi.fn();

    const result = await config.processor(
      {
        type: 'manual-post-visual-analysis',
        input: {
          postId: 'post-1',
          imageAddonIds: ['addon-1'],
          visionModelId: 'vision-1',
          actorId: 'admin-1',
        },
      },
      'job-analysis-1',
      undefined,
      {
        updateProgress: updateProgressMock,
      }
    );

    expect(runSocialPublishingPostVisualAnalysisJobMock).toHaveBeenCalledWith({
      postId: 'post-1',
      imageAddonIds: ['addon-1'],
      visionModelId: 'vision-1',
      actorId: 'admin-1',
      jobId: 'job-analysis-1',
    });
    expect(updateSocialPublishingPostMock).toHaveBeenCalledWith('post-1', {
      visualAnalysisStatus: 'running',
      visualAnalysisJobId: 'job-analysis-1',
      visualAnalysisModelId: 'vision-1',
      visualAnalysisError: null,
      updatedBy: 'admin-1',
    });
    expect(updateProgressMock).toHaveBeenCalled();
    expect(result.type).toBe('manual-post-visual-analysis');
  });

  it('delegates manual post generation jobs to the server runtime helper', async () => {
    runSocialPublishingPostGenerationJobMock.mockResolvedValue({
      type: 'manual-post-generation',
      postId: 'post-1',
      imageAddonIds: ['addon-1'],
      docReferences: ['overview'],
      brainModelId: 'brain-1',
      visionModelId: 'vision-1',
      generatedPost: { id: 'post-1', titlePl: 'Generated' },
      draft: null,
    });

    await import('./socialPublishingPipelineQueue');
    const config = createManagedQueueMock.mock.calls.at(-1)?.[0];
    const updateProgressMock = vi.fn();

    const result = await config.processor(
      {
        type: 'manual-post-generation',
        input: {
          postId: 'post-1',
          imageAddonIds: ['addon-1'],
          docReferences: ['overview'],
          modelId: 'brain-1',
          visionModelId: 'vision-1',
          actorId: 'admin-1',
          projectUrl: 'https://studiq.example.com/project',
        },
      },
      'job-generate-1',
      undefined,
      {
        updateProgress: updateProgressMock,
      }
    );

    expect(runSocialPublishingPostGenerationJobMock).toHaveBeenCalledWith({
      postId: 'post-1',
      imageAddonIds: ['addon-1'],
      docReferences: ['overview'],
      modelId: 'brain-1',
      visionModelId: 'vision-1',
      actorId: 'admin-1',
      projectUrl: 'https://studiq.example.com/project',
    });
    expect(updateProgressMock).toHaveBeenCalled();
    expect(result.type).toBe('manual-post-generation');
  });

  it('forwards prefetched visual analysis through manual post generation jobs', async () => {
    runSocialPublishingPostGenerationJobMock.mockResolvedValue({
      type: 'manual-post-generation',
      postId: 'post-1',
      imageAddonIds: ['addon-1'],
      docReferences: ['overview'],
      brainModelId: 'brain-1',
      visionModelId: 'vision-1',
      generatedPost: { id: 'post-1', titlePl: 'Generated from visuals' },
      draft: null,
    });

    await import('./socialPublishingPipelineQueue');
    const config = createManagedQueueMock.mock.calls.at(-1)?.[0];

    await config.processor(
      {
        type: 'manual-post-generation',
        input: {
          postId: 'post-1',
          imageAddonIds: ['addon-1'],
          docReferences: ['overview'],
          modelId: 'brain-1',
          visionModelId: 'vision-1',
          actorId: 'admin-1',
          projectUrl: 'https://studiq.example.com/project',
          prefetchedVisualAnalysis: {
            summary: 'The hero now shows a larger classroom card.',
            highlights: ['Larger classroom card'],
          },
          requireVisualAnalysisInBody: true,
        },
      },
      'job-generate-visual-1',
      undefined,
      {
        updateProgress: vi.fn(),
      }
    );

    expect(runSocialPublishingPostGenerationJobMock).toHaveBeenCalledWith({
      postId: 'post-1',
      imageAddonIds: ['addon-1'],
      docReferences: ['overview'],
      modelId: 'brain-1',
      visionModelId: 'vision-1',
      actorId: 'admin-1',
      projectUrl: 'https://studiq.example.com/project',
      prefetchedVisualAnalysis: {
        summary: 'The hero now shows a larger classroom card.',
        highlights: ['Larger classroom card'],
      },
      requireVisualAnalysisInBody: true,
    });
  });

  it('marks visual analysis as failed on the post when the runtime helper throws', async () => {
    runSocialPublishingPostVisualAnalysisJobMock.mockRejectedValue(
      new Error('Vision runtime failed')
    );

    await import('./socialPublishingPipelineQueue');
    const config = createManagedQueueMock.mock.calls.at(-1)?.[0];

    await expect(
      config.processor(
        {
          type: 'manual-post-visual-analysis',
          input: {
            postId: 'post-1',
            imageAddonIds: ['addon-1'],
            visionModelId: 'vision-1',
            actorId: 'admin-1',
          },
        },
        'job-analysis-failed-1',
        undefined,
        {
          updateProgress: vi.fn(),
        }
      )
    ).rejects.toThrow('Vision runtime failed');

    expect(updateSocialPublishingPostMock).toHaveBeenNthCalledWith(1, 'post-1', {
      visualAnalysisStatus: 'running',
      visualAnalysisJobId: 'job-analysis-failed-1',
      visualAnalysisModelId: 'vision-1',
      visualAnalysisError: null,
      updatedBy: 'admin-1',
    });
    expect(updateSocialPublishingPostMock).toHaveBeenNthCalledWith(2, 'post-1', {
      visualAnalysisStatus: 'failed',
      visualAnalysisJobId: 'job-analysis-failed-1',
      visualAnalysisModelId: 'vision-1',
      visualAnalysisError: 'Vision runtime failed',
      updatedBy: 'admin-1',
    });
  });
});
