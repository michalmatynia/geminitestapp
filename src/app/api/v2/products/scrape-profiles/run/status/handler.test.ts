import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import type { ProductScrapeProfileRuntimeRun } from '@/shared/contracts/products/scrape-profiles';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  readActiveProductScrapeProfileRun: vi.fn(),
  readLatestProductScrapeProfileRun: vi.fn(),
  readProductScrapeProfileRun: vi.fn(),
}));

vi.mock('@/server/queues/products', () => ({
  readActiveProductScrapeProfileRun: (...args: unknown[]) =>
    mocks.readActiveProductScrapeProfileRun(...args),
  readLatestProductScrapeProfileRun: (...args: unknown[]) =>
    mocks.readLatestProductScrapeProfileRun(...args),
  readProductScrapeProfileRun: (...args: unknown[]) => mocks.readProductScrapeProfileRun(...args),
}));

import { getHandler } from './handler';

const context: ApiHandlerContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  correlationId: 'correlation-1',
  startTime: 0,
  getElapsedMs: () => 0,
};

const run: ProductScrapeProfileRuntimeRun = {
  completedAt: null,
  createdAt: '2026-05-08T00:00:00.000Z',
  dryRun: false,
  error: null,
  id: 'job-1',
  profileId: 'battlestock-warhammer-40k-30k',
  queueName: 'product-scrape-profile',
  result: null,
  startedAt: null,
  status: 'running',
  updatedAt: '2026-05-08T00:00:01.000Z',
};

describe('product scrape profile runtime status handler', () => {
  it('reads the requested runtime run by job id', async () => {
    mocks.readProductScrapeProfileRun.mockResolvedValue(run);

    const response = await getHandler(
      new NextRequest('http://localhost/api/v2/products/scrape-profiles/run/status?jobId=job-1'),
      context
    );

    expect(mocks.readProductScrapeProfileRun).toHaveBeenCalledWith('job-1');
    await expect(response.json()).resolves.toEqual({ run });
  });

  it('falls back to the latest run when no active run exists', async () => {
    mocks.readActiveProductScrapeProfileRun.mockResolvedValue(null);
    mocks.readLatestProductScrapeProfileRun.mockResolvedValue(run);

    const response = await getHandler(
      new NextRequest('http://localhost/api/v2/products/scrape-profiles/run/status'),
      context
    );

    expect(mocks.readActiveProductScrapeProfileRun).toHaveBeenCalledTimes(1);
    expect(mocks.readLatestProductScrapeProfileRun).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({ run });
  });
});
