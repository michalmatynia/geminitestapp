import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub documentation modules required by product filter imports.
vi.mock('@/shared/contracts/documentation', () => ({ DOCUMENTATION_MODULE_IDS: {} }));
vi.mock('@/shared/lib/documentation/catalogs/ai-paths', () => ({
  AI_PATHS_TOOLTIP_CATALOG: [],
}));

const getProductsWithCountMock = vi.hoisted(() => vi.fn());
const getCachedProductsWithCountMock = vi.hoisted(() => vi.fn());

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

import { GET } from '@/app/api/v2/products/paged/route-handler';

const buildPagedProductsExpectation = (overrides: Record<string, unknown>) =>
  expect.objectContaining(overrides);

describe('GET /api/v2/products/paged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCachedProductsWithCountMock.mockResolvedValue({ products: [], total: 0 });
    getProductsWithCountMock.mockResolvedValue({ products: [], total: 0 });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns { products, total } shape', async () => {
    getCachedProductsWithCountMock.mockResolvedValue({
      products: [{ id: 'product-1' }],
      total: 1,
    });

    const res = await GET(new NextRequest('http://localhost/api/v2/products/paged'));
    expect(res.status).toBe(200);

    const data = (await res.json()) as { products: unknown[]; total: number };
    expect(data).toEqual({
      products: [{ id: 'product-1' }],
      total: 1,
    });
  });

  it('returns empty products and zero total when no products exist', async () => {
    getCachedProductsWithCountMock.mockResolvedValue({
      products: [],
      total: 0,
    });

    const res = await GET(new NextRequest('http://localhost/api/v2/products/paged'));
    expect(res.status).toBe(200);

    const data = (await res.json()) as { products: unknown[]; total: number };
    expect(data.products).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it('passes page and pageSize filters to cached service', async () => {
    await GET(new NextRequest('http://localhost/api/v2/products/paged?page=3&pageSize=10'));

    expect(getCachedProductsWithCountMock).toHaveBeenCalledWith(
      buildPagedProductsExpectation({ page: 3, pageSize: 10 })
    );
    expect(getProductsWithCountMock).not.toHaveBeenCalled();
  });

  it('passes catalogId filter when provided', async () => {
    await GET(new NextRequest('http://localhost/api/v2/products/paged?catalogId=cat-123'));

    expect(getCachedProductsWithCountMock).toHaveBeenCalledWith(
      buildPagedProductsExpectation({ catalogId: 'cat-123' })
    );
  });

  it('uses fresh service when fresh=1 is provided', async () => {
    await GET(new NextRequest('http://localhost/api/v2/products/paged?fresh=1&page=1&pageSize=20'));

    expect(getProductsWithCountMock).toHaveBeenCalledWith(
      buildPagedProductsExpectation({ page: 1, pageSize: 20 })
    );
    expect(getCachedProductsWithCountMock).not.toHaveBeenCalled();
  });
});
