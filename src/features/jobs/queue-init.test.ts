import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isRedisAvailable: vi.fn(() => true),
  isRedisReachable: vi.fn(async () => true),
  logSystemEvent: vi.fn(async () => undefined),
  captureException: vi.fn(async () => undefined),
  startAllWorkers: vi.fn(),
  startAgentQueue: vi.fn(),
  startAiInsightsQueue: vi.fn(),
  startAiPathRunQueue: vi.fn(),
  startCaseResolverOcrQueue: vi.fn(),
  startChatbotJobQueue: vi.fn(),
  startDatabaseBackupSchedulerQueue: vi.fn(),
  startFilemakerEmailCampaignSchedulerQueue: vi.fn(),
  startImageStudioRunQueue: vi.fn(),
  startImageStudioSequenceQueue: vi.fn(),
  startKangurSocialPipelineQueue: vi.fn(),
  startKangurSocialSchedulerQueue: vi.fn(),
  startPlaywrightListingQueue: vi.fn(),
  startProductAiJobQueue: vi.fn(),
  startProductSyncSchedulerQueue: vi.fn(),
  startSystemLogAlertsQueue: vi.fn(),
  startTraderaListingQueue: vi.fn(),
  startTraderaRelistSchedulerQueue: vi.fn(),
  startVintedListingQueue: vi.fn(),
  tickDatabaseBackupScheduler: vi.fn(async () => undefined),
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
}));

vi.mock('@/server/queues/integrations', () => ({
  startPlaywrightListingQueue: mocks.startPlaywrightListingQueue,
  startTraderaListingQueue: mocks.startTraderaListingQueue,
  startVintedListingQueue: mocks.startVintedListingQueue,
}));

vi.mock('@/features/integrations/workers/traderaRelistSchedulerQueue', () => ({
  startTraderaRelistSchedulerQueue: mocks.startTraderaRelistSchedulerQueue,
}));

vi.mock('@/server/queues/kangur', () => ({
  startKangurSocialPipelineQueue: mocks.startKangurSocialPipelineQueue,
  startKangurSocialSchedulerQueue: mocks.startKangurSocialSchedulerQueue,
}));

vi.mock('@/server/queues/product-ai', () => ({
  startProductAiJobQueue: mocks.startProductAiJobQueue,
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
  startAllWorkers: mocks.startAllWorkers,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

import { initializeQueues, shouldStartKangurSocialQueues, testOnly } from './queue-init';

const waitForStartup = async (): Promise<void> => {
  await vi.waitFor(() => expect(mocks.startTraderaListingQueue).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  testOnly.resetInitialized();
  delete process.env['DISABLE_QUEUE_WORKERS'];
  delete process.env['DISABLE_KANGUR_SOCIAL_WORKERS'];
  delete process.env['ENABLE_KANGUR_SOCIAL_WORKERS'];
  mocks.isRedisAvailable.mockReturnValue(true);
  mocks.isRedisReachable.mockResolvedValue(true);
});

describe('shouldStartKangurSocialQueues', () => {
  it('defaults to disabled outside production', () => {
    expect(
      shouldStartKangurSocialQueues({
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it('defaults to enabled in production', () => {
    expect(
      shouldStartKangurSocialQueues({
        NODE_ENV: 'production',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it('honors explicit enable outside production', () => {
    expect(
      shouldStartKangurSocialQueues({
        NODE_ENV: 'development',
        ENABLE_KANGUR_SOCIAL_WORKERS: 'true',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it('honors explicit disable even in production', () => {
    expect(
      shouldStartKangurSocialQueues({
        NODE_ENV: 'production',
        DISABLE_KANGUR_SOCIAL_WORKERS: 'true',
      } as NodeJS.ProcessEnv)
    ).toBe(false);
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
    expect(mocks.startAllWorkers).toHaveBeenCalledTimes(1);
  });
});
