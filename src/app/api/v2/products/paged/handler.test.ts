import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { getProductsWithCountMock } = vi.hoisted(() => ({
  getProductsWithCountMock: vi.fn(),
}));
const { getCachedProductsWithCountMock } = vi.hoisted(() => ({
  getCachedProductsWithCountMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductsWithCount: (...args: unknown[]) => getProductsWithCountMock(...args),
  },
}));
vi.mock('@/features/products/performance', () => ({
  CachedProductService: {
    getProductsWithCount: (...args: unknown[]) => getCachedProductsWithCountMock(...args),
  },
}));

import { getHandler } from './handler';

describe('products/paged handler', () => {
  beforeEach(() => {
    getProductsWithCountMock.mockReset();
    getCachedProductsWithCountMock.mockReset();
  });

  it('uses cached paged service by default', async () => {
    getCachedProductsWithCountMock.mockResolvedValue({
      products: [{ id: 'cached-product-1' }],
      total: 1,
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/v2/products/paged?page=1&pageSize=12'),
      {
        query: { page: 1, pageSize: 12 },
        getElapsedMs: () => 12,
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    expect(getCachedProductsWithCountMock).toHaveBeenCalledWith({ page: 1, pageSize: 12 });
    expect(getProductsWithCountMock).not.toHaveBeenCalled();
  });

  it('bypasses cache when fresh=1 is provided', async () => {
    getProductsWithCountMock.mockResolvedValue({
      products: [{ id: 'fresh-product-1' }],
      total: 1,
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/v2/products/paged?page=1&pageSize=12&fresh=1'),
      {
        query: { page: 1, pageSize: 12 },
        getElapsedMs: () => 12,
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    expect(getProductsWithCountMock).toHaveBeenCalledWith({ page: 1, pageSize: 12 });
  });

  it('returns paged result with Server-Timing header', async () => {
    getCachedProductsWithCountMock.mockResolvedValue({
      products: [{ id: 'product-1' }],
      total: 1,
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/v2/products/paged?page=1&pageSize=12'),
      {
        query: { page: 1, pageSize: 12 },
        getElapsedMs: () => 12,
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    const timingHeader = response.headers.get('Server-Timing');
    expect(timingHeader).toContain('service;dur=');
    expect(timingHeader).toContain('total;dur=');
  });
});
