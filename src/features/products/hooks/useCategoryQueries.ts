'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProductCategory, ProductCategoryWithChildren } from '@/features/products/types';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { useCategories as useMetadataCategories } from './useProductMetadataQueries';

/**
 * Hook to fetch product categories for a catalog
 */
export function useProductCategories(catalogId?: string): UseQueryResult<ProductCategory[]> {
  return useMetadataCategories(catalogId);
}

/**
 * Hook to fetch product category tree for a catalog
 */
export function useProductCategoryTree(catalogId?: string): UseQueryResult<ProductCategoryWithChildren[]> {
  return useQuery({
    queryKey: QUERY_KEYS.products.settings.categoryTree(catalogId ?? null),
    queryFn: async (): Promise<ProductCategoryWithChildren[]> => {
      if (!catalogId) return [];
      return await api.get<ProductCategoryWithChildren[]>(
        `/api/products/categories/tree?catalogId=${encodeURIComponent(catalogId)}`,
        { cache: 'no-store' }
      );
    },
    enabled: !!catalogId,
  });
}
