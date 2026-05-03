'use client';

import { useMemo } from 'react';

import { useQuerySync } from '@/shared/hooks/useQuerySync';

import { productsAllQueryKey, productsCategoriesAllQueryKey } from './productCache';

// useProductSync: runtime helper for syncing product data across tabs and windows.
// Keeps product lists and category caches coordinated by leveraging the
// shared useQuerySync hook. This adapter is intentionally tiny and client-only
// so heavier integration code stays out of the main product-list bundle.
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
