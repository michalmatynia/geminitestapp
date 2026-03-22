'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { preloadProductFormChunk } from '@/features/products/components/ProductModals';
import {
  isEditingProductHydrated,
  markEditingProductHydrated,
} from '@/features/products/hooks/editingProductHydration';
import {
  EDIT_PRODUCT_DETAIL_STALE_TIME_MS,
  isIncomingProductDetailNewer,
} from '@/features/products/hooks/product-list-state-utils';
import { getProductDetailQueryKey } from '@/features/products/hooks/productCache';
import type { ProductWithImages } from '@/shared/contracts/products';
import { ApiError, api } from '@/shared/lib/api-client';
import {
  createSingleQueryV2,
  prefetchQueryV2,
  fetchQueryV2,
} from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui';

const subscribeToSearchParams = (callback: () => void): (() => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};
const getSearchSnapshot = (): string =>
  typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('openProductId')?.trim() ?? '') : '';
const getSearchServerSnapshot = (): string => '';

const PRODUCT_DETAIL_TIMEOUT_MS = 60_000;
const PRODUCT_DETAIL_PREFETCH_DEBOUNCE_MS = 120;
const PRODUCT_DETAIL_PREFETCH_STALE_MS = 20_000;
// If cached data is younger than this, use it instantly and background-refetch instead of blocking.
const PRODUCT_DETAIL_CACHE_FRESH_MS = 10_000;

export const shouldAdoptIncomingEditProductDetail = (input: {
  currentProduct: ProductWithImages;
  incomingProduct: ProductWithImages;
  isEditHydrating: boolean;
}): boolean => {
  const { currentProduct, incomingProduct, isEditHydrating } = input;
  if (incomingProduct.id !== currentProduct.id) return false;
  const hydrated = isEditingProductHydrated(currentProduct);
  if (!hydrated && !isEditHydrating) return false;
  if (hydrated && !isIncomingProductDetailNewer(incomingProduct, currentProduct)) return false;
  return true;
};

