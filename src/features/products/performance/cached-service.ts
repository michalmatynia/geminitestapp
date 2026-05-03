import 'server-only';

// CachedProductService: server-side read-through cache helpers around
// productService. Exposes cached readers and mutation wrappers that
// invalidate relevant cache tags. TTLs are tuned based on query cost.
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductFilters } from '@/shared/contracts/products/drafts';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { productService } from '@/shared/lib/products/services/productService';

import { withQueryCache, ProductCacheHelpers, queryCache, stableStringify } from './query-cache';
import { type ProductFilterInput, normalizeFilters } from './filter-normalization';

const isPagedProductsCacheEntry = (
  value: unknown
): value is { products: ProductWithImages[]; total: number } => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record['products']) &&
    typeof record['total'] === 'number' &&
    Number.isFinite(record['total']) &&
    record['total'] >= 0
  );
};

// Cached database operations for products
export class CachedProductService {
  // Get product by ID with caching
  static getProductById: (id: string) => Promise<ProductWithImages | null> = withQueryCache(
    async (id: string) => productService.getProductById(id),
    {
      keyGenerator: (id: string) => `product:${id}`,
      ttl: 300000, // 5 minutes
      tags: (id: string) => ProductCacheHelpers.getTags.product(id),
    }
  );

  // Get product by SKU with caching
  static getProductBySku: (sku: string) => Promise<ProductWithImages | null> = withQueryCache(
    async (sku: string) => productService.getProductBySku(sku),
    {
      keyGenerator: (sku: string) => `product:sku:${sku}`,
      ttl: 300000, // 5 minutes
      tags: (_sku: string) => ['products:list'],
    }
  );

  // Get products list with filtering and caching
  static getProducts: (filters?: ProductFilterInput) => Promise<ProductWithImages[]> =
    withQueryCache(
      async (filters: ProductFilterInput = {}) => {
        return productService.getProducts(normalizeFilters(filters));
      },
      {
        keyGenerator: (filters: ProductFilterInput = {}) =>
          `products:list:${stableStringify(filters)}`,
        ttl: 180000, // 3 minutes
        tags: (filters: ProductFilterInput = {}) =>
          ProductCacheHelpers.getTags.productList(filters),
      }
    );

  // Get paged products (items + total) with caching
  static getProductsWithCount: (filters?: ProductFilterInput) => Promise<{
    products: ProductWithImages[];
    total: number;
  }> = withQueryCache(
      async (filters: ProductFilterInput = {}) => {
        return productService.getProductsWithCount(normalizeFilters(filters));
      },
      {
        keyGenerator: (filters: ProductFilterInput = {}) =>
          `products:paged:${stableStringify(filters)}`,
        ttl: 180000, // 3 minutes
        tags: (filters: ProductFilterInput = {}) => [
          'products:paged',
          ...ProductCacheHelpers.getTags.productList(filters),
        ],
        validateCached: isPagedProductsCacheEntry,
      }
    );

  // Get product count with caching
  static getProductCount: (filters?: ProductFilterInput) => Promise<number> = withQueryCache(
    async (filters: ProductFilterInput = {}) => {
      return productService.countProducts(normalizeFilters(filters));
    },
    {
      keyGenerator: (filters: ProductFilterInput = {}) =>
        `products:count:${stableStringify(filters)}`,
      ttl: 300000, // 5 minutes
      tags: (filters: ProductFilterInput = {}) => [
        'products:count',
        ...ProductCacheHelpers.getTags.productList(filters),
      ],
    }
  );

  // Get matching product ids with caching
  static getProductIds: (filters?: ProductFilterInput) => Promise<string[]> = withQueryCache(
    async (filters: ProductFilterInput = {}) => {
      const provider = await getProductDataProvider();
      const repository = await getProductRepository(provider);
      return repository.getProductIds(normalizeFilters(filters));
    },
    {
      keyGenerator: (filters: ProductFilterInput = {}) =>
        `products:ids:${stableStringify(filters)}`,
      ttl: 180000, // 3 minutes
      tags: (filters: ProductFilterInput = {}) => [
        'products:ids',
        ...ProductCacheHelpers.getTags.productList(filters),
      ],
    }
  );

