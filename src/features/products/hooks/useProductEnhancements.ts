 
'use client';

import { getProductById, getProducts, updateProduct } from '@/features/products/api/products';
import { getCatalogs } from '@/features/products/api/settings';
import type { ProductWithImages } from '@/features/products/types';
import { useCacheWarmup, useSmartPrefetch } from '@/shared/hooks/query/useCacheWarmup';
import { useOptimisticMutation } from '@/shared/hooks/useOptimisticMutation';
import { useQuerySync } from '@/shared/hooks/useQuerySync';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { UseMutationResult } from '@tanstack/react-query';

// Enhanced product mutations with optimistic updates
export function useOptimisticProductUpdate(): UseMutationResult<
  ProductWithImages,
  Error,
  { id: string; data: Partial<ProductWithImages> },
  { previousData: ProductWithImages[] | undefined }
  > {
  return useOptimisticMutation<
    ProductWithImages,
    Error,
    { id: string; data: Partial<ProductWithImages> },
    ProductWithImages[]
  >(
    async ({ id, data }): Promise<ProductWithImages> => {
      return updateProduct(id, data);
    },
    {
      queryKey: [...QUERY_KEYS.products.all],
      updateFn: (oldData: ProductWithImages[] | undefined, { id, data }: { id: string; data: Partial<ProductWithImages> }) => {
        if (!oldData) return [];
        return oldData.map((product: ProductWithImages) =>
          product.id === id ? ({ ...product, ...data } as ProductWithImages) : product
        );
      },
      revertOnError: true,
    }
  );
}

// Hook for warming up product-related caches
export function useProductCacheWarmup(productId?: string): void {
  const resolveWarmCatalogId = async (): Promise<string | null> => {
    try {
      const catalogs = await getCatalogs();
      if (!Array.isArray(catalogs) || catalogs.length === 0) return null;
      return catalogs[0]?.id ?? null;
    } catch {
      return null;
    }
  };

  useCacheWarmup([
    {
      queryKey: [...QUERY_KEYS.products.all],
      queryFn: () => getProducts({}),
      priority: 'high' as const,
    },
    {
      queryKey: [...QUERY_KEYS.products.all, 'categories'],
      queryFn: async (): Promise<unknown> => {
        const catalogId = await resolveWarmCatalogId();
        if (!catalogId) return [];
        const { getCategoriesFlat } = await import('@/features/products/api/settings');
        return getCategoriesFlat(catalogId);
      },
      priority: 'medium' as const,
    },
    ...(productId ? [{
      queryKey: [...QUERY_KEYS.products.detail(productId)],
      queryFn: () => getProductById(productId),
      priority: 'high' as const,
      conditions: (): boolean => !!productId,
    }] : []),
  ]);
}

// Hook for smart product prefetching
export function useProductPrefetch(): {
  prefetchProduct: (productId: string) => { onMouseEnter: () => void; onMouseLeave: () => void };
  prefetchProductEdit: (productId: string) => { onFocus: () => void };
  } {
  const { prefetchOnHover, prefetchOnFocus } = useSmartPrefetch();

  const prefetchProduct = (productId: string): { onMouseEnter: () => void; onMouseLeave: () => void } =>
    prefetchOnHover(
      [...QUERY_KEYS.products.detail(productId)],
      () => getProductById(productId)
    );

  const prefetchProductEdit = (productId: string): { onFocus: () => void } =>
    prefetchOnFocus(
      [...QUERY_KEYS.products.detail(productId), 'edit'],
      () => getProductById(productId)
    );

  return { prefetchProduct, prefetchProductEdit };
}

// Hook for syncing product data across tabs
export function useProductSync(): void {
  useQuerySync([
    {
      queryKey: [...QUERY_KEYS.products.all],
      enabled: true,
    },
    {
      queryKey: [...QUERY_KEYS.products.all, 'categories'],
      enabled: true,
    },
  ]);
}
