import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductScrapeProfileRunResponse } from '@/shared/contracts/products/scrape-profiles';
import type { QueueConfig } from '@/shared/contracts/jobs';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  enqueue: vi.fn(),
  getJob: vi.fn(),
  getQueue: vi.fn(),
  isRedisAvailable: vi.fn(),
  isRedisReachable: vi.fn(),
  logInfo: vi.fn(),
  queueConfig: null as QueueConfig<unknown> | null,
  redisConnection: vi.fn(),
  runProductScrapeProfile: vi.fn(),
  startWorker: vi.fn(),
  stopWorker: vi.fn(),
  waitUntilFinished: vi.fn(),
}));

vi.mock('@/features/products/server/product-scrape-profiles', () => ({
  runProductScrapeProfile: (...args: unknown[]) => mocks.runProductScrapeProfile(...args),
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: (config: QueueConfig<unknown>) => {
    mocks.queueConfig = config;
    return {
      enqueue: mocks.enqueue,
      getHealthStatus: vi.fn(),
      getQueue: mocks.getQueue,
      processInline: vi.fn(),
      startWorker: mocks.startWorker,
      stopWorker: mocks.stopWorker,
    };
  },
  getRedisConnection: mocks.redisConnection,
  isRedisAvailable: mocks.isRedisAvailable,
  isRedisReachable: mocks.isRedisReachable,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
    logInfo: mocks.logInfo,
  },
}));

import { runProductScrapeProfileViaRedisRuntime } from './productScrapeProfileQueue';

const runResponse: ProductScrapeProfileRunResponse = {
  profileId: 'battlestock-warhammer-40k-30k',
  profileLabel: 'BattleStock Warhammer 40k / 30k',
  dryRun: false,
  catalog: { id: 'catalog-battle', name: 'BattleStock' },
  scrapedCount: 1,
  createdCount: 1,
  updatedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  issueCount: 0,
  products: [],
  summary: {
    rawCount: 1,
    mappedCount: 1,
    recordsWithErrors: 0,
    recordsWithWarnings: 0,
    totalIssues: 0,
  },
};

describe('productScrapeProfileQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isRedisAvailable.mockReturnValue(true);
    mocks.isRedisReachable.mockResolvedValue(true);
    mocks.redisConnection.mockReturnValue({ status: 'ready' });
    mocks.enqueue.mockImplementation(
      async (_data: unknown, options?: { jobId?: string }) => options?.jobId ?? 'job-1'
    );
    mocks.getJob.mockResolvedValue(null);
    mocks.getQueue.mockReturnValue({ getJob: mocks.getJob });
  });

  it('enqueues scrape profile runs without waiting for the Redis job result', async () => {
    const request = { profileId: 'battlestock-warhammer-40k-30k', limit: 1 };

    await expect(
      runProductScrapeProfileViaRedisRuntime(request, { userId: 'user-1' })
    ).resolves.toMatchObject({
      status: 'queued',
      profileId: 'battlestock-warhammer-40k-30k',
      dryRun: false,
      jobId: expect.stringContaining('product-scrape-profile__'),
      queueName: 'product-scrape-profile',
      run: expect.objectContaining({
        profileId: 'battlestock-warhammer-40k-30k',
        status: 'queued',
      }),
    });

    expect(mocks.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ request, userId: 'user-1' }),
      expect.objectContaining({ jobId: expect.stringContaining('product-scrape-profile__') })
    );
    expect(mocks.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.getJob).not.toHaveBeenCalled();
    expect(mocks.waitUntilFinished).not.toHaveBeenCalled();
  });

  it('processes queued jobs with the scrape profile runner', async () => {
    await mocks.queueConfig?.processor(
      {
        request: { profileId: 'battlestock-warhammer-40k-30k' },
        requestedAt: '2026-05-08T00:00:00.000Z',
        userId: 'user-1',
      },
      'job-1'
    );

    expect(mocks.runProductScrapeProfile).toHaveBeenCalledWith(
      { profileId: 'battlestock-warhammer-40k-30k' },
      {
        runtimeQueueName: 'product-scrape-profile',
        userId: 'user-1',
        waitWhilePaused: expect.any(Function),
      }
    );
  });

  it('fails fast when Redis runtime is not configured', async () => {
    mocks.isRedisAvailable.mockReturnValue(false);

    await expect(
      runProductScrapeProfileViaRedisRuntime({
        profileId: 'battlestock-warhammer-40k-30k',
      })
    ).rejects.toThrow('Scrape profiles require Redis runtime');

    expect(mocks.startWorker).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
