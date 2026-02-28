'use client';

import type { ProductCategory, ProductCategoryWithChildren } from '@/shared/contracts/products';
import type { ListQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';

import { useCategories as useMetadataCategories } from './useProductMetadataQueries';

/**
 * Hook to fetch product categories for a catalog
 */
export function useProductCategories(catalogId?: string): ListQuery<ProductCategory> {
  return useMetadataCategories(catalogId);
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
        `/api/products/categories/tree?catalogId=${encodeURIComponent(catalogId)}&fresh=1`,
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
    },
  });
}
