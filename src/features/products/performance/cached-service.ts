import 'server-only';

import { productService } from '@/features/products/services/productService';
import type { ProductWithImages } from '@/features/products/types';
import type { ProductFilters } from '@/features/products/types/services/product-repository';

import { withQueryCache, ProductCacheHelpers, queryCache } from './query-cache';

type ProductFilterInput = Record<string, unknown>;

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeFilters(filters: ProductFilterInput = {}): ProductFilters {
  const pageSize = toOptionalNumber(filters['pageSize']) ?? toOptionalNumber(filters['limit']);
  let page = toOptionalNumber(filters['page']);

  // Support offset+limit payloads used by API v2.
  if (!page && pageSize) {
    const offsetRaw = toOptionalNumber(filters['offset']);
    if (offsetRaw !== undefined) {
      page = Math.floor(offsetRaw / pageSize) + 1;
    }
  }

  const normalized: ProductFilters = {};
  const search = toOptionalString(filters['search']);
  const sku = toOptionalString(filters['sku']);
  const minPrice = toOptionalNumber(filters['minPrice']);
  const maxPrice = toOptionalNumber(filters['maxPrice']);
  const startDate = toOptionalString(filters['startDate']);
  const endDate = toOptionalString(filters['endDate']);
  const catalogId = toOptionalString(filters['catalogId']);
  const searchLanguage = toOptionalString(filters['searchLanguage']);

  if (search !== undefined) normalized.search = search;
  if (sku !== undefined) normalized.sku = sku;
  if (minPrice !== undefined) normalized.minPrice = minPrice;
  if (maxPrice !== undefined) normalized.maxPrice = maxPrice;
  if (startDate !== undefined) normalized.startDate = startDate;
  if (endDate !== undefined) normalized.endDate = endDate;
  if (page !== undefined) normalized.page = page;
  if (pageSize !== undefined) normalized.pageSize = pageSize;
  if (catalogId !== undefined) normalized.catalogId = catalogId;
  if (searchLanguage !== undefined) normalized.searchLanguage = searchLanguage as any;

  return normalized;
}

// Cached database operations for products
export class CachedProductService {
  
  // Get product by ID with caching
  static getProductById: (id: string) => Promise<ProductWithImages | null> = withQueryCache(
    async (id: string) => productService.getProductById(id),
    {
      keyGenerator: (id: string) => `product:${id}`,
      ttl: 300000, // 5 minutes
      tags: (id: string) => ProductCacheHelpers.getTags.product(id)
    }
  );

  // Get product by SKU with caching
  static getProductBySku: (sku: string) => Promise<ProductWithImages | null> = withQueryCache(
    async (sku: string) => productService.getProductBySku(sku),
    {
      keyGenerator: (sku: string) => `product:sku:${sku}`,
      ttl: 300000, // 5 minutes
      tags: (_sku: string) => ['products:list']
    }
  );

  // Get products list with filtering and caching
  static getProducts: (filters?: ProductFilterInput) => Promise<ProductWithImages[]> = withQueryCache(
    async (filters: ProductFilterInput = {}) => {
      return productService.getProducts(normalizeFilters(filters));
    },
    {
      keyGenerator: (filters: ProductFilterInput = {}) => `products:list:${JSON.stringify(filters)}`,
      ttl: 180000, // 3 minutes
      tags: (filters: ProductFilterInput = {}) => ProductCacheHelpers.getTags.productList(filters)
    }
  );

  // Get product count with caching
  static getProductCount: (filters?: ProductFilterInput) => Promise<number> = withQueryCache(
    async (filters: ProductFilterInput = {}) => {
      return productService.countProducts(normalizeFilters(filters));
    },
    {
      keyGenerator: (filters: ProductFilterInput = {}) => `products:count:${JSON.stringify(filters)}`,
      ttl: 300000, // 5 minutes
      tags: (filters: ProductFilterInput = {}) => ['products:count', ...ProductCacheHelpers.getTags.productList(filters)]
    }
  );

