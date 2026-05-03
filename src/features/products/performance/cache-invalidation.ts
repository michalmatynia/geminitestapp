import type { ProductRecord, ProductWithImages } from '@/shared/contracts/products/product';
import { productService } from '@/shared/lib/products/services/productService';

import { ProductCacheHelpers, queryCache } from './query-cache';

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

    if (invalidationStrategy.tags) {
      const tags = invalidationStrategy.tags(...args);
      tags.forEach((tag: string) => queryCache.invalidateByTag(tag));
    }

    if (invalidationStrategy.patterns) {
      const patterns = invalidationStrategy.patterns(...args);
      patterns.forEach((pattern: RegExp) => {
        queryCache.invalidateByPattern(pattern);
      });
    }

    if (invalidationStrategy.custom) {
      invalidationStrategy.custom(...args);
    }

    return result;
  };
}

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