export function useProductEditHydration({
  editingProduct,
  setEditingProduct,
  setActionError,
  setRefreshTrigger,
  clearProductEditorQueryParams,
}: {
  editingProduct: ProductWithImages | null;
  setEditingProduct: (product: ProductWithImages | null) => void;
  setActionError: (error: string | null) => void;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  clearProductEditorQueryParams: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const openProductIdFromQuery = useSyncExternalStore(subscribeToSearchParams, getSearchSnapshot, getSearchServerSnapshot);

  const [isEditHydrating, setIsEditHydrating] = useState(false);
  const editOpenRequestTokenRef = useRef(0);
  const openingProductFromQueryRef = useRef<string | null>(null);
  const prefetchTimerRef = useRef<number | null>(null);
  const pendingPrefetchProductIdRef = useRef<string | null>(null);

  const editingProductDetailQuery = createSingleQueryV2<ProductWithImages>({
    id: editingProduct?.id,
    queryKey: (id) =>
      id !== 'none'
        ? QUERY_KEYS.products.detail(id)
        : [...QUERY_KEYS.products.details(), 'inactive'],
    queryFn: () =>
      api.get<ProductWithImages>(`/api/v2/products/${editingProduct?.id}`, {
        timeout: PRODUCT_DETAIL_TIMEOUT_MS,
      }),
    staleTime: EDIT_PRODUCT_DETAIL_STALE_TIME_MS,
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'products.hooks.useProductEditHydration.editingProductDetail',
      operation: 'detail',
      resource: 'products.detail',
      domain: 'products',
      tags: ['products', 'detail', 'editing'],
      description: 'Loads products detail.'},
  });

  const prefetchProductDetail = useCallback(
    (productId: string) => {
      const normalizedProductId = productId.trim();
      if (!normalizedProductId) return;

      // Start downloading the ProductForm JS chunk in parallel with data.
      preloadProductFormChunk();

      pendingPrefetchProductIdRef.current = normalizedProductId;

      if (prefetchTimerRef.current !== null) {
        window.clearTimeout(prefetchTimerRef.current);
      }

      prefetchTimerRef.current = window.setTimeout(() => {
        prefetchTimerRef.current = null;
        const queuedProductId = pendingPrefetchProductIdRef.current;
        if (!queuedProductId) return;

        const queryKey = normalizeQueryKey(getProductDetailQueryKey(queuedProductId));
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
          meta: {
            source: 'products.hooks.useProductEditHydration.prefetchProductDetail',
            operation: 'detail',
            resource: 'products.detail',
            domain: 'products',
            queryKey,
            tags: ['products', 'detail', 'prefetch'],
            description: 'Loads products detail.'},
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

  const handleOpenEditModal = useCallback(
    (product: ProductWithImages) => {
      setActionError(null);
      editOpenRequestTokenRef.current += 1;
      const requestToken = editOpenRequestTokenRef.current;

      const queryKey = normalizeQueryKey(getProductDetailQueryKey(product.id));

      // Use cached data instantly if the hover-prefetch populated it recently.
      const cachedState = queryClient.getQueryState<ProductWithImages>(queryKey);
      const cacheAge =
        typeof cachedState?.dataUpdatedAt === 'number'
          ? Date.now() - cachedState.dataUpdatedAt
          : Infinity;
      const cachedData = cacheAge < PRODUCT_DETAIL_CACHE_FRESH_MS
        ? queryClient.getQueryData<ProductWithImages>(queryKey)
        : undefined;

      if (cachedData) {
        // Open immediately with cached data, then background-refetch for freshness.
        setEditingProduct(markEditingProductHydrated(cachedData));
        setIsEditHydrating(false);
        void queryClient.refetchQueries({ queryKey });
        return;
      }

      setEditingProduct(product);
      setIsEditHydrating(true);

      void fetchQueryV2(queryClient, {
        queryKey,
        queryFn: ({ signal }) =>
          api.get<ProductWithImages>(`/api/v2/products/${encodeURIComponent(product.id)}?fresh=1`, {
            signal,
            cache: 'no-store',
            logError: false,
            timeout: PRODUCT_DETAIL_TIMEOUT_MS,
          }),
        staleTime: 0,
        meta: {
          source: 'products.hooks.useProductEditHydration.handleOpenEditModal',
          operation: 'detail',
          resource: 'products.detail',
          domain: 'products',
          queryKey,
          tags: ['products', 'detail', 'fetch'],
          description: 'Loads products detail.'},
      })()
        .then((freshProduct: ProductWithImages) => {
          if (editOpenRequestTokenRef.current !== requestToken) return;
          setEditingProduct(markEditingProductHydrated(freshProduct));
          setIsEditHydrating(false);
        })
        .catch((error: unknown) => {
          if (editOpenRequestTokenRef.current !== requestToken) return;
          setIsEditHydrating(false);
          if (error instanceof ApiError && error.status === 404) {
            toast('This product no longer exists. Refreshing the list.', { variant: 'warning' });
            setRefreshTrigger((prev: number) => prev + 1);
            return;
          }
          toast(error instanceof Error ? error.message : 'Failed to open product editor.', {
            variant: 'error',
          });
        });
    },
    [queryClient, setActionError, setEditingProduct, setRefreshTrigger, toast]
  );

  const handleCloseEdit = useCallback(() => {
    editOpenRequestTokenRef.current += 1;
    setEditingProduct(null);
    setIsEditHydrating(false);
    clearProductEditorQueryParams();
  }, [clearProductEditorQueryParams, setEditingProduct]);

  useEffect(() => {
    if (!editingProduct?.id) return;
    const fresh = editingProductDetailQuery.data;
    if (!fresh) return;
    if (
      !shouldAdoptIncomingEditProductDetail({
        currentProduct: editingProduct,
        incomingProduct: fresh,
        isEditHydrating,
      })
    ) {
      return;
    }
    setEditingProduct(markEditingProductHydrated(fresh));
  }, [editingProduct, editingProductDetailQuery.data, isEditHydrating, setEditingProduct]);

  useEffect(() => {
    if (editingProduct?.id) return;
    editOpenRequestTokenRef.current += 1;
    setIsEditHydrating(false);
  }, [editingProduct?.id]);

  useEffect(() => {
    if (!openProductIdFromQuery) {
      if (openingProductFromQueryRef.current !== null) {
        openingProductFromQueryRef.current = null;
        editOpenRequestTokenRef.current += 1;
        setIsEditHydrating(false);
      }
      return;
    }
    if (editingProduct?.id === openProductIdFromQuery) return;
    if (openingProductFromQueryRef.current === openProductIdFromQuery) return;
    openingProductFromQueryRef.current = openProductIdFromQuery;
    editOpenRequestTokenRef.current += 1;
    const requestToken = editOpenRequestTokenRef.current;

    setActionError(null);
    setEditingProduct(null);
    setIsEditHydrating(true);

    const queryKey = normalizeQueryKey(getProductDetailQueryKey(openProductIdFromQuery));
    void fetchQueryV2(queryClient, {
      queryKey,
      queryFn: ({ signal }) =>
        api.get<ProductWithImages>(
          `/api/v2/products/${encodeURIComponent(openProductIdFromQuery)}?fresh=1`,
          {
            signal,
            cache: 'no-store',
            logError: false,
            timeout: PRODUCT_DETAIL_TIMEOUT_MS,
          }
        ),
      staleTime: 0,
      meta: {
        source: 'products.hooks.useProductEditHydration.openingProductFromQuery',
        operation: 'detail',
        resource: 'products.detail',
        domain: 'products',
        queryKey,
        tags: ['products', 'detail', 'fetch'],
        description: 'Loads products detail.'},
    })()
      .then((freshProduct: ProductWithImages) => {
        if (editOpenRequestTokenRef.current !== requestToken) return;
        setEditingProduct(markEditingProductHydrated(freshProduct));
        setIsEditHydrating(false);
      })
      .catch((error: unknown) => {
        if (editOpenRequestTokenRef.current !== requestToken) return;
        setIsEditHydrating(false);
        if (error instanceof ApiError && error.status === 404) {
          toast('This product no longer exists. Refreshing the list.', { variant: 'warning' });
          setRefreshTrigger((prev: number) => prev + 1);
          return;
        }
        toast(error instanceof Error ? error.message : 'Failed to open product editor.', {
          variant: 'error',
        });
      });
  }, [
    editingProduct?.id,
    openProductIdFromQuery,
    queryClient,
    setActionError,
    setEditingProduct,
    setRefreshTrigger,
    toast,
  ]);

  useEffect(() => {
    if (!editingProduct?.id) return;
    if (!editingProductDetailQuery.error) return;
    const error = editingProductDetailQuery.error;
    if (!(error instanceof ApiError) || error.status !== 404) return;

    setEditingProduct(null);
    setIsEditHydrating(false);
    toast('This product was deleted or is unavailable.', { variant: 'warning' });
    setRefreshTrigger((prev: number) => prev + 1);
  }, [
    editingProduct?.id,
    editingProductDetailQuery.error,
    setEditingProduct,
    setRefreshTrigger,
    toast,
  ]);

  return {
    isEditHydrating,
    handleOpenEditModal,
    handleCloseEdit,
    prefetchProductDetail,
    editingProductDetailQuery,
  };
}
