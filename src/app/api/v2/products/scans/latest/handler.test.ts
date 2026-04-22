import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { listLatestProductScansByProductIdsWithSyncMock } = vi.hoisted(() => ({
  listLatestProductScansByProductIdsWithSyncMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-scans-service', () => ({
  listLatestProductScansByProductIdsWithSync: (...args: unknown[]) =>
    listLatestProductScansByProductIdsWithSyncMock(...args),
}));

import { getHandler, querySchema } from './handler';

describe('products/scans/latest handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the latest-scan handler and query schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });

  it('lists the latest scan per product id', async () => {
    listLatestProductScansByProductIdsWithSyncMock.mockResolvedValue([
      { id: 'scan-1', productId: 'product-1', status: 'running' },
    ]);

    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/v2/products/scans/latest?productIds=product-1,product-2'
      ),
      {
        query: {
          productIds: 'product-1,product-2',
        },
      } as ApiHandlerContext
    );

    expect(listLatestProductScansByProductIdsWithSyncMock).toHaveBeenCalledWith({
      productIds: ['product-1', 'product-2'],
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      scans: [
        expect.objectContaining({
          id: 'scan-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'running',
          engineRunId: null,
          imageCandidates: [],
          asin: null,
          rawResult: null,
          error: null,
          asinUpdateStatus: null,
          completedAt: null,
        }),
      ],
    });
  });
});
