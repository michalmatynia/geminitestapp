import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { enqueueBatchJobMock, resolveIntegrationMock } = vi.hoisted(() => ({
  enqueueBatchJobMock: vi.fn(),
  resolveIntegrationMock: vi.fn(),
}));

vi.mock('@/features/products/server/marketplace-copy-debrand-batch', () => ({
  resolveMarketplaceCopyDebrandIntegration: (...args: unknown[]) =>
    resolveIntegrationMock(...args),
}));

vi.mock('@/features/products/workers/productMarketplaceCopyDebrandBatchQueue', () => ({
  enqueueProductMarketplaceCopyDebrandBatchJob: (...args: unknown[]) =>
    enqueueBatchJobMock(...args),
}));

import { postHandler, productMarketplaceCopyDebrandBatchRequestSchema } from './handler';

describe('products marketplace-copy-debrand batch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveIntegrationMock.mockResolvedValue({
      id: 'integration-allegro',
      slug: 'allegro',
      name: 'Allegro',
    });
    enqueueBatchJobMock.mockResolvedValue('batch-job-1');
  });

  it('exports the batch handler and request schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof productMarketplaceCopyDebrandBatchRequestSchema.safeParse).toBe('function');
  });

  it('queues the Redis runtime batch job for unique selected products', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/marketplace-copy-debrand/batch', {
        method: 'POST',
      }),
      {
        body: {
          productIds: ['product-1', 'product-1', 'product-2'],
          integrationId: 'integration-allegro',
        },
        userId: 'user-42',
      } as ApiHandlerContext
    );

    expect(resolveIntegrationMock).toHaveBeenCalledWith('integration-allegro');
    expect(enqueueBatchJobMock).toHaveBeenCalledWith({
      productIds: ['product-1', 'product-2'],
      integrationId: 'integration-allegro',
      userId: 'user-42',
      requestedAt: expect.any(String),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'queued',
      jobId: 'batch-job-1',
      requested: 2,
      integrationId: 'integration-allegro',
      integrationSlug: 'allegro',
      integrationName: 'Allegro',
    });
  });
});
