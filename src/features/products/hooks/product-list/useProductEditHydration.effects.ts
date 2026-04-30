import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import {
  isEditingProductHydrated,
  markEditingProductHydrated,
} from '@/features/products/hooks/editingProductHydration';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ApiError } from '@/shared/lib/api-client';
import type { SingleQuery } from '@/shared/contracts/ui/queries';

import { shouldAdoptIncomingEditProductDetail } from './useProductEditHydration.cache';
import { handleEditProductFetchError } from './useProductEditHydration.errors';
import {
  buildProductDetailQueryKeys,
  fetchFreshEditProductDetail,
} from './useProductEditHydration.fetch';
import type {
  ProductEditHydrationInput,
  ProductEditHydrationRefs,
  ProductEditHydrationToast,
} from './useProductEditHydration.types';

export const useMissingEditProductHandler = (input: {
  refs: ProductEditHydrationRefs;
  setEditingProduct: ProductEditHydrationInput['setEditingProduct'];
  setIsEditHydrating: React.Dispatch<React.SetStateAction<boolean>>;
  clearProductEditorQueryParams: ProductEditHydrationInput['clearProductEditorQueryParams'];
  toast: ProductEditHydrationToast;
  setRefreshTrigger: ProductEditHydrationInput['setRefreshTrigger'];
}): ((message: string) => void) => {
  const {
    clearProductEditorQueryParams,
    refs,
    setEditingProduct,
    setIsEditHydrating,
    setRefreshTrigger,
    toast,
  } = input;
  return useCallback(
    (message: string): void => {
      refs.openingProductFromQueryRef.current = null;
      setEditingProduct(null);
      setIsEditHydrating(false);
      clearProductEditorQueryParams();
      toast(message, { variant: 'warning' });
      setRefreshTrigger((prev: number) => prev + 1);
    },
    [
      clearProductEditorQueryParams,
      refs.openingProductFromQueryRef,
      setEditingProduct,
      setIsEditHydrating,
      setRefreshTrigger,
      toast,
    ]
  );
};

export const useAdoptIncomingEditProductDetail = (input: {
  editingProduct: ProductWithImages | null;
  editingProductDetailQuery: SingleQuery<ProductWithImages>;
  isEditHydrating: boolean;
  setEditingProduct: ProductEditHydrationInput['setEditingProduct'];
}): void => {
  const { editingProduct, editingProductDetailQuery, isEditHydrating, setEditingProduct } = input;
  useEffect(() => {
    if (editingProduct === null || editingProduct.id === '') return;
    const fresh = editingProductDetailQuery.data;
    if (fresh === undefined) return;
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
};

export const useResetEditHydrationWhenClosed = (input: {
  editingProduct: ProductWithImages | null;
  refs: ProductEditHydrationRefs;
  setIsEditHydrating: React.Dispatch<React.SetStateAction<boolean>>;
}): void => {
  const { editingProduct, refs, setIsEditHydrating } = input;
  useEffect(() => {
    if (editingProduct !== null && editingProduct.id !== '') return;
    refs.editOpenRequestTokenRef.current += 1;
    setIsEditHydrating(false);
  }, [editingProduct, refs.editOpenRequestTokenRef, setIsEditHydrating]);
};

export const useOpenProductFromQueryHydration = (input: {
  openProductIdFromQuery: string;
  editingProduct: ProductWithImages | null;
  refs: ProductEditHydrationRefs;
  queryClient: QueryClient;
  setActionError: ProductEditHydrationInput['setActionError'];
  setEditingProduct: ProductEditHydrationInput['setEditingProduct'];
  setIsEditHydrating: React.Dispatch<React.SetStateAction<boolean>>;
  handleMissingEditProduct: (message: string) => void;
  toast: ProductEditHydrationToast;
}): void => {
  const {
    editingProduct,
    handleMissingEditProduct,
    openProductIdFromQuery,
    queryClient,
    refs,
    setActionError,
    setEditingProduct,
    setIsEditHydrating,
    toast,
  } = input;
  useEffect(() => {
    if (openProductIdFromQuery === '') {
      if (refs.openingProductFromQueryRef.current !== null) {
        refs.openingProductFromQueryRef.current = null;
        refs.editOpenRequestTokenRef.current += 1;
        setIsEditHydrating(false);
      }
      return;
    }
    if ((editingProduct?.id ?? '') === openProductIdFromQuery) return;
    if (refs.openingProductFromQueryRef.current === openProductIdFromQuery) return;
    refs.openingProductFromQueryRef.current = openProductIdFromQuery;
    refs.editOpenRequestTokenRef.current += 1;
    const requestToken = refs.editOpenRequestTokenRef.current;

    setActionError(null);
    setEditingProduct(null);
    setIsEditHydrating(true);

    const keys = buildProductDetailQueryKeys(openProductIdFromQuery);
    void fetchFreshEditProductDetail({
      queryClient,
      productId: openProductIdFromQuery,
      queryKey: keys.detailEditQueryKey,
      source: 'products.hooks.useProductEditHydration.openingProductFromQuery',
      tags: ['products', 'detail', 'edit', 'fetch'],
    })
      .then((freshProduct: ProductWithImages) => {
        queryClient.setQueryData(keys.detailQueryKey, freshProduct);
        if (refs.editOpenRequestTokenRef.current !== requestToken) return;
        setEditingProduct(markEditingProductHydrated(freshProduct));
        setIsEditHydrating(false);
      })
      .catch((error: unknown) => {
        handleEditProductFetchError({
          error,
          editOpenRequestTokenRef: refs.editOpenRequestTokenRef,
          requestToken,
          handleMissingEditProduct,
          setIsEditHydrating,
          toast,
          clearHydrationOnError: true,
        });
      });
  }, [
    editingProduct?.id,
    handleMissingEditProduct,
    openProductIdFromQuery,
    queryClient,
    refs.editOpenRequestTokenRef,
    refs.openingProductFromQueryRef,
    setActionError,
    setEditingProduct,
    setIsEditHydrating,
    toast,
  ]);
};

export const useMissingLiveEditProductEffect = (input: {
  editingProduct: ProductWithImages | null;
  editingProductDetailQuery: SingleQuery<ProductWithImages>;
  handleMissingEditProduct: (message: string) => void;
}): void => {
  const { editingProduct, editingProductDetailQuery, handleMissingEditProduct } = input;
  useEffect(() => {
    if (editingProduct === null || editingProduct.id === '') return;
    const error = editingProductDetailQuery.error;
    if (error === null) return;
    if (!(error instanceof ApiError) || error.status !== 404) return;

    handleMissingEditProduct('This product was deleted or is unavailable.');
  }, [editingProduct, editingProductDetailQuery.error, handleMissingEditProduct]);
};
