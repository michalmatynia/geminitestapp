import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isRedisAvailable: vi.fn(() => true),
  isRedisReachable: vi.fn(() => Promise.resolve(true)),
  logSystemEvent: vi.fn(() => Promise.resolve(undefined)),
  captureException: vi.fn(() => Promise.resolve(undefined)),
  startAllWorkers: vi.fn(),
  startAgentQueue: vi.fn(),
  startAiInsightsQueue: vi.fn(),
  startAiPathRunQueue: vi.fn(),
  startCaseResolverOcrQueue: vi.fn(),
  startChatbotJobQueue: vi.fn(),
  startDatabaseBackupSchedulerQueue: vi.fn(),
  startFilemakerEmailCampaignSchedulerQueue: vi.fn(),
  startFilemakerCampaignColdPruneSchedulerQueue: vi.fn(),
  startFilemakerJobBoardScrapeQueue: vi.fn(),
  startFilemakerMailIdleManager: vi.fn(),
  startFilemakerMailSyncSchedulerQueue: vi.fn(),
  startImageStudioRunQueue: vi.fn(),
  startImageStudioSequenceQueue: vi.fn(),
  startFilemakerSocialPipelineQueue: vi.fn(),
  startFilemakerSocialSchedulerQueue: vi.fn(),
  startPlaywrightListingQueue: vi.fn(),
  startProductAiJobQueue: vi.fn(),
  startProductFastCometImageUploadQueue: vi.fn(),
  startProductMarketplaceCopyDebrandBatchQueue: vi.fn(),
  startProductScrapeProfileQueue: vi.fn(),
  startProductSyncSchedulerQueue: vi.fn(),
  startSystemLogAlertsQueue: vi.fn(),
  startTraderaListingQueue: vi.fn(),
  startTraderaRelistSchedulerQueue: vi.fn(),
  startVintedListingQueue: vi.fn(),
  tickDatabaseBackupScheduler: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock('@/server/queues/ai', () => ({
  startAgentQueue: mocks.startAgentQueue,
  startAiInsightsQueue: mocks.startAiInsightsQueue,
  startAiPathRunQueue: mocks.startAiPathRunQueue,
  startChatbotJobQueue: mocks.startChatbotJobQueue,
  startImageStudioRunQueue: mocks.startImageStudioRunQueue,
  startImageStudioSequenceQueue: mocks.startImageStudioSequenceQueue,
}));

vi.mock('@/server/queues/case-resolver-ocr', () => ({
  startCaseResolverOcrQueue: mocks.startCaseResolverOcrQueue,
}));

vi.mock('@/server/queues/filemaker', () => ({
  startFilemakerEmailCampaignSchedulerQueue:
    mocks.startFilemakerEmailCampaignSchedulerQueue,
  startFilemakerSocialPipelineQueue: mocks.startFilemakerSocialPipelineQueue,
  startFilemakerSocialSchedulerQueue: mocks.startFilemakerSocialSchedulerQueue,
}));

vi.mock('@/features/filemaker/workers/filemakerMailSyncSchedulerQueue', () => ({
  startFilemakerMailSyncSchedulerQueue: mocks.startFilemakerMailSyncSchedulerQueue,
}));

vi.mock('@/features/filemaker/workers/filemakerMailIdleManager', () => ({
  startFilemakerMailIdleManager: mocks.startFilemakerMailIdleManager,
}));

vi.mock('@/features/filemaker/workers/filemakerCampaignColdPruneSchedulerQueue', () => ({
  startFilemakerCampaignColdPruneSchedulerQueue:
    mocks.startFilemakerCampaignColdPruneSchedulerQueue,
}));

vi.mock('@/features/filemaker/server/filemaker-job-board-scrape-runtime', () => ({
  startFilemakerJobBoardScrapeQueue: mocks.startFilemakerJobBoardScrapeQueue,
}));

vi.mock('@/server/queues/integrations', () => ({
  startPlaywrightListingQueue: mocks.startPlaywrightListingQueue,
  startTraderaListingQueue: mocks.startTraderaListingQueue,
  startVintedListingQueue: mocks.startVintedListingQueue,
}));

vi.mock('@/features/integrations/workers/traderaRelistSchedulerQueue', () => ({
  startTraderaRelistSchedulerQueue: mocks.startTraderaRelistSchedulerQueue,
}));

vi.mock('@/server/queues/product-ai', () => ({
  startProductAiJobQueue: mocks.startProductAiJobQueue,
}));

