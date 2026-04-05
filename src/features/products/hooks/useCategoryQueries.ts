import type { ProductCategory, ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { ListQuery } from '@/shared/contracts/ui/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

import {
  type ProductMetadataQueryOptions,
  useCategories as useMetadataCategories,
} from './useProductMetadataQueries';

/**
 * Hook to fetch product categories for a catalog
 */
export function useProductCategories(
  catalogId?: string,
  options?: ProductMetadataQueryOptions
): ListQuery<ProductCategory> {
  return useMetadataCategories(catalogId, options);
}

/**
 * Hook to fetch product category tree for a catalog
 */
export function useProductCategoryTree(catalogId?: string): ListQuery<ProductCategoryWithChildren> {
  const queryKey = productSettingsKeys.categoryTree(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductCategoryWithChildren[]> => {
      if (!catalogId) return [];
      return await api.get<ProductCategoryWithChildren[]>(
        `/api/v2/products/categories/tree?catalogId=${encodeURIComponent(catalogId)}`,
        { cache: 'no-store' }
      );
    },
    enabled: !!catalogId,
    meta: {
      source: 'products.hooks.useProductCategoryTree',
      operation: 'list',
      resource: 'products.settings.categories.tree',
      domain: 'products',
      queryKey,
      tags: ['products', 'categories', 'tree'],
      description: 'Loads products settings categories tree.'},
  });
}
