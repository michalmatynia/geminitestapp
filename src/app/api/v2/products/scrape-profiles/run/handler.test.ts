import { describe, expect, it, vi } from 'vitest';

import type { ProductScrapeProfileRunResponse } from '@/shared/contracts/products/scrape-profiles';
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
  products: [
    {
      index: 0,
      status: 'created',
      productId: 'product-1',
      sku: 'BATTLESTOCK-1',
      title: 'Rendered product',
      sourceUrl: 'https://www.battle-stock.pl/product-1',
      error: null,
    },
  ],
  summary: {
    rawCount: 1,
    mappedCount: 1,
    recordsWithErrors: 0,
    recordsWithWarnings: 0,
    totalIssues: 0,
  },
};

describe('product scrape profile run handler', () => {
  it('runs scrape profiles through the Redis runtime queue', async () => {
    const body = {
      profileId: 'battlestock-warhammer-40k-30k',
      dryRun: false,
      limit: 1,
    };
    mocks.runProductScrapeProfileViaRedisRuntimeMock.mockResolvedValue(runResponse);
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

    await expect(response.json()).resolves.toEqual(runResponse);
    expect(mocks.initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(mocks.runProductScrapeProfileViaRedisRuntimeMock).toHaveBeenCalledWith(body, {
      userId: 'user-1',
    });
  });
});
