import 'server-only';

import type { UnknownRecordDto } from '@/shared/contracts/base';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductWithImages, ProductRecord } from '@/shared/contracts/products/product';
import type { ProductFilters } from '@/shared/contracts/products/drafts';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { productService } from '@/shared/lib/products/services/productService';

import { withQueryCache, ProductCacheHelpers, queryCache, stableStringify } from './query-cache';

type ProductFilterInput = UnknownRecordDto;

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

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
}

function isValidLanguageCode(code?: string): code is 'name_en' | 'name_pl' | 'name_de' {
  return code === 'name_en' || code === 'name_pl' || code === 'name_de';
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
  const id = toOptionalString(filters['id']);
  const idMatchModeRaw = toOptionalString(filters['idMatchMode']);
  const sku = toOptionalString(filters['sku']);
  const categoryId = toOptionalString(filters['categoryId']);
  const minPrice = toOptionalNumber(filters['minPrice']);
  const maxPrice = toOptionalNumber(filters['maxPrice']);
  const stockValue = toOptionalNumber(filters['stockValue']);
  const stockOperatorRaw = toOptionalString(filters['stockOperator']);
  const startDate = toOptionalString(filters['startDate']);
  const endDate = toOptionalString(filters['endDate']);
  const advancedFilter = toOptionalString(filters['advancedFilter']);
  const catalogId = toOptionalString(filters['catalogId']);
  const searchLanguage = toOptionalString(filters['searchLanguage']);
  const baseExported = toOptionalBoolean(filters['baseExported']);
  const archived = toOptionalBoolean(filters['archived']);

  if (search !== undefined) normalized.search = search;
  if (id !== undefined) normalized.id = id;
  if (idMatchModeRaw === 'exact' || idMatchModeRaw === 'partial') {
    normalized.idMatchMode = idMatchModeRaw;
  }
  if (sku !== undefined) normalized.sku = sku;
  if (categoryId !== undefined) normalized.categoryId = categoryId;
  if (minPrice !== undefined) normalized.minPrice = minPrice;
  if (maxPrice !== undefined) normalized.maxPrice = maxPrice;
  if (stockValue !== undefined) normalized.stockValue = stockValue;
  if (
    stockOperatorRaw === 'gt' ||
    stockOperatorRaw === 'gte' ||
    stockOperatorRaw === 'lt' ||
    stockOperatorRaw === 'lte' ||
    stockOperatorRaw === 'eq'
  ) {
    normalized.stockOperator = stockOperatorRaw;
  }
  if (startDate !== undefined) normalized.startDate = startDate;
  if (endDate !== undefined) normalized.endDate = endDate;
  if (advancedFilter !== undefined) normalized.advancedFilter = advancedFilter;
  if (page !== undefined) normalized.page = page;
  if (pageSize !== undefined) normalized.pageSize = pageSize;
  if (catalogId !== undefined) normalized.catalogId = catalogId;
  if (isValidLanguageCode(searchLanguage)) normalized.searchLanguage = searchLanguage;
  if (baseExported !== undefined) normalized.baseExported = baseExported;
  if (archived !== undefined) normalized.archived = archived;

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
          `products:category:${categoryId}:${limit || 'all'}`,
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
  static createProduct: (data: unknown) => Promise<ProductWithImages> = withCacheInvalidation(
    async (data: unknown): Promise<ProductWithImages> => {
      return productService.createProduct(data);
    },
    {
      tags: () => ['products:list', 'products:count'],
      custom: () => ProductCacheHelpers.invalidateAll(),
    }
  );

  static updateProduct: (id: string, data: Record<string, unknown>) => Promise<ProductWithImages> =
    withCacheInvalidation(
      async (id: string, data: Record<string, unknown>): Promise<ProductWithImages> => {
        return productService.updateProduct(id, data);
      },
      {
        tags: (id: string) => ProductCacheHelpers.getTags.product(id),
        custom: (id: string) => ProductCacheHelpers.invalidateProduct(id),
      }
    );

  static deleteProduct: (id: string) => Promise<ProductRecord | null> = withCacheInvalidation(
    async (id: string): Promise<ProductRecord | null> => {
      return productService.deleteProduct(id);
    },
    {
      tags: (id: string) => ProductCacheHelpers.getTags.product(id),
      custom: (id: string) => {
        ProductCacheHelpers.invalidateProduct(id);
        ProductCacheHelpers.invalidateAll();
      },
    }
  );
}
