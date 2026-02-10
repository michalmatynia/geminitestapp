'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProductCategoryWithChildren } from '@/features/products/types';

/**
 * Hook to fetch product categories for a catalog
 */
export function useProductCategories(catalogId?: string): UseQueryResult<ProductCategoryWithChildren[]> {
  return useQuery({
    queryKey: ['product-categories', catalogId],
    queryFn: async (): Promise<ProductCategoryWithChildren[]> => {
      if (!catalogId) return [];
      const res = await fetch(`/api/products/categories?catalogId=${catalogId}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch categories');
      }
      return (await res.json()) as ProductCategoryWithChildren[];
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
      const res = await fetch(`/api/products/categories/tree?catalogId=${catalogId}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch category tree');
      }
      return (await res.json()) as ProductCategoryWithChildren[];
    },
    enabled: !!catalogId,
  });
}
