import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  cleanMock,
  createManagedQueueMock,
  enqueueMock,
  getHealthStatusMock,
  getQueueMock,
  logInfoMock,
  runKangurSocialPostPipelineMock,
  startWorkerMock,
} = vi.hoisted(() => ({
  cleanMock: vi.fn(),
  createManagedQueueMock: vi.fn(),
  enqueueMock: vi.fn(),
  getHealthStatusMock: vi.fn(),
  getQueueMock: vi.fn(),
  logInfoMock: vi.fn(),
  runKangurSocialPostPipelineMock: vi.fn(),
  startWorkerMock: vi.fn(),
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: createManagedQueueMock,
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
    createManagedQueueMock.mockReturnValue(createQueueMock());
    enqueueMock.mockResolvedValue('job-1');
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
      docUpdates: null,
    };
    runKangurSocialPostPipelineMock.mockResolvedValue(manualResult);

    await import('./kangurSocialPipelineQueue');

    const config = createManagedQueueMock.mock.calls[0]?.[0];
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
});
