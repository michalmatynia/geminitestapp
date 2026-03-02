'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  EDIT_PRODUCT_DETAIL_STALE_TIME_MS,
  isIncomingProductDetailNewer,
} from '@/features/products/hooks/product-list-state-utils';
import {
  isEditingProductHydrated,
  markEditingProductHydrated,
} from '@/features/products/hooks/editingProductHydration';
import { getProductDetailQueryKey } from '@/features/products/hooks/productCache';
import type { ProductWithImages } from '@/shared/contracts/products';
import { ApiError, api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui';

const PRODUCT_DETAIL_TIMEOUT_MS = 60_000;

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
  const searchParams = useSearchParams();
  const openProductIdFromQuery = searchParams.get('openProductId')?.trim() ?? '';

  const [isEditHydrating, setIsEditHydrating] = useState(false);
  const editOpenRequestTokenRef = useRef(0);
  const openingProductFromQueryRef = useRef<string | null>(null);

  const editingProductDetailQuery = createSingleQueryV2<ProductWithImages>({
    id: editingProduct?.id,
    queryKey: (id) =>
      id !== 'none'
        ? QUERY_KEYS.products.detail(id)
        : [...QUERY_KEYS.products.details(), 'inactive'],
    queryFn: () =>
      api.get<ProductWithImages>(`/api/products/${editingProduct?.id}`, {
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
    },
  });

  const prefetchProductDetail = useCallback(
    (productId: string) => {
      void queryClient.prefetchQuery({
        queryKey: normalizeQueryKey(getProductDetailQueryKey(productId)),
        queryFn: ({ signal }) =>
          api.get<ProductWithImages>(`/api/products/${encodeURIComponent(productId)}?fresh=1`, {
            signal,
            cache: 'no-store',
            logError: false,
            timeout: PRODUCT_DETAIL_TIMEOUT_MS,
          }),
        staleTime: 20_000,
      });
    },
    [queryClient]
  );

  const handleOpenEditModal = useCallback(
    (product: ProductWithImages) => {
      setActionError(null);
      editOpenRequestTokenRef.current += 1;
      const requestToken = editOpenRequestTokenRef.current;

      setEditingProduct(product);
      setIsEditHydrating(true);

      void queryClient
        .fetchQuery({
          queryKey: normalizeQueryKey(getProductDetailQueryKey(product.id)),
          queryFn: ({ signal }) =>
            api.get<ProductWithImages>(`/api/products/${encodeURIComponent(product.id)}?fresh=1`, {
              signal,
              cache: 'no-store',
              logError: false,
              timeout: PRODUCT_DETAIL_TIMEOUT_MS,
            }),
          staleTime: 0,
        })
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
    void queryClient
      .fetchQuery({
        queryKey: normalizeQueryKey(getProductDetailQueryKey(openProductIdFromQuery)),
        queryFn: ({ signal }) =>
          api.get<ProductWithImages>(
            `/api/products/${encodeURIComponent(openProductIdFromQuery)}?fresh=1`,
            {
              signal,
              cache: 'no-store',
              logError: false,
              timeout: PRODUCT_DETAIL_TIMEOUT_MS,
            }
          ),
        staleTime: 0,
      })
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
  }, [editingProduct?.id, editingProductDetailQuery.error, setEditingProduct, setRefreshTrigger, toast]);

  return {
    isEditHydrating,
    handleOpenEditModal,
    handleCloseEdit,
    prefetchProductDetail,
    editingProductDetailQuery,
  };
}