vi.mock('@/server/queues/products', () => ({
  startProductFastCometImageUploadQueue:
    mocks.startProductFastCometImageUploadQueue,
  startProductMarketplaceCopyDebrandBatchQueue:
    mocks.startProductMarketplaceCopyDebrandBatchQueue,
}));

vi.mock('@/features/products/workers/productScrapeProfileQueue', () => ({
  startProductScrapeProfileQueue: mocks.startProductScrapeProfileQueue,
}));

vi.mock('@/server/queues/product-sync', () => ({
  startProductSyncSchedulerQueue: mocks.startProductSyncSchedulerQueue,
}));

vi.mock('@/shared/lib/db/workers/databaseBackupSchedulerQueue', () => ({
  startDatabaseBackupSchedulerQueue: mocks.startDatabaseBackupSchedulerQueue,
}));

vi.mock('@/shared/lib/db/services/database-backup-scheduler', () => ({
  tickDatabaseBackupScheduler: mocks.tickDatabaseBackupScheduler,
}));

vi.mock('@/shared/lib/observability/workers/systemLogAlertsQueue', () => ({
  startSystemLogAlertsQueue: mocks.startSystemLogAlertsQueue,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: mocks.logSystemEvent,
}));

vi.mock('@/shared/lib/queue/redis-connection', () => ({
  isRedisAvailable: mocks.isRedisAvailable,
  isRedisReachable: mocks.isRedisReachable,
}));

vi.mock('@/shared/lib/queue/registry', () => ({
  registerQueue: vi.fn(),
  startAllWorkers: mocks.startAllWorkers,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

import { initializeQueues, shouldStartSocialPublishingQueues, testOnly } from './queue-init';

const waitForStartup = async (): Promise<void> => {
  await vi.waitFor(() => expect(mocks.startTraderaListingQueue).toHaveBeenCalled());
  await vi.waitFor(() => expect(mocks.startProductScrapeProfileQueue).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  testOnly.resetInitialized();
  delete process.env['DISABLE_QUEUE_WORKERS'];
  delete process.env['DISABLE_SOCIAL_PUBLISHING_WORKERS'];
  delete process.env['ENABLE_SOCIAL_PUBLISHING_WORKERS'];
  mocks.isRedisAvailable.mockReturnValue(true);
  mocks.isRedisReachable.mockResolvedValue(true);
});

describe('shouldStartSocialPublishingQueues', () => {
  it('defaults to disabled outside production', () => {
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: 'development',
    };
    expect(shouldStartSocialPublishingQueues(env)).toBe(false);
  });

  it('defaults to enabled in production', () => {
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: 'production',
    };
    expect(shouldStartSocialPublishingQueues(env)).toBe(true);
  });

  it('honors explicit enable outside production', () => {
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: 'development',
      ENABLE_SOCIAL_PUBLISHING_WORKERS: 'true',
    };
    expect(shouldStartSocialPublishingQueues(env)).toBe(true);
  });

  it('honors explicit disable even in production', () => {
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: 'production',
      DISABLE_SOCIAL_PUBLISHING_WORKERS: 'true',
    };
    expect(shouldStartSocialPublishingQueues(env)).toBe(false);
  });
});

describe('initializeQueues', () => {
  it('retries worker startup after Redis is initially unavailable', async () => {
    mocks.isRedisAvailable.mockReturnValueOnce(false).mockReturnValue(true);

    initializeQueues();

    expect(mocks.startTraderaListingQueue).not.toHaveBeenCalled();
    expect(mocks.isRedisReachable).not.toHaveBeenCalled();

    initializeQueues();

    await waitForStartup();
    expect(mocks.startAllWorkers).toHaveBeenCalledTimes(1);
    expect(mocks.startAiInsightsQueue).not.toHaveBeenCalled();
  });

  it('retries worker startup after Redis is initially unreachable', async () => {
    mocks.isRedisReachable.mockResolvedValueOnce(false).mockResolvedValue(true);

    initializeQueues();

    await vi.waitFor(() =>
      expect(mocks.logSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Redis unreachable, skipping BullMQ workers',
        })
      )
    );
    expect(mocks.startTraderaListingQueue).not.toHaveBeenCalled();

    initializeQueues();

    await waitForStartup();
    expect(mocks.startAllWorkers).toHaveBeenCalledTimes(1);
  });

  it('does not start workers more than once after a successful startup', async () => {
    initializeQueues();

    await waitForStartup();
    initializeQueues();

    expect(mocks.startTraderaListingQueue).toHaveBeenCalledTimes(1);
    expect(mocks.startProductScrapeProfileQueue).toHaveBeenCalledTimes(1);
    expect(mocks.startAllWorkers).toHaveBeenCalledTimes(1);
  });
});