  // Get products by category with caching
  static getProductsByCategory: (
    categoryId: string,
    limit?: number
  ) => Promise<ProductWithImages[]> = withQueryCache(
      async (categoryId: string, limit?: number) => {
        const categoryFilters: ProductFilters = {
          categoryId,
        };

        if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
          categoryFilters.pageSize = limit;
        }

        const products = await productService.getProducts(categoryFilters);
        return products;
      },
      {
        keyGenerator: (categoryId: string, limit?: number) =>
          `products:category:${categoryId}:${limit ?? 'all'}`,
        ttl: 240000, // 4 minutes
        tags: (categoryId: string) => [
          ...ProductCacheHelpers.getTags.category(categoryId),
          'products:list',
        ],
      }
    );

  // Get product with images (expensive query)
  static getProductWithImages: (id: string) => Promise<ProductWithImages | null> = withQueryCache(
    async (id: string) => productService.getProductById(id),
    {
      keyGenerator: (id: string) => `product:${id}:with-images`,
      ttl: 600000, // 10 minutes (longer for expensive queries)
      tags: (id: string) => [...ProductCacheHelpers.getTags.product(id), 'images'],
    }
  );

  // Search products with caching
  static searchProducts: (
    query: string,
    filters?: ProductFilterInput
  ) => Promise<ProductWithImages[]> = withQueryCache(
      async (query: string, filters: ProductFilterInput = {}) => {
        return productService.getProducts({
          ...normalizeFilters(filters),
          search: query,
        });
      },
      {
        keyGenerator: (query: string, filters: ProductFilterInput = {}) =>
          `products:search:${query}:${stableStringify(filters)}`,
        ttl: 120000, // 2 minutes (shorter for search results)
        tags: (_query: string, _filters: ProductFilterInput = {}) => [
          'products:search',
          'products:list',
        ],
      }
    );

  // List categories with caching
  static listCategories: (filters: { catalogId: string }) => Promise<unknown[]> = withQueryCache(
    async (filters: { catalogId: string }) => {
      const primaryProvider = await getProductDataProvider();
      const repository = await import('@/shared/lib/products/services/category-repository').then(
        (m) => m.getCategoryRepository(primaryProvider)
      );
      return repository.listCategories(filters);
    },
    {
      keyGenerator: (filters: { catalogId: string }) => `categories:list:${filters.catalogId}`,
      ttl: 300000, // 5 minutes
      tags: (filters: { catalogId: string }) => [
        `categories:list:${filters.catalogId}`,
        'categories:list',
      ],
    }
  );

  // List parameters with caching
  static listParameters: (filters: { catalogId: string }) => Promise<ProductParameter[]> =
    withQueryCache(
      async (filters: { catalogId: string }) => {
        const primaryProvider = await getProductDataProvider();
        const repository = await import('@/shared/lib/products/services/parameter-repository').then(
          (m) => m.getParameterRepository(primaryProvider)
        );
        return repository.listParameters(filters);
      },
      {
        keyGenerator: (filters: { catalogId: string }) => `parameters:list:${filters.catalogId}`,
        ttl: 300000, // 5 minutes
        tags: (filters: { catalogId: string }) => [
          `parameters:list:${filters.catalogId}`,
          'parameters:list',
        ],
      }
    );

  static listCustomFields: () => Promise<ProductCustomFieldDefinition[]> = withQueryCache(
    async () => {
      const primaryProvider = await getProductDataProvider();
      const repository = await import('@/shared/lib/products/services/custom-field-repository').then(
        (m) => m.getCustomFieldRepository(primaryProvider)
      );
      return repository.listCustomFields({});
    },
    {
      keyGenerator: () => 'custom-fields:list',
      ttl: 300000,
      tags: () => ['custom-fields:list'],
    }
  );

  // Get category tree with caching
  static getCategoryTree: (catalogId: string) => Promise<unknown[]> = withQueryCache(
    async (catalogId: string) => {
      const primaryProvider = await getProductDataProvider();
      const repository = await import('@/shared/lib/products/services/category-repository').then(
        (m) => m.getCategoryRepository(primaryProvider)
      );
      return repository.getCategoryTree(catalogId);
    },
    {
      keyGenerator: (catalogId: string) => `categories:tree:${catalogId}`,
      ttl: 300000, // 5 minutes
      tags: (catalogId: string) => [`categories:tree:${catalogId}`, 'categories:list'],
    }
  );

  // Cache invalidation methods
  static invalidateProduct(productId: string): void {
    ProductCacheHelpers.invalidateProduct(productId);
  }

  static invalidateCategory(categoryId: string): void {
    ProductCacheHelpers.invalidateCategory(categoryId);
  }

  static invalidateAll(): void {
    ProductCacheHelpers.invalidateAll();
    queryCache.invalidateByTag('categories:list');
    queryCache.invalidateByPattern(/^categories:/);
    queryCache.invalidateByTag('custom-fields:list');
    queryCache.invalidateByPattern(/^custom-fields:/);
    queryCache.invalidateByTag('parameters:list');
    queryCache.invalidateByPattern(/^parameters:/);
  }
}
