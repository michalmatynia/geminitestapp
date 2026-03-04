import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getProducts: vi.fn(),
  getProductCount: vi.fn(),
  getProductBySku: vi.fn(),
  invalidateAll: vi.fn(),
}));

vi.mock('@/features/products/performance', () => ({
  CachedProductService: {
    getProducts: mocks.getProducts,
    getProductCount: mocks.getProductCount,
    getProductBySku: mocks.getProductBySku,
    invalidateAll: mocks.invalidateAll,
  },
}));

vi.mock('@/features/products/security', () => ({
  withSecurity: (handler: (...args: unknown[]) => Promise<Response>) => handler,
}));

import { ProductsV2GET, ProductsV2POST } from './v2-products-route';

describe('/api/v2/products route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a versioned list payload without product-shape transformation', async () => {
    const products = [{ id: 'product-1', sku: 'SKU-1', name_en: 'Desk Lamp' }];
    mocks.getProducts.mockResolvedValue(products);
    mocks.getProductCount.mockResolvedValue(7);

    const response = await ProductsV2GET(new NextRequest('http://localhost/api/v2/products?page=2&limit=1'));
    const body = (await response.json()) as {
      version: string;
      data: {
        products: Array<Record<string, unknown>>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          hasNext: boolean;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get('API-Version')).toBe('v2');
    expect(body.version).toBe('v2');
    expect(body.data.products).toEqual(products);
    expect(body.data.pagination).toEqual({
      page: 2,
      limit: 1,
      total: 7,
      hasNext: true,
    });
    expect(mocks.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 1 })
    );
  });

  it('returns a versioned create payload and preserves submitted product fields', async () => {
    mocks.getProductBySku.mockResolvedValue(null);

    const response = await ProductsV2POST(
      new NextRequest('http://localhost/api/v2/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sku: 'SKU-NEW', name_en: 'Floor Lamp' }),
      })
    );

    const body = (await response.json()) as {
      version: string;
      data: {
        id: string;
        sku: string;
        name_en: string;
        createdAt: string;
        updatedAt: string;
      };
    };

    expect(response.status).toBe(201);
    expect(response.headers.get('API-Version')).toBe('v2');
    expect(body.version).toBe('v2');
    expect(body.data.sku).toBe('SKU-NEW');
    expect(body.data.name_en).toBe('Floor Lamp');
    expect(body.data.id).toEqual(expect.any(String));
    expect(body.data.createdAt).toEqual(expect.any(String));
    expect(body.data.updatedAt).toEqual(expect.any(String));
    expect(mocks.invalidateAll).toHaveBeenCalledTimes(1);
  });

  it('returns unsupported-version payload for v1 requests', async () => {
    const response = await ProductsV2GET(new NextRequest('http://localhost/api/v1/products'));
    const body = (await response.json()) as {
      error: string;
      supportedVersions: string[];
      requestedVersion: string;
    };

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: 'Unsupported API version',
      supportedVersions: ['v2'],
      requestedVersion: 'v1',
    });
    expect(mocks.getProducts).not.toHaveBeenCalled();
    expect(mocks.getProductCount).not.toHaveBeenCalled();
  });
});
