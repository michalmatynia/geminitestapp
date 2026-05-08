import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductScrapeProfileRunResponse } from '@/shared/contracts/products/scrape-profiles';
import type { QueueConfig } from '@/shared/contracts/jobs';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  enqueue: vi.fn(),
  getJob: vi.fn(),
  getQueue: vi.fn(),
  getHealthStatus: vi.fn(),
  isRedisAvailable: vi.fn(),
  isRedisReachable: vi.fn(),
  logInfo: vi.fn(),
  logWarning: vi.fn(),
  queueConfig: null as QueueConfig<unknown> | null,
  redisStore: new Map<string, string>(),
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
      getHealthStatus: mocks.getHealthStatus,
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

vi.mock('@/shared/lib/redis', () => ({
  getRedisClient: () => ({
    del: async (key: string) => {
      const existed = mocks.redisStore.delete(key);
      return existed ? 1 : 0;
    },
    get: async (key: string) => mocks.redisStore.get(key) ?? null,
    set: async (key: string, value: string) => {
      mocks.redisStore.set(key, value);
      return 'OK';
    },
  }),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
    logInfo: mocks.logInfo,
    logWarning: mocks.logWarning,
  },
}));

import {
  pauseProductScrapeProfileRun,
  readActiveProductScrapeProfileRun,
  readProductScrapeProfileRun,
  resumeProductScrapeProfileRun,
  runProductScrapeProfileViaRedisRuntime,
} from './productScrapeProfileQueue';

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
    mocks.redisStore.clear();
    mocks.isRedisAvailable.mockReturnValue(true);
    mocks.isRedisReachable.mockResolvedValue(true);
    mocks.redisConnection.mockReturnValue({ status: 'ready' });
    mocks.enqueue.mockImplementation(
      async (_data: unknown, options?: { jobId?: string }) => options?.jobId ?? 'job-1'
    );
    mocks.getHealthStatus.mockResolvedValue({
      activeCount: 0,
      completedCount: 0,
      deliveryMode: 'queue',
      failedCount: 0,
      healthy: true,
      processing: false,
      redisAvailable: true,
      running: true,
      waitingCount: 0,
      workerLocal: true,
      workerState: 'idle',
    });
    mocks.getJob.mockResolvedValue(null);
    mocks.getQueue.mockReturnValue({ getJob: mocks.getJob });
    mocks.runProductScrapeProfile.mockResolvedValue(runResponse);
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
      imageImportMode: 'links',
      queueName: 'product-scrape-profile',
      run: expect.objectContaining({
        imageImportMode: 'links',
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
    const request = {
      profileId: 'battlestock-warhammer-40k-30k',
      draftTemplateId: 'draft-template-1',
      imageImportMode: 'files' as const,
    };
    const queued = await runProductScrapeProfileViaRedisRuntime(request, { userId: 'user-1' });

    expect(queued).toMatchObject({
      imageImportMode: 'files',
      run: expect.objectContaining({
        imageImportMode: 'files',
      }),
    });

    await mocks.queueConfig?.processor(
      { request, requestedAt: queued.enqueuedAt, userId: 'user-1' },
      queued.jobId
    );

    expect(mocks.runProductScrapeProfile).toHaveBeenCalledWith(
      {
        profileId: 'battlestock-warhammer-40k-30k',
        draftTemplateId: 'draft-template-1',
        imageImportMode: 'files',
      },
      expect.objectContaining({
        reportProgress: expect.any(Function),
        runtimeQueueName: 'product-scrape-profile',
        userId: 'user-1',
        waitWhilePaused: expect.any(Function),
      })
    );
  });

  it('stores scrape profile runtime progress reported by the worker', async () => {
    const request = { profileId: 'battlestock-warhammer-40k-30k', limit: 1 };
    const queued = await runProductScrapeProfileViaRedisRuntime(request, { userId: 'user-1' });
    mocks.runProductScrapeProfile.mockImplementationOnce(async (_request, options) => {
      await options.reportProgress({
        current: 0,
        message: 'Running Playwright action BattleStock Product Scrape.',
        stage: 'scrape_starting',
        total: 1,
      });
      return runResponse;
    });

    await mocks.queueConfig?.processor(
      { request, requestedAt: queued.enqueuedAt, userId: 'user-1' },
      queued.jobId
    );

    await expect(readProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
      id: queued.jobId,
      progress: expect.objectContaining({
        current: 0,
        message: 'Running Playwright action BattleStock Product Scrape.',
        stage: 'scrape_starting',
        total: 1,
      }),
      status: 'completed',
    });
  });

  it('tracks active runtime state and supports pause, resume, and completion', async () => {
    const request = { profileId: 'battlestock-warhammer-40k-30k', limit: 1 };
    const queued = await runProductScrapeProfileViaRedisRuntime(request, { userId: 'user-1' });

    await expect(readActiveProductScrapeProfileRun()).resolves.toMatchObject({
      id: queued.jobId,
      status: 'queued',
    });
    await expect(pauseProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
      id: queued.jobId,
      status: 'paused',
    });
    await expect(resumeProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
      id: queued.jobId,
      status: 'queued',
    });

    const jobData = {
      request,
      requestedAt: queued.enqueuedAt,
      userId: 'user-1',
    };
    await mocks.queueConfig?.processor(jobData, queued.jobId);
    await expect(readProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
      id: queued.jobId,
      result: expect.objectContaining({ createdCount: 1 }),
      status: 'completed',
    });

    await mocks.queueConfig?.onCompleted?.(queued.jobId, runResponse, jobData);

    await expect(readActiveProductScrapeProfileRun()).resolves.toBeNull();
    await expect(readProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
      id: queued.jobId,
      status: 'completed',
      result: expect.objectContaining({ createdCount: 1 }),
    });
  });

  it('recovers stale queued runtime runs when the Redis worker never picks up the job', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-08T00:00:00.000Z'));
      mocks.getJob.mockResolvedValue({
        failedReason: null,
        getState: vi.fn().mockResolvedValue('waiting'),
      });
      const request = { profileId: 'battlestock-warhammer-40k-30k', limit: 1 };
      const queued = await runProductScrapeProfileViaRedisRuntime(request, { userId: 'user-1' });

      vi.setSystemTime(new Date('2026-05-08T00:03:00.000Z'));

      await expect(readActiveProductScrapeProfileRun()).resolves.toBeNull();
      await expect(readProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
        error: expect.stringContaining('without Redis worker pickup'),
        id: queued.jobId,
        status: 'failed',
      });
      expect(mocks.logWarning).toHaveBeenCalledWith(
        'Recovered stale scrape profile runtime run',
        expect.objectContaining({
          jobId: queued.jobId,
          queueJobState: 'waiting',
          status: 'queued',
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails the active run when the Redis job aborts while the scrape is still pending', async () => {
    const request = { profileId: 'battlestock-warhammer-40k-30k', limit: 1 };
    const queued = await runProductScrapeProfileViaRedisRuntime(request, { userId: 'user-1' });
    const controller = new AbortController();
    mocks.runProductScrapeProfile.mockImplementationOnce(
      async () => await new Promise(() => undefined)
    );

    const jobData = {
      request,
      requestedAt: queued.enqueuedAt,
      userId: 'user-1',
    };
    const execution = expect(
      mocks.queueConfig?.processor(jobData, queued.jobId, controller.signal)
    ).rejects.toThrow('scrape timed out');

    controller.abort(new Error('scrape timed out'));

    await execution;
    await expect(readProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
      error: 'scrape timed out',
      id: queued.jobId,
      status: 'failed',
    });
  });

  it('recovers a running runtime run immediately when its Redis job is missing', async () => {
    const request = { profileId: 'battlestock-warhammer-40k-30k', limit: 1 };
    const queued = await runProductScrapeProfileViaRedisRuntime(request, { userId: 'user-1' });
    const controller = new AbortController();
    mocks.runProductScrapeProfile.mockImplementationOnce(
      async () => await new Promise(() => undefined)
    );

    const jobData = {
      request,
      requestedAt: queued.enqueuedAt,
      userId: 'user-1',
    };
    const processing = mocks.queueConfig?.processor(jobData, queued.jobId, controller.signal);

    await vi.waitFor(() => {
      expect(mocks.runProductScrapeProfile).toHaveBeenCalled();
    });

    await expect(readProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
      error: 'Scrape profile Redis job disappeared while the run was marked running.',
      id: queued.jobId,
      status: 'failed',
    });

    controller.abort(new Error('cleanup'));
    await expect(processing).rejects.toThrow('cleanup');
  });

  it('recovers stale running runtime runs even when Redis still reports an active job', async () => {
    const realStartedAt = Date.now();
    let processing: Promise<unknown> | undefined;
    const controller = new AbortController();
    try {
      mocks.getJob.mockResolvedValue({
        failedReason: null,
        getState: vi.fn().mockResolvedValue('active'),
      });
      const request = { profileId: 'battlestock-warhammer-40k-30k', limit: 1 };
      const queued = await runProductScrapeProfileViaRedisRuntime(request, { userId: 'user-1' });
      mocks.runProductScrapeProfile.mockImplementationOnce(async () => {
        await new Promise(() => undefined);
      });

      const jobData = {
        request,
        requestedAt: queued.enqueuedAt,
        userId: 'user-1',
      };
      processing = mocks.queueConfig?.processor(jobData, queued.jobId, controller.signal);
      void processing?.catch(() => undefined);

      await vi.waitFor(() => {
        expect(mocks.runProductScrapeProfile).toHaveBeenCalled();
      });
      vi.useFakeTimers();
      vi.setSystemTime(new Date(realStartedAt + 21 * 60 * 1000));

      await expect(readActiveProductScrapeProfileRun()).resolves.toBeNull();
      await expect(readProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
        error: expect.stringContaining('Redis job was still active'),
        id: queued.jobId,
        status: 'failed',
      });
      vi.useRealTimers();
      controller.abort(new Error('cleanup'));
    } finally {
      vi.useRealTimers();
      if (controller.signal.aborted === false) {
        controller.abort(new Error('cleanup'));
      }
    }
  });

  it('does not restart a stale running run when Bull reprocesses the same job', async () => {
    let processing: Promise<unknown> | undefined;
    const controller = new AbortController();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-08T00:00:00.000Z'));
      mocks.getJob.mockResolvedValue({
        failedReason: null,
        getState: vi.fn().mockResolvedValue('active'),
      });
      const request = { profileId: 'battlestock-warhammer-40k-30k', limit: 1 };
      const queued = await runProductScrapeProfileViaRedisRuntime(request, { userId: 'user-1' });
      mocks.runProductScrapeProfile.mockImplementationOnce(async () => {
        await new Promise(() => undefined);
      });

      const jobData = {
        request,
        requestedAt: queued.enqueuedAt,
        userId: 'user-1',
      };
      processing = mocks.queueConfig?.processor(jobData, queued.jobId, controller.signal);
      void processing?.catch(() => undefined);

      await vi.waitFor(() => {
        expect(mocks.runProductScrapeProfile).toHaveBeenCalledTimes(1);
      });
      vi.setSystemTime(new Date('2026-05-08T00:21:00.000Z'));

      await expect(mocks.queueConfig?.processor(jobData, queued.jobId)).rejects.toThrow(
        'already failed'
      );

      expect(mocks.runProductScrapeProfile).toHaveBeenCalledTimes(1);
      await expect(readProductScrapeProfileRun(queued.jobId)).resolves.toMatchObject({
        error: expect.stringContaining('Redis job was still active'),
        id: queued.jobId,
        status: 'failed',
      });
    } finally {
      if (controller.signal.aborted === false) {
        controller.abort(new Error('cleanup'));
      }
      vi.useRealTimers();
      if (processing !== undefined) {
        await expect(processing).rejects.toThrow('cleanup');
      }
    }
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

  it('fails fast without recording an active run when the Redis worker cannot start', async () => {
    mocks.startWorker.mockImplementationOnce(() => {
      throw new Error('worker boot failed');
    });

    await expect(
      runProductScrapeProfileViaRedisRuntime({
        profileId: 'battlestock-warhammer-40k-30k',
      })
    ).rejects.toThrow('Scrape profiles Redis worker could not be started');

    expect(mocks.enqueue).not.toHaveBeenCalled();
    await expect(readActiveProductScrapeProfileRun()).resolves.toBeNull();
  });

  it('fails fast without enqueueing when worker health stays inactive after startup', async () => {
    mocks.getHealthStatus.mockResolvedValueOnce({
      activeCount: 0,
      completedCount: 0,
      deliveryMode: 'queue',
      failedCount: 0,
      healthy: false,
      processing: false,
      redisAvailable: true,
      running: false,
      waitingCount: 0,
      workerLocal: false,
      workerState: 'offline',
    });

    await expect(
      runProductScrapeProfileViaRedisRuntime({
        profileId: 'battlestock-warhammer-40k-30k',
      })
    ).rejects.toThrow('Scrape profiles Redis worker did not start');

    expect(mocks.enqueue).not.toHaveBeenCalled();
    await expect(readActiveProductScrapeProfileRun()).resolves.toBeNull();
  });
});
