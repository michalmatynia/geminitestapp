/**
 * Integration tests: CachedProductMutations → cache invalidation.
 *
 * These tests use the real QueryCache singleton and real withCacheInvalidation
 * middleware, mocking only the underlying productService transport layer.
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Must be mocked before any server-only imports are resolved
vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: vi.fn(),
}));
vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    getProductById: vi.fn(),
    getProducts: vi.fn(),
    getProductsWithCount: vi.fn(),
    countProducts: vi.fn(),
    getProductBySku: vi.fn(),
    getProductsBySkus: vi.fn(),
    findProductByBaseId: vi.fn(),
    findProductsByBaseIds: vi.fn(),
  },
}));

import { queryCache, ProductCacheHelpers } from '@/features/products/performance/query-cache';
import { CachedProductMutations, CachedProductService, withCacheInvalidation } from '@/features/products/server';
import { productService } from '@/shared/lib/products/services/productService';

const createProductMock = productService.createProduct as ReturnType<typeof vi.fn>;
const updateProductMock = productService.updateProduct as ReturnType<typeof vi.fn>;
const deleteProductMock = productService.deleteProduct as ReturnType<typeof vi.fn>;
const getProductsWithCountMock = productService.getProductsWithCount as ReturnType<typeof vi.fn>;

const PRODUCT_ID = 'prod-abc-123';

const mockProduct = {
  id: PRODUCT_ID,
  sku: 'TEST-001',
  name_en: 'Test Product',
  name_pl: null,
  name_de: null,
  price: 10,
  stock: 5,
  images: [],
  catalogs: [],
  tags: [],
  producers: [],
  parameters: [],
  imageLinks: [],
  imageBase64s: [],
  noteIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// -----------------------------------------------------------------------
// withCacheInvalidation middleware
// -----------------------------------------------------------------------

describe('withCacheInvalidation', () => {
  beforeEach(() => queryCache.clear());

  it('calls the underlying mutation and returns its result', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const wrapped = withCacheInvalidation(fn, {});
    const result = await wrapped('arg1', 'arg2');
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(result).toBe('ok');
  });

  it('invalidates cache entries by tag after mutation succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('done');
    const wrapped = withCacheInvalidation(fn, {
      tags: () => ['my-tag'],
    });
    queryCache.set('q1', [], 'cached', { tags: ['my-tag'] });
    expect(queryCache.get('q1', [])).toBe('cached');

    await wrapped();

    expect(queryCache.get('q1', [])).toBeNull();
  });

  it('invalidates cache entries by pattern after mutation succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('done');
    const wrapped = withCacheInvalidation(fn, {
      // Must use the internal key format: generateKey prefixes with "query:"
      patterns: () => [/^query:products:/],
    });
    queryCache.set('products:list:{}', [], ['p1'], { tags: ['products:list'] });
    queryCache.set('products:count:{}', [], 5, { tags: ['products:count'] });
    queryCache.set('categories:list', [], ['c1'], { tags: ['categories:list'] });

    await wrapped();

    expect(queryCache.get('products:list:{}', [])).toBeNull();
    expect(queryCache.get('products:count:{}', [])).toBeNull();
    // Unrelated entry survives
    expect(queryCache.get('categories:list', [])).toEqual(['c1']);
  });

  it('does NOT invalidate when mutation throws', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const wrapped = withCacheInvalidation(fn, {
      tags: () => ['protected-tag'],
    });
    queryCache.set('still-here', [], 'value', { tags: ['protected-tag'] });

    await expect(wrapped()).rejects.toThrow('fail');

    expect(queryCache.get('still-here', [])).toBe('value');
  });

  it('calls custom invalidation logic after mutation succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('done');
    const custom = vi.fn();
    const wrapped = withCacheInvalidation(fn, { custom });

    await wrapped('x', 'y');

    expect(custom).toHaveBeenCalledWith('x', 'y');
  });
});

// -----------------------------------------------------------------------
// CachedProductMutations — end-to-end cache invalidation
// -----------------------------------------------------------------------

describe('CachedProductMutations', () => {
  beforeEach(() => {
    queryCache.clear();
    createProductMock.mockReset();
    updateProductMock.mockReset();
    deleteProductMock.mockReset();
    getProductsWithCountMock.mockReset();
  });

  // ── createProduct ────────────────────────────────────────────────────

  describe('createProduct', () => {
    it('returns the created product from the service', async () => {
      createProductMock.mockResolvedValue(mockProduct);
      const result = await CachedProductMutations.createProduct({ sku: 'NEW-001' });
      expect(result).toEqual(mockProduct);
    });

    it('invalidates products:list-tagged cache entries', async () => {
      createProductMock.mockResolvedValue(mockProduct);
      queryCache.set('products:list:{}', [], [mockProduct], { tags: ['products:list'] });

      await CachedProductMutations.createProduct({ sku: 'NEW-001' });

      expect(queryCache.get('products:list:{}', [])).toBeNull();
    });

    it('invalidates products:count-tagged cache entries', async () => {
      createProductMock.mockResolvedValue(mockProduct);
      queryCache.set('products:count:{}', [], 5, { tags: ['products:count'] });

      await CachedProductMutations.createProduct({ sku: 'NEW-001' });

      expect(queryCache.get('products:count:{}', [])).toBeNull();
    });

    it('calls productService.createProduct with the provided data', async () => {
      createProductMock.mockResolvedValue(mockProduct);
      const data = { sku: 'CREATE-001', name_en: 'New' };

      await CachedProductMutations.createProduct(data);

      expect(createProductMock).toHaveBeenCalledWith(data);
    });
  });

  // ── updateProduct ────────────────────────────────────────────────────

  describe('updateProduct', () => {
    it('returns the updated product from the service', async () => {
      const updated = { ...mockProduct, name_en: 'Renamed' };
      updateProductMock.mockResolvedValue(updated);

      const result = await CachedProductMutations.updateProduct(PRODUCT_ID, { name_en: 'Renamed' });

      expect(result).toEqual(updated);
    });

    it('invalidates the product-specific tag after update', async () => {
      updateProductMock.mockResolvedValue(mockProduct);
      queryCache.set(`product:${PRODUCT_ID}`, [], mockProduct, {
        tags: [`product:${PRODUCT_ID}`],
      });

      await CachedProductMutations.updateProduct(PRODUCT_ID, { name_en: 'X' });

      expect(queryCache.get(`product:${PRODUCT_ID}`, [])).toBeNull();
    });

    it('invalidates the products:list tag after update', async () => {
      updateProductMock.mockResolvedValue(mockProduct);
      queryCache.set('products:list:{}', [], [mockProduct], { tags: ['products:list'] });

      await CachedProductMutations.updateProduct(PRODUCT_ID, { name_en: 'X' });

      expect(queryCache.get('products:list:{}', [])).toBeNull();
    });

    it('leaves unrelated cache entries intact', async () => {
      updateProductMock.mockResolvedValue(mockProduct);
      queryCache.set('categories:list', [], ['cat1'], { tags: ['categories:list'] });

      await CachedProductMutations.updateProduct(PRODUCT_ID, {});

      expect(queryCache.get('categories:list', [])).toEqual(['cat1']);
    });
  });

  // ── deleteProduct ────────────────────────────────────────────────────

  describe('deleteProduct', () => {
    it('returns the deleted product record from the service', async () => {
      deleteProductMock.mockResolvedValue(mockProduct);

      const result = await CachedProductMutations.deleteProduct(PRODUCT_ID);

      expect(result).toEqual(mockProduct);
    });

    it('invalidates the product-specific tag after delete', async () => {
      deleteProductMock.mockResolvedValue(mockProduct);
      queryCache.set(`product:${PRODUCT_ID}:with-images`, [], mockProduct, {
        tags: [`product:${PRODUCT_ID}`],
      });

      await CachedProductMutations.deleteProduct(PRODUCT_ID);

      expect(queryCache.get(`product:${PRODUCT_ID}:with-images`, [])).toBeNull();
    });

    it('invalidates products:list-tagged entries after delete', async () => {
      deleteProductMock.mockResolvedValue(mockProduct);
      queryCache.set('products:list:{}', [], [mockProduct], { tags: ['products:list'] });

      await CachedProductMutations.deleteProduct(PRODUCT_ID);

      expect(queryCache.get('products:list:{}', [])).toBeNull();
    });
  });

  // ── ProductCacheHelpers ──────────────────────────────────────────────

  describe('ProductCacheHelpers', () => {
    it('invalidateProduct clears product-specific and list entries', () => {
      queryCache.set(`product:${PRODUCT_ID}`, [], mockProduct, {
        tags: [`product:${PRODUCT_ID}`],
      });
      queryCache.set('products:list:{}', [], [mockProduct], { tags: ['products:list'] });

      ProductCacheHelpers.invalidateProduct(PRODUCT_ID);

      expect(queryCache.get(`product:${PRODUCT_ID}`, [])).toBeNull();
      expect(queryCache.get('products:list:{}', [])).toBeNull();
    });

    it('invalidateAll clears query-prefixed product cache entries and keeps unrelated keys', () => {
      queryCache.set('products:list:{}', [], ['p1'], { tags: ['products:list'] });
      queryCache.set('products:count:{}', [], 3, { tags: ['products:count'] });
      queryCache.set('products:paged:{}', [], { products: ['p1'], total: 1 }, {
        tags: ['products:paged', 'products:list'],
      });
      queryCache.set('categories:list', [], ['c1'], { tags: ['categories:list'] });

      ProductCacheHelpers.invalidateAll();

      const listAfter = queryCache.get('products:list:{}', []);
      const countAfter = queryCache.get('products:count:{}', []);
      const pagedAfter = queryCache.get('products:paged:{}', []);
      const categoriesAfter = queryCache.get('categories:list', []);

      expect(listAfter).toBeNull();
      expect(countAfter).toBeNull();
      expect(pagedAfter).toBeNull();
      expect(categoriesAfter).toEqual(['c1']);
    });
  });
});

describe('CachedProductService', () => {
  beforeEach(() => {
    queryCache.clear();
    getProductsWithCountMock.mockReset();
  });

  it('refreshes invalid paged cache entries that are missing total', async () => {
    queryCache.set('products:paged:{}', [], { products: [mockProduct] }, {
      tags: ['products:paged', 'products:list'],
    });
    getProductsWithCountMock.mockResolvedValue({
      products: [mockProduct],
      total: 1,
    });

    const result = await CachedProductService.getProductsWithCount({});
    const secondResult = await CachedProductService.getProductsWithCount({});

    expect(result).toEqual({
      products: [mockProduct],
      total: 1,
    });
    expect(secondResult).toEqual(result);
    expect(getProductsWithCountMock).toHaveBeenCalledTimes(1);
    expect(queryCache.get('products:paged:{}', [])).toEqual({
      products: [mockProduct],
      total: 1,
    });
  });
});
