import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProductCount: vi.fn(),
  getProducts: vi.fn(),
  getFreshProducts: vi.fn(),
  getProductDataProvider: vi.fn(),
}));

vi.mock('@/features/products/performance', () => ({
  CachedProductService: {
    getProductCount: mocks.getProductCount,
    getProducts: mocks.getProducts,
  },
  performanceMonitor: {
    record: vi.fn(),
  },
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProducts: mocks.getFreshProducts,
  },
}));

vi.mock('@/features/products/server', () => ({
  getProductDataProvider: mocks.getProductDataProvider,
}));

import { GET as GET_COUNT } from '@/app/api/v2/products/count/route';
import { GET as GET_LIST } from '@/app/api/v2/products/route';

describe('Products API pagination and count routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProductCount.mockResolvedValue(0);
    mocks.getProducts.mockResolvedValue([]);
    mocks.getFreshProducts.mockResolvedValue([]);
    mocks.getProductDataProvider.mockResolvedValue('mongodb');
  });

  it('passes parsed filters to the count route and clamps oversized pageSize', async () => {
    mocks.getProductCount.mockResolvedValue(3);

    const response = await GET_COUNT(
      new NextRequest('http://localhost/api/v2/products/count?search=lap&page=2&pageSize=96')
    );
    const data = (await response.json()) as { count: number };

    expect(response.status).toBe(200);
    expect(data).toEqual({ count: 3 });
    expect(mocks.getProductCount).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'lap',
        page: 2,
        pageSize: 48,
      })
    );
  });

  it('uses the cached list service for paginated product reads', async () => {
    mocks.getProducts.mockResolvedValue([
      { id: 'product-3' },
      { id: 'product-4' },
    ]);

    const response = await GET_LIST(
      new NextRequest('http://localhost/api/v2/products?page=2&pageSize=2&search=desk')
    );
    const data = (await response.json()) as Array<{ id: string }>;

    expect(response.status).toBe(200);
    expect(data.map((product) => product.id)).toEqual(['product-3', 'product-4']);
    expect(mocks.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'desk',
        page: 2,
        pageSize: 2,
      })
    );
    expect(mocks.getFreshProducts).not.toHaveBeenCalled();
  });

  it('uses the fresh repository-backed path when fresh=1 is requested', async () => {
    mocks.getFreshProducts.mockResolvedValue([{ id: 'fresh-1' }]);

    const response = await GET_LIST(
      new NextRequest('http://localhost/api/v2/products?fresh=1&page=3&pageSize=5')
    );
    const data = (await response.json()) as Array<{ id: string }>;

    expect(response.status).toBe(200);
    expect(data).toEqual([{ id: 'fresh-1' }]);
    expect(mocks.getProductDataProvider).toHaveBeenCalledTimes(1);
    expect(mocks.getFreshProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 3,
        pageSize: 5,
      }),
      expect.objectContaining({
        provider: 'mongodb',
        timings: expect.any(Object),
      })
    );
    expect(mocks.getProducts).not.toHaveBeenCalled();
  });
});
