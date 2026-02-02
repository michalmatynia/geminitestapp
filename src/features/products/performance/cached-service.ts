import "server-only";

import { productService } from "@/features/products/services/productService";
import type { ProductFilters } from "@/features/products/types/services/product-repository";
import type { ProductWithImages } from "@/features/products/types";
import { withQueryCache, ProductCacheHelpers } from './query-cache';

type ProductFilterInput = Record<string, unknown>;

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function normalizeFilters(filters: ProductFilterInput = {}): ProductFilters {
  const pageSize = toOptionalString(filters.pageSize) ?? toOptionalString(filters.limit);
  let page = toOptionalString(filters.page);

  // Support offset+limit payloads used by API v2.
  if (!page && pageSize) {
    const offsetRaw = toOptionalString(filters.offset);
    if (offsetRaw) {
      const parsedPageSize = Number(pageSize);
      const parsedOffset = Number(offsetRaw);
      if (
        Number.isFinite(parsedPageSize) &&
        parsedPageSize > 0 &&
        Number.isFinite(parsedOffset) &&
        parsedOffset >= 0
      ) {
        page = String(Math.floor(parsedOffset / parsedPageSize) + 1);
      }
    }
  }

  const normalized: ProductFilters = {};
  const search = toOptionalString(filters.search);
  const sku = toOptionalString(filters.sku);
  const minPrice = toOptionalString(filters.minPrice);
  const maxPrice = toOptionalString(filters.maxPrice);
  const startDate = toOptionalString(filters.startDate);
  const endDate = toOptionalString(filters.endDate);
  const catalogId = toOptionalString(filters.catalogId);
  const searchLanguage = toOptionalString(filters.searchLanguage);

  if (search !== undefined) normalized.search = search;
  if (sku !== undefined) normalized.sku = sku;
  if (minPrice !== undefined) normalized.minPrice = minPrice;
  if (maxPrice !== undefined) normalized.maxPrice = maxPrice;
  if (startDate !== undefined) normalized.startDate = startDate;
  if (endDate !== undefined) normalized.endDate = endDate;
  if (page !== undefined) normalized.page = page;
  if (pageSize !== undefined) normalized.pageSize = pageSize;
  if (catalogId !== undefined) normalized.catalogId = catalogId;
  if (searchLanguage !== undefined) normalized.searchLanguage = searchLanguage;

  return normalized;
}

// Cached database operations for products
export class CachedProductService {
  
  // Get product by ID with caching
  static getProductById = withQueryCache(
    async (id: string) => productService.getProductById(id),
    {
      keyGenerator: (id: string) => `product:${id}`,
      ttl: 300000, // 5 minutes
      tags: (id: string) => ProductCacheHelpers.getTags.product(id)
    }
  );

  // Get product by SKU with caching
  static getProductBySku = withQueryCache(
    async (sku: string) => productService.getProductBySku(sku),
    {
      keyGenerator: (sku: string) => `product:sku:${sku}`,
      ttl: 300000, // 5 minutes
      tags: (_sku: string) => ["products:list"]
    }
  );

  // Get products list with filtering and caching
  static getProducts = withQueryCache(
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
  static getProductCount = withQueryCache(
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
  static getProductsByCategory = withQueryCache(
    async (categoryId: string, limit?: number) => {
      const categoryFilters: ProductFilters = {};
      if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
        categoryFilters.pageSize = String(limit);
      }
      const products = await productService.getProducts(categoryFilters);
      const filtered = products.filter(
        (product: ProductWithImages) =>
          Array.isArray(product.categories) &&
          product.categories.some((entry: { categoryId: string }) => entry.categoryId === categoryId)
      );
      return typeof limit === "number" && limit > 0
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
  static getProductWithImages = withQueryCache(
    async (id: string) => productService.getProductById(id),
    {
      keyGenerator: (id: string) => `product:${id}:with-images`,
      ttl: 600000, // 10 minutes (longer for expensive queries)
      tags: (id: string) => [...ProductCacheHelpers.getTags.product(id), 'images']
    }
  );

  // Search products with caching
  static searchProducts = withQueryCache(
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
  static invalidateProduct(productId: string) {
    ProductCacheHelpers.invalidateProduct(productId);
  }

  static invalidateCategory(categoryId: string) {
    ProductCacheHelpers.invalidateCategory(categoryId);
  }

  static invalidateAll() {
    ProductCacheHelpers.invalidateAll();
  }
}

// Middleware for automatic cache invalidation
export function withCacheInvalidation<T extends (...args: any[]) => Promise<unknown>>(
  mutationFn: T,
  invalidationStrategy: {
    tags?: (...args: Parameters<T>) => string[];
    patterns?: (...args: Parameters<T>) => RegExp[];
    custom?: (...args: Parameters<T>) => void;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const result = await mutationFn(...args);
    
    // Invalidate by tags
    if (invalidationStrategy.tags) {
      const tags = invalidationStrategy.tags(...args);
      tags.forEach(tag => ProductCacheHelpers.invalidateProduct(tag));
    }
    
    // Invalidate by patterns
    if (invalidationStrategy.patterns) {
      const patterns = invalidationStrategy.patterns(...args);
      patterns.forEach(_pattern => {
        // queryCache.invalidateByPattern(pattern);
      });
    }
    
    // Custom invalidation
    if (invalidationStrategy.custom) {
      invalidationStrategy.custom(...args);
    }
    
    return result;
  }) as T;
}

// Product mutation operations with cache invalidation
export class CachedProductMutations {
  
  static createProduct = withCacheInvalidation(
    async (_data: Record<string, unknown>) => {
      // const product = await db.product.create({ data });
      // return product;
      return null; // Placeholder
    },
    {
      tags: () => ['products:list', 'products:count'],
      custom: () => ProductCacheHelpers.invalidateAll()
    }
  );

  static updateProduct = withCacheInvalidation(
    async (_id: string, _data: Record<string, unknown>) => {
      // const product = await db.product.update({ where: { id }, data });
      // return product;
      return null; // Placeholder
    },
    {
      tags: (id: string) => ProductCacheHelpers.getTags.product(id),
      custom: (id: string) => ProductCacheHelpers.invalidateProduct(id)
    }
  );

  static deleteProduct = withCacheInvalidation(
    async (_id: string) => {
      // const product = await db.product.delete({ where: { id } });
      // return product;
      return null; // Placeholder
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
