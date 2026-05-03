import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductBatchEditRequest } from '@/shared/contracts/products/batch-edit';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  parseJsonBodyMock,
  getProductByIdMock,
  updateProductMock,
  invalidateAllMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  updateProductMock: vi.fn(),
  invalidateAllMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
  productService: {
    getProductById: getProductByIdMock,
    updateProduct: updateProductMock,
  },
  CachedProductService: {
    invalidateAll: invalidateAllMock,
  },
}));

import { postHandler } from './handler';

const buildContext = (userId: string | null = 'user-1'): ApiHandlerContext =>
  ({
    requestId: 'req-products-batch-edit',
    startTime: Date.now(),
    userId,
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    importSource: null,
    defaultPriceGroupId: null,
    ean: '111',
    gtin: '222',
    asin: 'B000',
    name: { en: 'Old name', pl: null, de: null },
    description: { en: 'Old description', pl: null, de: null },
    name_en: 'Old name',
    name_pl: 'Stara nazwa',
    name_de: null,
    description_en: 'Old description',
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 3,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: true,
    archived: false,
    categoryId: null,
    shippingGroupId: null,
    catalogId: 'default',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    images: [],
    catalogs: [],
    tags: [],
    producers: [],
    customFields: [],
    parameters: [],
    marketplaceContentOverrides: [],
    notes: null,
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    ...overrides,
  }) as ProductWithImages;

const mockParsedBody = (request: ProductBatchEditRequest): void => {
  parseJsonBodyMock.mockResolvedValue({
    ok: true,
    data: request,
  });
};

describe('products batch-edit handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProductByIdMock.mockResolvedValue(createProduct());
    updateProductMock.mockResolvedValue(createProduct({ name_en: 'New name' }));
  });

  it('previews changes without updating products or invalidating caches', async () => {
    mockParsedBody({
      productIds: ['product-1'],
      dryRun: true,
      operations: [{ field: 'name', language: 'en', mode: 'set', value: 'New name' }],
    });

    const response = await postHandler({} as NextRequest, buildContext());

    expect(response.status).toBe(200);
    expect(updateProductMock).not.toHaveBeenCalled();
    expect(invalidateAllMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      dryRun: true,
      requested: 1,
      matched: 1,
      changed: 1,
      unchanged: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          status: 'changed',
          changes: [{ field: 'name_en', oldValue: 'Old name', newValue: 'New name' }],
        },
      ],
    });
  });

  it('applies unique product patches and passes the authenticated user id', async () => {
    mockParsedBody({
      productIds: ['product-1', 'product-1', 'product-2'],
      dryRun: false,
      operations: [
        { field: 'ean', mode: 'set', value: 'EAN-NEW' },
        { field: 'gtin', mode: 'set', value: 'GTIN-NEW' },
        { field: 'asin', mode: 'set', value: 'ASIN-NEW' },
      ],
    });
    getProductByIdMock.mockImplementation((productId: string) =>
      Promise.resolve(createProduct({ id: productId }))
    );

    const response = await postHandler({} as NextRequest, buildContext('user-9'));

    expect(response.status).toBe(200);
    expect(getProductByIdMock).toHaveBeenCalledTimes(2);
    expect(updateProductMock).toHaveBeenCalledWith(
      'product-1',
      { ean: 'EAN-NEW', gtin: 'GTIN-NEW', asin: 'ASIN-NEW' },
      { userId: 'user-9' }
    );
    expect(updateProductMock).toHaveBeenCalledWith(
      'product-2',
      { ean: 'EAN-NEW', gtin: 'GTIN-NEW', asin: 'ASIN-NEW' },
      { userId: 'user-9' }
    );
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      dryRun: false,
      requested: 2,
      matched: 2,
      changed: 2,
      failed: 0,
    });
  });

  it('reports missing and failed products without blocking successful updates', async () => {
    mockParsedBody({
      productIds: ['changed-product', 'missing-product', 'failed-product'],
      dryRun: false,
      operations: [{ field: 'stock', mode: 'set', value: 7 }],
    });
    getProductByIdMock.mockImplementation((productId: string) => {
      if (productId === 'missing-product') return Promise.resolve(null);
      return Promise.resolve(createProduct({ id: productId }));
    });
    updateProductMock.mockImplementation((productId: string) => {
      if (productId === 'failed-product') return Promise.reject(new Error('write failed'));
      return Promise.resolve(createProduct({ id: productId, stock: 7 }));
    });

    const response = await postHandler({} as NextRequest, buildContext(null));

    expect(response.status).toBe(200);
    expect(updateProductMock).toHaveBeenCalledTimes(2);
    expect(updateProductMock).toHaveBeenCalledWith('changed-product', { stock: 7 }, undefined);
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      requested: 3,
      matched: 1,
      changed: 1,
      unchanged: 0,
      failed: 2,
      results: expect.arrayContaining([
        expect.objectContaining({ productId: 'changed-product', status: 'changed' }),
        expect.objectContaining({ productId: 'missing-product', status: 'not_found' }),
        expect.objectContaining({
          productId: 'failed-product',
          status: 'failed',
          error: 'write failed',
        }),
      ]),
    });
  });

  it('returns validation responses from JSON parsing unchanged', async () => {
    const validationResponse = new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
    });
    parseJsonBodyMock.mockResolvedValue({ ok: false, response: validationResponse });

    const response = await postHandler({} as NextRequest, buildContext());

    expect(response.status).toBe(400);
    expect(getProductByIdMock).not.toHaveBeenCalled();
    expect(updateProductMock).not.toHaveBeenCalled();
    expect(invalidateAllMock).not.toHaveBeenCalled();
  });
});
