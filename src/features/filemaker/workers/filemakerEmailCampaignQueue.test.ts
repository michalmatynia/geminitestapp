import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createManagedQueue: vi.fn(),
  isRedisAvailable: vi.fn(() => true),
  enqueue: vi.fn(),
  processInline: vi.fn(),
  startWorker: vi.fn(),
  stopWorker: vi.fn(),
  processFilemakerEmailCampaignRun: vi.fn(),
  captureException: vi.fn(async () => undefined),
  logInfo: vi.fn(async () => undefined),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: mocks.createManagedQueue,
  isRedisAvailable: mocks.isRedisAvailable,
}));
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
    logInfo: mocks.logInfo,
  },
}));
vi.mock('../server/campaign-runtime', () => ({
  processFilemakerEmailCampaignRun: mocks.processFilemakerEmailCampaignRun,
}));

const loadModule = async () => import('./filemakerEmailCampaignQueue');

type ProcessResultOverrides = {
  retryableDeliveryCount?: number;
  retryExhaustedCount?: number;
  suggestedRetryDelayMs?: number | null;
};

const resolveOverride = <T,>(
  overrides: ProcessResultOverrides | undefined,
  key: keyof ProcessResultOverrides,
  fallback: T
): T =>
  overrides !== undefined && Object.prototype.hasOwnProperty.call(overrides, key)
    ? (overrides[key] as T)
    : fallback;

const buildProcessResult = (overrides?: ProcessResultOverrides) => ({
  run: { status: 'queued' },
  progress: {
    totalCount: 3,
    processedCount: 2,
    queuedCount: 1,
    sentCount: 1,
    failedCount: 1,
    skippedCount: 0,
    bouncedCount: 0,
  },
  retryableDeliveryCount: resolveOverride(overrides, 'retryableDeliveryCount', 1),
  retryExhaustedCount: resolveOverride(overrides, 'retryExhaustedCount', 0),
  suggestedRetryDelayMs: resolveOverride(overrides, 'suggestedRetryDelayMs', 60_000),
});

describe('filemakerEmailCampaignQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.isRedisAvailable.mockReturnValue(true);
    mocks.enqueue.mockResolvedValue('job-1');
    mocks.processInline.mockResolvedValue(undefined);
    mocks.createManagedQueue.mockReturnValue({
      enqueue: mocks.enqueue,
      processInline: mocks.processInline,
      startWorker: mocks.startWorker,
      stopWorker: mocks.stopWorker,
    });
    mocks.processFilemakerEmailCampaignRun.mockResolvedValue(buildProcessResult());
  });

  it('returns retry metadata from the queue processor', async () => {
    await loadModule();
    const queueConfig = mocks.createManagedQueue.mock.calls[0]?.[0] as {
      processor: (
        data: { campaignId: string; runId: string; reason: 'launch' | 'manual' | 'retry' },
        jobId: string,
        signal?: AbortSignal,
        context?: { updateProgress: (progress: unknown) => Promise<void> }
      ) => Promise<unknown>;
    };
    const updateProgress = vi.fn(async () => undefined);

    const result = await queueConfig.processor(
      {
        campaignId: 'campaign-1',
        runId: 'run-1',
        reason: 'manual',
      },
      'job-1',
      undefined,
      { updateProgress }
    );

    expect(mocks.processFilemakerEmailCampaignRun).toHaveBeenCalledWith({
      runId: 'run-1',
      reason: 'manual',
    });
    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCount: 3,
        processedCount: 2,
        failedCount: 1,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        campaignId: 'campaign-1',
        runId: 'run-1',
        retryableDeliveryCount: 1,
        retryExhaustedCount: 0,
        suggestedRetryDelayMs: 60_000,
      })
    );
  });

  it('schedules an automatic retry using the runtime suggested delay', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_777);
    await loadModule();
    const queueConfig = mocks.createManagedQueue.mock.calls[0]?.[0] as {
      processor: (
        data: { campaignId: string; runId: string; reason: 'launch' | 'manual' | 'retry' },
        jobId: string
      ) => Promise<unknown>;
      onCompleted: (
        jobId: string,
        result: unknown,
        data: { campaignId: string; runId: string; reason: 'launch' | 'manual' | 'retry' }
      ) => Promise<void>;
    };
    const data = {
      campaignId: 'campaign-1',
      runId: 'run-1',
      reason: 'manual' as const,
    };

    const result = await queueConfig.processor(data, 'job-1');
    await queueConfig.onCompleted('job-1', result, data);

    expect(mocks.enqueue).toHaveBeenCalledWith(
      {
        campaignId: 'campaign-1',
        runId: 'run-1',
        reason: 'retry',
      },
      {
        delay: 60_000,
        jobId: 'retry__run-1__1777',
      }
    );
  });

  it('does not schedule an automatic retry when no retry delay is available', async () => {
    mocks.processFilemakerEmailCampaignRun.mockResolvedValue(
      buildProcessResult({
        retryableDeliveryCount: 1,
        suggestedRetryDelayMs: null,
      })
    );
    await loadModule();
    const queueConfig = mocks.createManagedQueue.mock.calls[0]?.[0] as {
      processor: (
        data: { campaignId: string; runId: string; reason: 'launch' | 'manual' | 'retry' },
        jobId: string
      ) => Promise<unknown>;
      onCompleted: (
        jobId: string,
        result: unknown,
        data: { campaignId: string; runId: string; reason: 'launch' | 'manual' | 'retry' }
      ) => Promise<void>;
    };
    const data = {
      campaignId: 'campaign-1',
      runId: 'run-1',
      reason: 'manual' as const,
    };

    const result = await queueConfig.processor(data, 'job-1');
    await queueConfig.onCompleted('job-1', result, data);

    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
