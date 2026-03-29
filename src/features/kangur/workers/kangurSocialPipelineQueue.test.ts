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
  runKangurSocialPostGenerationJobMock,
  runKangurSocialPostPipelineMock,
  runKangurSocialPostVisualAnalysisJobMock,
  setMock,
  startWorkerMock,
  updateKangurSocialPostMock,
} = vi.hoisted(() => ({
  cleanMock: vi.fn(),
  createManagedQueueMock: vi.fn(),
  enqueueMock: vi.fn(),
  getMock: vi.fn(),
  getHealthStatusMock: vi.fn(),
  getRedisConnectionMock: vi.fn(),
  getQueueMock: vi.fn(),
  logInfoMock: vi.fn(),
  runKangurSocialPostGenerationJobMock: vi.fn(),
  runKangurSocialPostPipelineMock: vi.fn(),
  runKangurSocialPostVisualAnalysisJobMock: vi.fn(),
  setMock: vi.fn(),
  startWorkerMock: vi.fn(),
  updateKangurSocialPostMock: vi.fn(),
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

vi.mock('@/features/kangur/server/social-image-addons-batch', () => ({
  createKangurSocialImageAddonsBatch: vi.fn(),
}));

vi.mock('@/features/kangur/server/social-posts-pipeline', () => ({
  runKangurSocialPostPipeline: (...args: unknown[]) =>
    runKangurSocialPostPipelineMock(...args),
}));

vi.mock('@/features/kangur/server/social-posts-runtime', () => ({
  runKangurSocialPostVisualAnalysisJob: (...args: unknown[]) =>
    runKangurSocialPostVisualAnalysisJobMock(...args),
  runKangurSocialPostGenerationJob: (...args: unknown[]) =>
    runKangurSocialPostGenerationJobMock(...args),
}));

vi.mock('@/features/kangur/server/social-posts-repository', () => ({
  updateKangurSocialPost: (...args: unknown[]) => updateKangurSocialPostMock(...args),
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  readKangurSettingValue: vi.fn(),
}));

vi.mock('@/features/kangur/settings-social', () => ({
  KANGUR_SOCIAL_SETTINGS_KEY: 'kangur_social_settings_v1',
  parseKangurSocialSettings: vi.fn(),
}));

const createQueueMock = () => ({
  startWorker: startWorkerMock,
  stopWorker: vi.fn(),
  enqueue: enqueueMock,
  getQueue: getQueueMock,
  getHealthStatus: getHealthStatusMock,
  processInline: vi.fn(),
});

describe('kangurSocialPipelineQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete (
      globalThis as typeof globalThis & {
        __kangurSocialPipelineQueueState__?: unknown;
      }
    ).__kangurSocialPipelineQueueState__;
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
    updateKangurSocialPostMock.mockResolvedValue({ id: 'post-1' });
  });

  it('cleans stale active jobs when the worker is offline', async () => {
    const { recoverKangurSocialPipelineQueue } = await import('./kangurSocialPipelineQueue');

    await expect(recoverKangurSocialPipelineQueue()).resolves.toEqual(['stale-job-1']);
    expect(cleanMock).toHaveBeenCalledWith(0, 20, 'active');
    expect(logInfoMock).toHaveBeenCalledWith(
      'Recovered stale Kangur social pipeline active jobs',
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

    const { recoverKangurSocialPipelineQueue } = await import('./kangurSocialPipelineQueue');

    await expect(recoverKangurSocialPipelineQueue()).resolves.toEqual([]);
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
    runKangurSocialPostPipelineMock.mockResolvedValue(manualResult);

    await import('./kangurSocialPipelineQueue');

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

    expect(runKangurSocialPostPipelineMock).toHaveBeenCalledWith(
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
    const { startKangurSocialPipelineQueue } = await import('./kangurSocialPipelineQueue');

    startKangurSocialPipelineQueue();
    await Promise.resolve();

    expect(startWorkerMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(
      'kangur-social-pipeline:worker-heartbeat',
      expect.any(String),
      'EX',
      120
    );
  });

  it('reads the shared worker heartbeat timestamp from redis', async () => {
    const heartbeatAt = Date.now() - 1_000;
    getMock.mockResolvedValueOnce(JSON.stringify({ heartbeatAt, pid: 123 }));

    const { getKangurSocialPipelineWorkerHeartbeat } = await import(
      './kangurSocialPipelineQueue'
    );

    await expect(getKangurSocialPipelineWorkerHeartbeat()).resolves.toBe(heartbeatAt);
  });

  it('delegates manual visual analysis jobs to the server runtime helper', async () => {
    runKangurSocialPostVisualAnalysisJobMock.mockResolvedValue({
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

    await import('./kangurSocialPipelineQueue');
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

    expect(runKangurSocialPostVisualAnalysisJobMock).toHaveBeenCalledWith({
      postId: 'post-1',
      imageAddonIds: ['addon-1'],
      visionModelId: 'vision-1',
      actorId: 'admin-1',
      jobId: 'job-analysis-1',
    });
    expect(updateKangurSocialPostMock).toHaveBeenCalledWith('post-1', {
      visualAnalysisStatus: 'running',
      visualAnalysisJobId: 'job-analysis-1',
      visualAnalysisModelId: 'vision-1',
      updatedBy: 'admin-1',
    });
    expect(updateProgressMock).toHaveBeenCalled();
    expect(result.type).toBe('manual-post-visual-analysis');
  });

  it('delegates manual post generation jobs to the server runtime helper', async () => {
    runKangurSocialPostGenerationJobMock.mockResolvedValue({
      type: 'manual-post-generation',
      postId: 'post-1',
      imageAddonIds: ['addon-1'],
      docReferences: ['overview'],
      brainModelId: 'brain-1',
      visionModelId: 'vision-1',
      generatedPost: { id: 'post-1', titlePl: 'Generated' },
      draft: null,
    });

    await import('./kangurSocialPipelineQueue');
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

    expect(runKangurSocialPostGenerationJobMock).toHaveBeenCalledWith({
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

  it('marks visual analysis as failed on the post when the runtime helper throws', async () => {
    runKangurSocialPostVisualAnalysisJobMock.mockRejectedValue(
      new Error('Vision runtime failed')
    );

    await import('./kangurSocialPipelineQueue');
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

    expect(updateKangurSocialPostMock).toHaveBeenNthCalledWith(1, 'post-1', {
      visualAnalysisStatus: 'running',
      visualAnalysisJobId: 'job-analysis-failed-1',
      visualAnalysisModelId: 'vision-1',
      updatedBy: 'admin-1',
    });
    expect(updateKangurSocialPostMock).toHaveBeenNthCalledWith(2, 'post-1', {
      visualAnalysisStatus: 'failed',
      visualAnalysisJobId: 'job-analysis-failed-1',
      visualAnalysisModelId: 'vision-1',
      updatedBy: 'admin-1',
    });
  });
});
