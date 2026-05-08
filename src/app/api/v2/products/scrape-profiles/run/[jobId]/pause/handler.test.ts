import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import type { ProductScrapeProfileRuntimeRun } from '@/shared/contracts/products/scrape-profiles';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  pauseProductScrapeProfileRun: vi.fn(),
  resumeProductScrapeProfileRun: vi.fn(),
}));

vi.mock('@/server/queues/products', () => ({
  pauseProductScrapeProfileRun: (...args: unknown[]) =>
    mocks.pauseProductScrapeProfileRun(...args),
  resumeProductScrapeProfileRun: (...args: unknown[]) =>
    mocks.resumeProductScrapeProfileRun(...args),
}));

import { postHandler as pausePostHandler } from './handler';
import { postHandler as resumePostHandler } from '../resume/handler';

const context: ApiHandlerContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  correlationId: 'correlation-1',
  startTime: 0,
  getElapsedMs: () => 0,
};

const buildRun = (status: ProductScrapeProfileRuntimeRun['status']): ProductScrapeProfileRuntimeRun => ({
  completedAt: null,
  createdAt: '2026-05-08T00:00:00.000Z',
  dryRun: false,
  error: null,
  id: 'job-1',
  profileId: 'battlestock-warhammer-40k-30k',
  queueName: 'product-scrape-profile',
  result: null,
  startedAt: '2026-05-08T00:00:01.000Z',
  status,
  updatedAt: '2026-05-08T00:00:02.000Z',
});

describe('product scrape profile runtime pause/resume handlers', () => {
  it('pauses the requested runtime run', async () => {
    const run = buildRun('paused');
    mocks.pauseProductScrapeProfileRun.mockResolvedValue(run);

    const response = await pausePostHandler(
      new NextRequest('http://localhost/api/v2/products/scrape-profiles/run/job-1/pause'),
      context,
      { jobId: 'job-1' }
    );

    expect(mocks.pauseProductScrapeProfileRun).toHaveBeenCalledWith('job-1');
    await expect(response.json()).resolves.toEqual({ run });
  });

  it('resumes the requested runtime run', async () => {
    const run = buildRun('running');
    mocks.resumeProductScrapeProfileRun.mockResolvedValue(run);

    const response = await resumePostHandler(
      new NextRequest('http://localhost/api/v2/products/scrape-profiles/run/job-1/resume'),
      context,
      { jobId: 'job-1' }
    );

    expect(mocks.resumeProductScrapeProfileRun).toHaveBeenCalledWith('job-1');
    await expect(response.json()).resolves.toEqual({ run });
  });
});
