import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { parseJsonBodyMock, duplicateProductMock, invalidateAllMock } = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  duplicateProductMock: vi.fn(),
  invalidateAllMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
  CachedProductService: {
    invalidateAll: invalidateAllMock,
  },
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    duplicateProduct: duplicateProductMock,
  },
}));

import { POST_handler } from './handler';

const buildContext = (userId: string | null = null): ApiHandlerContext =>
  ({
    requestId: 'req-products-duplicate-handler',
    startTime: Date.now(),
    userId,
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('products/[id]/duplicate handler cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseJsonBodyMock.mockResolvedValue({ ok: true, data: { sku: 'DUP-SKU' } });
    duplicateProductMock.mockResolvedValue({ id: 'product-dup-1', sku: 'DUP-SKU' });
  });

  it('invalidates all product caches after successful duplicate', async () => {
    const request = {} as NextRequest;

    const response = await POST_handler(request, buildContext(), { id: 'product-1' });

    expect(response.status).toBe(200);
    expect(duplicateProductMock).toHaveBeenCalledWith('product-1', 'DUP-SKU', undefined);
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
  });

  it('does not invalidate caches when duplicate fails with not found', async () => {
    const request = {} as NextRequest;
    duplicateProductMock.mockResolvedValueOnce(null);

    await expect(POST_handler(request, buildContext(), { id: 'missing-product' })).rejects.toThrow(
      'Product not found'
    );

    expect(invalidateAllMock).not.toHaveBeenCalled();
  });
});
