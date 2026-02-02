import { withQueryCache, ProductCacheHelpers } from './query-cache';

// Cached database operations for products
export class CachedProductService {
  
  // Get product by ID with caching
  static getProductById = withQueryCache(
    async (_id: string) => {
      // This would be your actual database query
      // const product = await db.product.findUnique({ where: { id } });
      // return product;
      return null; // Placeholder
    },
    {
      keyGenerator: (id: string) => `product:${id}`,
      ttl: 300000, // 5 minutes
      tags: (id: string) => ProductCacheHelpers.getTags.product(id)
    }
  );

  // Get products list with filtering and caching
  static getProducts = withQueryCache(
    async (_filters: Record<string, unknown> = {}) => {
      // const products = await db.product.findMany({ where: filters });
      // return products;
      return []; // Placeholder
    },
    {
      keyGenerator: (filters: Record<string, unknown>) => `products:list:${JSON.stringify(filters)}`,
      ttl: 180000, // 3 minutes
      tags: (filters: Record<string, unknown>) => ProductCacheHelpers.getTags.productList(filters)
    }
  );

  // Get product count with caching
  static getProductCount = withQueryCache(
    async (_filters: Record<string, unknown> = {}) => {
      // const count = await db.product.count({ where: filters });
      // return count;
      return 0; // Placeholder
    },
    {
      keyGenerator: (filters: Record<string, unknown>) => `products:count:${JSON.stringify(filters)}`,
      ttl: 300000, // 5 minutes
      tags: (filters: Record<string, unknown>) => ['products:count', ...ProductCacheHelpers.getTags.productList(filters)]
    }
  );

  // Get products by category with caching
  static getProductsByCategory = withQueryCache(
    async (categoryId: string, limit?: number) => {
      // const products = await db.product.findMany({
      //   where: { categories: { some: { categoryId } } },
      //   take: limit
      // });
      // return products;
      return []; // Placeholder
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
    async (id: string) => {
      // const product = await db.product.findUnique({
      //   where: { id },
      //   include: { images: { include: { imageFile: true } } }
      // });
      // return product;
      return null; // Placeholder
    },
    {
      keyGenerator: (id: string) => `product:${id}:with-images`,
      ttl: 600000, // 10 minutes (longer for expensive queries)
      tags: (id: string) => [...ProductCacheHelpers.getTags.product(id), 'images']
    }
  );

  // Search products with caching
  static searchProducts = withQueryCache(
    async (query: string, filters: Record<string, unknown> = {}) => {
      // const products = await db.product.findMany({
      //   where: {
      //     OR: [
      //       { name_en: { contains: query, mode: 'insensitive' } },
      //       { sku: { contains: query, mode: 'insensitive' } }
      //     ],
      //     ...filters
      //   }
      // });
      // return products;
      return []; // Placeholder
    },
    {
      keyGenerator: (query: string, filters: Record<string, unknown>) => `products:search:${query}:${JSON.stringify(filters)}`,
      ttl: 120000, // 2 minutes (shorter for search results)
      tags: (query: string, filters: Record<string, unknown>) => ['products:search', 'products:list']
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
    async (id: string, _data: Record<string, unknown>) => {
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
    async (id: string) => {
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