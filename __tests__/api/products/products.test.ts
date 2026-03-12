import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cachedGetProducts: vi.fn(),
  cachedGetProductById: vi.fn(),
  cachedGetProductBySku: vi.fn(),
  cachedInvalidateAll: vi.fn(),
  cachedInvalidateProduct: vi.fn(),
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  duplicateProduct: vi.fn(),
  getPublicProductById: vi.fn(),
  getProductDataProvider: vi.fn(),
  parseJsonBody: vi.fn(),
}));

vi.mock('@/features/products/performance', () => ({
  CachedProductService: {
    getProducts: mocks.cachedGetProducts,
    getProductById: mocks.cachedGetProductById,
    getProductBySku: mocks.cachedGetProductBySku,
    invalidateAll: mocks.cachedInvalidateAll,
    invalidateProduct: mocks.cachedInvalidateProduct,
  },
  performanceMonitor: {
    record: vi.fn(),
  },
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProducts: mocks.getProducts,
    createProduct: mocks.createProduct,
    updateProduct: mocks.updateProduct,
    deleteProduct: mocks.deleteProduct,
    duplicateProduct: mocks.duplicateProduct,
    getProductById: mocks.getPublicProductById,
  },
}));

vi.mock('@/features/products/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/products/server')>();
  return {
    ...actual,
    CachedProductService: {
      getProductById: mocks.cachedGetProductById,
      invalidateAll: mocks.cachedInvalidateAll,
      invalidateProduct: mocks.cachedInvalidateProduct,
    },
    getProductDataProvider: mocks.getProductDataProvider,
    parseJsonBody: mocks.parseJsonBody,
    productService: {
      getProductById: mocks.getPublicProductById,
    },
  };
});

vi.mock('@/features/products/validations/middleware', () => ({
  validateProductCreateMiddleware: vi.fn().mockResolvedValue({ success: true }),
  validateProductUpdateMiddleware: vi.fn().mockResolvedValue({ success: true }),
}));

import { POST as POST_DUPLICATE } from '@/app/api/v2/products/[id]/duplicate/route';
import { DELETE, PUT } from '@/app/api/v2/products/[id]/route';
import { GET as GET_LIST, POST } from '@/app/api/v2/products/route';
import { GET as GET_PUBLIC } from '@/app/api/public/products/[id]/route';

describe('Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cachedGetProductBySku.mockResolvedValue(null);
    mocks.getProductDataProvider.mockResolvedValue('mongodb');
    mocks.parseJsonBody.mockImplementation(async (req: Request, schema: { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: unknown } }) => {
      const body = await req.json();
      const result = schema.safeParse(body);
      if (result.success) {
        return { ok: true, data: result.data };
      }
      return {
        ok: false,
        response: new Response(JSON.stringify(result.error), { status: 400 }),
      };
    });
  });

  it('returns products from the cached list service', async () => {
    mocks.cachedGetProducts.mockResolvedValue([
      { id: 'product-1', name_en: 'Product 1' },
      { id: 'product-2', name_en: 'Product 2' },
    ]);

    const res = await GET_LIST(new NextRequest('http://localhost/api/products'));
    const products = await res.json();

    expect(res.status).toBe(200);
    expect(products).toHaveLength(2);
    expect(mocks.cachedGetProducts).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
  });

  it('rejects invalid product data', async () => {
    const formData = new FormData();
    formData.append('price', 'not-a-number');
    formData.append('sku', 'SKU123');

    const res = await POST(
      new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: formData,
      })
    );

    expect(res.status).toBe(400);
  });

  it('creates a product from form data', async () => {
    mocks.createProduct.mockResolvedValue({
      id: 'product-new',
      name_en: 'New Product (EN)',
      sku: 'NEW-SKU-001',
    });

    const formData = new FormData();
    formData.append('name_en', 'New Product (EN)');
    formData.append('price', '200');
    formData.append('sku', 'NEW-SKU-001');

    const res = await POST(
      new NextRequest('http://localhost/api/products', {
        method: 'POST',
        body: formData,
      })
    );
    const product = await res.json();

    expect(res.status).toBe(200);
    expect(product.id).toBe('product-new');
    expect(mocks.createProduct).toHaveBeenCalledOnce();
    expect(mocks.cachedInvalidateAll).toHaveBeenCalledOnce();
  });

  it('returns 404 when updating a non-existent product', async () => {
    mocks.updateProduct.mockResolvedValue(null);

    const formData = new FormData();
    formData.append('name_en', 'Updated Name');

    const res = await PUT(
      new NextRequest('http://localhost/api/products/missing', {
        method: 'PUT',
        body: formData,
      }),
      { params: Promise.resolve({ id: 'missing' }) }
    );

    expect(res.status).toBe(404);
  });

  it('returns 404 when deleting a non-existent product', async () => {
    mocks.deleteProduct.mockResolvedValue(null);

    const res = await DELETE(
      new NextRequest('http://localhost/api/products/missing', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'missing' }) }
    );

    expect(res.status).toBe(404);
  });

  it('returns a single public product', async () => {
    mocks.getPublicProductById.mockResolvedValue({
      id: 'product-1',
      name_en: 'Product 1 (EN)',
    });

    const res = await GET_PUBLIC(new NextRequest('http://localhost/api/public/products/product-1'), {
      params: Promise.resolve({ id: 'product-1' }),
    });
    const product = await res.json();

    expect(res.status).toBe(200);
    expect(product.name_en).toBe('Product 1 (EN)');
  });

  it('returns 404 when the public product does not exist', async () => {
    mocks.getPublicProductById.mockResolvedValue(null);

    const res = await GET_PUBLIC(new NextRequest('http://localhost/api/public/products/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(res.status).toBe(404);
  });

  it('duplicates a product with a new SKU', async () => {
    mocks.duplicateProduct.mockResolvedValue({
      id: 'product-copy',
      sku: 'COPY-001',
    });

    const res = await POST_DUPLICATE(
      new NextRequest('http://localhost/api/products/product-1/duplicate', {
        method: 'POST',
        body: JSON.stringify({ sku: 'COPY-001' }),
      }),
      { params: Promise.resolve({ id: 'product-1' }) }
    );
    const product = await res.json();

    expect(res.status).toBe(200);
    expect(product.sku).toBe('COPY-001');
    expect(mocks.duplicateProduct).toHaveBeenCalledWith('product-1', 'COPY-001', undefined);
    expect(mocks.cachedInvalidateAll).toHaveBeenCalledOnce();
  });
});
