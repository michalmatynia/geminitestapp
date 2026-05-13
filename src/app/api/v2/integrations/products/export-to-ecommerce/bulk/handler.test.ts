import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  exportProductsToEcommerceMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  exportProductsToEcommerce: (...args: unknown[]) =>
    mocks.exportProductsToEcommerceMock(...args),
}));

import { bulkSchema, postBulkExportToEcommerceHandler } from './handler';

describe('bulk product export-to-ecommerce handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exportProductsToEcommerceMock.mockResolvedValue({
      success: true,
      requested: 2,
      succeeded: 2,
      failed: 0,
      items: [
        {
          productId: 'product-1',
          status: 'created',
          ecommerceProductId: 'product-1',
          slug: 'product-1',
          errorMessage: null,
        },
        {
          productId: 'product-2',
          status: 'updated',
          ecommerceProductId: 'product-2',
          slug: 'product-2',
          errorMessage: null,
        },
      ],
    });
  });

  it('exports selected products through the ecommerce bulk export service', async () => {
    const response = await postBulkExportToEcommerceHandler({} as NextRequest, {
      body: {
        productIds: ['product-1', 'product-2'],
      },
    } as ApiHandlerContext);

    expect(mocks.exportProductsToEcommerceMock).toHaveBeenCalledWith(['product-1', 'product-2']);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      success: true,
      requested: 2,
      succeeded: 2,
      failed: 0,
      items: [
        {
          productId: 'product-1',
          status: 'created',
          ecommerceProductId: 'product-1',
          slug: 'product-1',
          errorMessage: null,
        },
        {
          productId: 'product-2',
          status: 'updated',
          ecommerceProductId: 'product-2',
          slug: 'product-2',
          errorMessage: null,
        },
      ],
    });
  });

  it('exports the request schema used by the route wrapper', () => {
    expect(bulkSchema.safeParse({ productIds: ['product-1'] }).success).toBe(true);
    expect(bulkSchema.safeParse({ productIds: [] }).success).toBe(false);
  });
});
