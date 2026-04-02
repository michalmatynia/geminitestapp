'use client';

import { useMemo } from 'react';

import { useQuerySync } from '@/shared/hooks/useQuerySync';

import { productsAllQueryKey, productsCategoriesAllQueryKey } from './productCache';

// Hook for syncing product data across tabs
export function useProductSync({ enabled = true }: { enabled?: boolean } = {}): void {
  const configs = useMemo(
    () => [
      { queryKey: productsAllQueryKey, enabled },
      { queryKey: productsCategoriesAllQueryKey, enabled },
    ],
    [enabled]
  );
  useQuerySync(configs);
}
