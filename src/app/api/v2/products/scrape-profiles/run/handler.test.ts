import { describe, expect, it, vi } from 'vitest';

import type { ProductScrapeProfileRunQueuedResponse } from '@/shared/contracts/products/scrape-profiles';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  initializeQueuesMock: vi.fn(),
  runProductScrapeProfileViaRedisRuntimeMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  initializeQueues: mocks.initializeQueuesMock,
}));

vi.mock('@/server/queues/products', () => ({
  runProductScrapeProfileViaRedisRuntime: (...args: unknown[]) =>
    mocks.runProductScrapeProfileViaRedisRuntimeMock(...args),
}));

import { postHandler } from './handler';

const queuedResponse: ProductScrapeProfileRunQueuedResponse = {
  status: 'queued',
  profileId: 'battlestock-warhammer-40k-30k',
  dryRun: false,
  jobId: 'job-1',
  queueName: 'product-scrape-profile',
  enqueuedAt: '2026-05-08T00:00:00.000Z',
};

describe('product scrape profile run handler', () => {
  it('queues scrape profiles through the Redis runtime without waiting for completion', async () => {
    const body = {
      profileId: 'battlestock-warhammer-40k-30k',
      dryRun: false,
      limit: 1,
    };
    mocks.runProductScrapeProfileViaRedisRuntimeMock.mockResolvedValue(queuedResponse);
    const context: ApiHandlerContext = {
      requestId: 'request-1',
      traceId: 'trace-1',
      correlationId: 'correlation-1',
      startTime: 0,
      getElapsedMs: () => 0,
      body,
      userId: 'user-1',
    };

    const response = await postHandler(new Request('http://test.local') as never, context);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual(queuedResponse);
    expect(mocks.initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(mocks.runProductScrapeProfileViaRedisRuntimeMock).toHaveBeenCalledWith(body, {
      userId: 'user-1',
    });
  });
});
