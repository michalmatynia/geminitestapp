'use client';

import { useMemo } from 'react';

import { useQuerySync } from '@/shared/hooks/useQuerySync';

import { productsAllQueryKey, productsCategoriesAllQueryKey } from './productCache';

// Hook for syncing product data across tabs
export function useProductSync(): void {
  const configs = useMemo(
    () => [
      { queryKey: productsAllQueryKey, enabled: true },
      { queryKey: productsCategoriesAllQueryKey, enabled: true },
    ],
    []
  );
  useQuerySync(configs);
}