  // Get products by category with caching
  static getProductsByCategory: (categoryId: string, limit?: number) => Promise<ProductWithImages[]> = withQueryCache(
    async (categoryId: string, limit?: number) => {
      const categoryFilters: ProductFilters = {};
      if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
        categoryFilters.pageSize = limit;
      }
      const products = await productService.getProducts(categoryFilters);
      const filtered = products.filter(
        (product: ProductWithImages) =>
          typeof product.categoryId === 'string' && product.categoryId === categoryId
      );
      return typeof limit === 'number' && limit > 0
        ? filtered.slice(0, limit)
        : filtered;
    },
    {
      keyGenerator: (categoryId: string, limit?: number) => `products:category:${categoryId}:${limit || 'all'}`,
      ttl: 240000, // 4 minutes
      tags: (categoryId: string) => [
        ...ProductCacheHelpers.getTags.category(categoryId),
        'products:list'
      ]
    }
  );

  // Get product with images (expensive query)
  static getProductWithImages: (id: string) => Promise<ProductWithImages | null> = withQueryCache(
    async (id: string) => productService.getProductById(id),
    {
      keyGenerator: (id: string) => `product:${id}:with-images`,
      ttl: 600000, // 10 minutes (longer for expensive queries)
      tags: (id: string) => [...ProductCacheHelpers.getTags.product(id), 'images']
    }
  );

  // Search products with caching
  static searchProducts: (query: string, filters?: ProductFilterInput) => Promise<ProductWithImages[]> = withQueryCache(
    async (query: string, filters: ProductFilterInput = {}) => {
      return productService.getProducts({
        ...normalizeFilters(filters),
        search: query,
      });
    },
    {
      keyGenerator: (query: string, filters: ProductFilterInput = {}) => `products:search:${query}:${JSON.stringify(filters)}`,
      ttl: 120000, // 2 minutes (shorter for search results)
      tags: (_query: string, _filters: ProductFilterInput = {}) => ['products:search', 'products:list']
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
  }
}

// Middleware for automatic cache invalidation
export function withCacheInvalidation<TArgs extends unknown[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
  invalidationStrategy: {
    tags?: (...args: TArgs) => string[];
    patterns?: (...args: TArgs) => RegExp[];
    custom?: (...args: TArgs) => void;
  }
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const result = await mutationFn(...args);
    
    // Invalidate by tags
    if (invalidationStrategy.tags) {
      const tags = invalidationStrategy.tags(...args);
      tags.forEach((tag: string) => queryCache.invalidateByTag(tag));
    }
    
    // Invalidate by patterns
    if (invalidationStrategy.patterns) {
      const patterns = invalidationStrategy.patterns(...args);
      patterns.forEach((pattern: RegExp) => {
        queryCache.invalidateByPattern(pattern);
      });
    }
    
    // Custom invalidation
    if (invalidationStrategy.custom) {
      invalidationStrategy.custom(...args);
    }
    
    return result;
  };
}

// Product mutation operations with cache invalidation
export class CachedProductMutations {
  
  static createProduct: (data: Record<string, unknown>) => Promise<null> = withCacheInvalidation(
    async (_data: Record<string, unknown>): Promise<null> => {
      // const product = await db.product.create({ data });
      // return product;
      return Promise.resolve(null); // Placeholder
    },
    {
      tags: () => ['products:list', 'products:count'],
      custom: () => ProductCacheHelpers.invalidateAll()
    }
  );

  static updateProduct: (id: string, data: Record<string, unknown>) => Promise<null> = withCacheInvalidation(
    async (_id: string, _data: Record<string, unknown>): Promise<null> => {
      // const product = await db.product.update({ where: { id }, data });
      // return product;
      return Promise.resolve(null); // Placeholder
    },
    {
      tags: (id: string) => ProductCacheHelpers.getTags.product(id),
      custom: (id: string) => ProductCacheHelpers.invalidateProduct(id)
    }
  );

  static deleteProduct: (id: string) => Promise<null> = withCacheInvalidation(
    async (_id: string): Promise<null> => {
      // const product = await db.product.delete({ where: { id } });
      // return product;
      return Promise.resolve(null); // Placeholder
    },
    {
      tags: (id: string) => ProductCacheHelpers.getTags.product(id),
      custom: (id: string) => {
        ProductCacheHelpers.invalidateProduct(id);
        ProductCacheHelpers.invalidateAll();
      }
    }
  );
}
