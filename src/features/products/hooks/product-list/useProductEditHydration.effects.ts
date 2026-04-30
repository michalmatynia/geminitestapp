import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
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

type OpenProductFromQueryHydrationInput = {
  openProductIdFromQuery: string;
  editingProduct: ProductWithImages | null;
  refs: ProductEditHydrationRefs;
  queryClient: QueryClient;
  setActionError: ProductEditHydrationInput['setActionError'];
  setEditingProduct: ProductEditHydrationInput['setEditingProduct'];
  setIsEditHydrating: React.Dispatch<React.SetStateAction<boolean>>;
  handleMissingEditProduct: (message: string) => void;
  toast: ProductEditHydrationToast;
};

const fetchOpenProductFromQuery = (input: {
  openProductIdFromQuery: string;
  requestToken: number;
  refs: ProductEditHydrationRefs;
  queryClient: QueryClient;
  setEditingProduct: ProductEditHydrationInput['setEditingProduct'];
  setIsEditHydrating: React.Dispatch<React.SetStateAction<boolean>>;
  handleMissingEditProduct: (message: string) => void;
  toast: ProductEditHydrationToast;
}): void => {
  const keys = buildProductDetailQueryKeys(input.openProductIdFromQuery);
  void fetchFreshEditProductDetail({
    queryClient: input.queryClient,
    productId: input.openProductIdFromQuery,
    queryKey: keys.detailEditQueryKey,
    source: 'products.hooks.useProductEditHydration.openingProductFromQuery',
    tags: ['products', 'detail', 'edit', 'fetch'],
  })
    .then((freshProduct: ProductWithImages) => {
      input.queryClient.setQueryData(keys.detailQueryKey, freshProduct);
      if (input.refs.editOpenRequestTokenRef.current !== input.requestToken) return;
      input.setEditingProduct(markEditingProductHydrated(freshProduct));
      input.setIsEditHydrating(false);
    })
    .catch((error: unknown) => {
      handleEditProductFetchError({
        error,
        editOpenRequestTokenRef: input.refs.editOpenRequestTokenRef,
        requestToken: input.requestToken,
        handleMissingEditProduct: input.handleMissingEditProduct,
        setIsEditHydrating: input.setIsEditHydrating,
        toast: input.toast,
        clearHydrationOnError: true,
      });
    });
};

const useResetClearedOpenProductQuery = (
  input: Pick<OpenProductFromQueryHydrationInput, 'refs' | 'setIsEditHydrating'>
): (() => void) => {
  const { refs, setIsEditHydrating } = input;
  return useCallback((): void => {
    if (refs.openingProductFromQueryRef.current !== null) {
      refs.openingProductFromQueryRef.current = null;
      refs.editOpenRequestTokenRef.current += 1;
      setIsEditHydrating(false);
    }
  }, [refs.editOpenRequestTokenRef, refs.openingProductFromQueryRef, setIsEditHydrating]);
};

const useHydrateOpenProductFromQuery = (
  input: Omit<OpenProductFromQueryHydrationInput, 'editingProduct'>
): (() => void) => {
  const {
    handleMissingEditProduct,
    openProductIdFromQuery,
    queryClient,
    refs,
    setActionError,
    setEditingProduct,
    setIsEditHydrating,
    toast,
  } = input;
  return useCallback((): void => {
    refs.openingProductFromQueryRef.current = openProductIdFromQuery;
    refs.editOpenRequestTokenRef.current += 1;
    const requestToken = refs.editOpenRequestTokenRef.current;

    setActionError(null);
    setEditingProduct(null);
    setIsEditHydrating(true);
    fetchOpenProductFromQuery({
      openProductIdFromQuery,
      requestToken,
      refs,
      queryClient,
      setEditingProduct,
      setIsEditHydrating,
      handleMissingEditProduct,
      toast,
    });
  }, [
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

export const useOpenProductFromQueryHydration = (
  input: OpenProductFromQueryHydrationInput
): void => {
  const { editingProduct, openProductIdFromQuery, refs } = input;
  const resetClearedOpenProductQuery = useResetClearedOpenProductQuery(input);
  const hydrateOpenProductFromQuery = useHydrateOpenProductFromQuery(input);

  useEffect(() => {
    if (openProductIdFromQuery === '') {
      resetClearedOpenProductQuery();
      return;
    }
    if ((editingProduct?.id ?? '') === openProductIdFromQuery) return;
    if (refs.openingProductFromQueryRef.current === openProductIdFromQuery) return;
    hydrateOpenProductFromQuery();
  }, [
    editingProduct?.id,
    hydrateOpenProductFromQuery,
    openProductIdFromQuery,
    refs.openingProductFromQueryRef,
    resetClearedOpenProductQuery,
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
