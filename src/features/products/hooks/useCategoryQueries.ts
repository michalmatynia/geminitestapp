'use client';

import type { ProductCategory, ProductCategoryWithChildren } from '@/features/products/types';
import { api } from '@/shared/lib/api-client';
import { createListQuery } from '@/shared/lib/query-factories';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';
import type { ListQuery } from '@/shared/types/query-result-types';

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
  return createListQuery({
    queryKey: productSettingsKeys.categoryTree(catalogId ?? null),
    queryFn: async (): Promise<ProductCategoryWithChildren[]> => {
      if (!catalogId) return [];
      return await api.get<ProductCategoryWithChildren[]>(
        `/api/products/categories/tree?catalogId=${encodeURIComponent(catalogId)}`,
        { cache: 'no-store' }
      );
    },
    options: {
      enabled: !!catalogId,
    },
  });
}
