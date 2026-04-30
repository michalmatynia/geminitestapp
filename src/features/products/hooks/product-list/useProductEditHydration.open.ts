import type { QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { handleEditProductFetchError } from './useProductEditHydration.errors';
import {
  fetchFreshEditProductDetail,
  readFreshCachedEditProductDetail,
} from './useProductEditHydration.fetch';
import type {
  ProductEditHydrationInput,
  ProductEditHydrationRefs,
  ProductEditHydrationToast,
} from './useProductEditHydration.types';

type ProductEditOpenActionsInput = Pick<
  ProductEditHydrationInput,
  'setActionError' | 'setEditingProduct' | 'clearProductEditorQueryParams'
> & {
  queryClient: QueryClient;
  refs: ProductEditHydrationRefs;
  setIsEditHydrating: React.Dispatch<React.SetStateAction<boolean>>;
  toast: ProductEditHydrationToast;
  handleMissingEditProduct: (message: string) => void;
};

export const useProductEditOpenActions = (
  input: ProductEditOpenActionsInput
): {
  handleOpenEditModal: (product: ProductWithImages) => void;
  handleCloseEdit: () => void;
} => {
  const {
    clearProductEditorQueryParams,
    handleMissingEditProduct,
    queryClient,
    refs,
    setActionError,
    setEditingProduct,
    setIsEditHydrating,
    toast,
  } = input;
  const { editOpenRequestTokenRef, openingProductFromQueryRef } = refs;

  const handleFetchError = useCallback(
    (error: unknown, requestToken: number, clearHydrationOnError: boolean): void => {
      handleEditProductFetchError({
        error,
        editOpenRequestTokenRef,
        requestToken,
        handleMissingEditProduct,
        setIsEditHydrating,
        toast,
        clearHydrationOnError,
      });
    },
    [editOpenRequestTokenRef, handleMissingEditProduct, setIsEditHydrating, toast]
  );

  const handleOpenEditModal = useCallback(
    (product: ProductWithImages): void => {
      setActionError(null);
      editOpenRequestTokenRef.current += 1;
      const requestToken = editOpenRequestTokenRef.current;
      const cached = readFreshCachedEditProductDetail(queryClient, product.id);

      if (cached.cachedData !== undefined) {
        queryClient.setQueryData(cached.keys.detailEditQueryKey, cached.cachedData);
        setEditingProduct(markEditingProductHydrated(cached.cachedData));
        setIsEditHydrating(false);
        void fetchFreshEditProductDetail({
          queryClient,
          productId: product.id,
          queryKey: cached.keys.detailEditQueryKey,
          source: 'products.hooks.useProductEditHydration.handleOpenEditModal.cachedRefresh',
          tags: ['products', 'detail', 'edit', 'fetch', 'cached-refresh'],
        })
          .then((freshProduct: ProductWithImages) => {
            queryClient.setQueryData(cached.keys.detailQueryKey, freshProduct);
          })
          .catch((error: unknown) => handleFetchError(error, requestToken, false));
        return;
      }

      setEditingProduct(product);
      setIsEditHydrating(true);
      void fetchFreshEditProductDetail({
        queryClient,
        productId: product.id,
        queryKey: cached.keys.detailEditQueryKey,
        source: 'products.hooks.useProductEditHydration.handleOpenEditModal',
        tags: ['products', 'detail', 'edit', 'fetch'],
      })
        .then((freshProduct: ProductWithImages) => {
          queryClient.setQueryData(cached.keys.detailQueryKey, freshProduct);
          if (editOpenRequestTokenRef.current !== requestToken) return;
          setEditingProduct(markEditingProductHydrated(freshProduct));
          setIsEditHydrating(false);
        })
        .catch((error: unknown) => handleFetchError(error, requestToken, true));
    },
    [
      editOpenRequestTokenRef,
      handleFetchError,
      queryClient,
      setActionError,
      setEditingProduct,
      setIsEditHydrating,
    ]
  );

  const handleCloseEdit = useCallback((): void => {
    editOpenRequestTokenRef.current += 1;
    openingProductFromQueryRef.current = null;
    setEditingProduct(null);
    setIsEditHydrating(false);
    clearProductEditorQueryParams();
  }, [
    clearProductEditorQueryParams,
    editOpenRequestTokenRef,
    openingProductFromQueryRef,
    setEditingProduct,
    setIsEditHydrating,
  ]);

  return {
    handleOpenEditModal,
    handleCloseEdit,
  };
};
