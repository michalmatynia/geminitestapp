'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProductCategoryWithChildren } from '@/features/products/types';
import { api } from '@/shared/lib/api-client';

/**
 * Hook to fetch product categories for a catalog
 */
export function useProductCategories(catalogId?: string): UseQueryResult<ProductCategoryWithChildren[]> {
  return useQuery({
    queryKey: ['product-categories', catalogId],
    queryFn: async (): Promise<ProductCategoryWithChildren[]> => {
      if (!catalogId) return [];
      return await api.get<ProductCategoryWithChildren[]>(
        `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`,
        { cache: 'no-store' }
      );
    },
    enabled: !!catalogId,
  });
}

/**
 * Hook to fetch product category tree for a catalog
 */
export function useProductCategoryTree(catalogId?: string): UseQueryResult<ProductCategoryWithChildren[]> {
  return useQuery({
    queryKey: ['product-categories', 'tree', catalogId],
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
