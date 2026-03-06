'use client';

import { useQuerySync } from '@/shared/hooks/useQuerySync';

import { productsAllQueryKey, productsCategoriesAllQueryKey } from './productCache';

// Hook for syncing product data across tabs
export function useProductSync(): void {
  useQuerySync([
    {
      queryKey: productsAllQueryKey,
      enabled: true,
    },
    {
      queryKey: productsCategoriesAllQueryKey,
      enabled: true,
    },
  ]);
}
