import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { preloadProductFormChunk } from '@/features/products/components/product-form-preload';
import { getProductDetailEditQueryKey } from '@/features/products/hooks/productCache';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import { prefetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';

import { PRODUCT_DETAIL_TIMEOUT_MS } from './useProductEditHydration.fetch';

const PRODUCT_DETAIL_PREFETCH_DEBOUNCE_MS = 120;
const PRODUCT_DETAIL_PREFETCH_STALE_MS = 20_000;

export const useProductDetailPrefetch = (queryClient: QueryClient): ((productId: string) => void) => {
  const prefetchTimerRef = useRef<number | null>(null);
  const pendingPrefetchProductIdRef = useRef<string | null>(null);

  const prefetchProductDetail = useCallback(
    (productId: string): void => {
      const normalizedProductId = productId.trim();
      if (normalizedProductId === '') return;

      preloadProductFormChunk();
      pendingPrefetchProductIdRef.current = normalizedProductId;

      if (prefetchTimerRef.current !== null) {
        window.clearTimeout(prefetchTimerRef.current);
      }

      prefetchTimerRef.current = window.setTimeout(() => {
        prefetchTimerRef.current = null;
        const queuedProductId = pendingPrefetchProductIdRef.current;
        if (queuedProductId === null || queuedProductId === '') return;

        const queryKey = normalizeQueryKey(getProductDetailEditQueryKey(queuedProductId));
        const existingState = queryClient.getQueryState<ProductWithImages>(queryKey);
        if (
          typeof existingState?.dataUpdatedAt === 'number' &&
          Date.now() - existingState.dataUpdatedAt < PRODUCT_DETAIL_PREFETCH_STALE_MS
        ) {
          return;
        }

        void prefetchQueryV2(queryClient, {
          queryKey,
          queryFn: ({ signal }) =>
            api.get<ProductWithImages>(`/api/v2/products/${encodeURIComponent(queuedProductId)}`, {
              signal,
              cache: 'no-store',
              logError: false,
              timeout: PRODUCT_DETAIL_TIMEOUT_MS,
            }),
          staleTime: PRODUCT_DETAIL_PREFETCH_STALE_MS,
          logError: false,
          meta: {
            source: 'products.hooks.useProductEditHydration.prefetchProductDetail',
            operation: 'detail',
            resource: 'products.detailEdit',
            domain: 'products',
            queryKey,
            tags: ['products', 'detail', 'edit', 'prefetch'],
            description: 'Prefetches products detail for the live editor.',
          },
        })();
      }, PRODUCT_DETAIL_PREFETCH_DEBOUNCE_MS);
    },
    [queryClient]
  );

  useEffect(() => {
    return () => {
      if (prefetchTimerRef.current !== null) {
        window.clearTimeout(prefetchTimerRef.current);
      }
    };
  }, []);

  return prefetchProductDetail;
};
