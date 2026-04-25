import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createManagedQueue: vi.fn(),
  enqueue: vi.fn(),
  startWorker: vi.fn(),
  pruneFilemakerCampaignColdRecipients: vi.fn(),
  logSystemEvent: vi.fn(async () => undefined),
  captureException: vi.fn(async () => undefined),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: mocks.createManagedQueue,
}));
vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: mocks.logSystemEvent,
}));
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));
vi.mock('@/features/filemaker/server/campaign-engagement-pruning', () => ({
  pruneFilemakerCampaignColdRecipients: mocks.pruneFilemakerCampaignColdRecipients,
}));

const loadModule = async () => import('./filemakerCampaignColdPruneSchedulerQueue');

describe('filemakerCampaignColdPruneSchedulerQueue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env['DISABLE_FILEMAKER_CAMPAIGN_COLD_PRUNE_SCHEDULER'];
    delete (globalThis as typeof globalThis & {
      __filemakerCampaignColdPruneSchedulerQueueState__?: unknown;
    }).__filemakerCampaignColdPruneSchedulerQueueState__;
    mocks.enqueue.mockResolvedValue('scheduler-job-1');
    mocks.createManagedQueue.mockReturnValue({
      enqueue: mocks.enqueue,
      startWorker: mocks.startWorker,
    });
    mocks.pruneFilemakerCampaignColdRecipients.mockResolvedValue({
      candidates: [
        { emailAddress: 'cold@example.com', sentCount: 6, lastSentAt: null },
      ],
      addedCount: 1,
      skippedCount: 0,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('registers the scheduler exactly once across multiple start calls', async () => {
    const module = await loadModule();

    module.startFilemakerCampaignColdPruneSchedulerQueue();
    module.startFilemakerCampaignColdPruneSchedulerQueue();

    expect(mocks.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith(
      { type: 'scheduled-tick' },
      {
        repeat: { every: module.FILEMAKER_CAMPAIGN_COLD_PRUNE_REPEAT_EVERY_MS },
        jobId: 'filemaker-campaign-cold-prune-scheduler-tick',
      }
    );
  });

  it('respects the DISABLE_FILEMAKER_CAMPAIGN_COLD_PRUNE_SCHEDULER kill switch', async () => {
    process.env['DISABLE_FILEMAKER_CAMPAIGN_COLD_PRUNE_SCHEDULER'] = 'true';
    const module = await loadModule();

    module.startFilemakerCampaignColdPruneSchedulerQueue();

    expect(mocks.startWorker).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it('runs the prune action and logs when entries are added', async () => {
    await loadModule();
    const queueConfig = mocks.createManagedQueue.mock.calls[0]?.[0] as {
      processor: () => Promise<unknown>;
    };

    const result = await queueConfig.processor();

    expect(mocks.pruneFilemakerCampaignColdRecipients).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'cold-prune-scheduler' })
    );
    expect(mocks.logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        source: 'filemaker-campaign-cold-prune-scheduler',
      })
    );
    expect(result).toEqual({ candidateCount: 1, addedCount: 1, skippedCount: 0 });
  });

  it('skips logging when no addresses were added', async () => {
    mocks.pruneFilemakerCampaignColdRecipients.mockResolvedValue({
      candidates: [],
      addedCount: 0,
      skippedCount: 0,
    });
    await loadModule();
    const queueConfig = mocks.createManagedQueue.mock.calls[0]?.[0] as {
      processor: () => Promise<unknown>;
    };

    await queueConfig.processor();

    expect(mocks.logSystemEvent).not.toHaveBeenCalled();
  });
});
