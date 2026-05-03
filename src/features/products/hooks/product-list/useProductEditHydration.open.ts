import type { QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { handleEditProductFetchError } from './useProductEditHydration.errors';
import {
  type ProductDetailQueryKeys,
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

type ProductEditFetchErrorHandler = (
  error: unknown,
  requestToken: number,
  clearHydrationOnError: boolean
) => void;

const useProductEditFetchErrorHandler = (
  input: Pick<
    ProductEditOpenActionsInput,
    'refs' | 'handleMissingEditProduct' | 'setIsEditHydrating' | 'toast'
  >
): ProductEditFetchErrorHandler => {
  const { handleMissingEditProduct, refs, setIsEditHydrating, toast } = input;
  return useCallback(
    (error: unknown, requestToken: number, clearHydrationOnError: boolean): void => {
      handleEditProductFetchError({
        error,
        editOpenRequestTokenRef: refs.editOpenRequestTokenRef,
        requestToken,
        handleMissingEditProduct,
        setIsEditHydrating,
        toast,
        clearHydrationOnError,
      });
    },
    [handleMissingEditProduct, refs.editOpenRequestTokenRef, setIsEditHydrating, toast]
  );
};

const openCachedEditProduct = (input: {
  cachedData: ProductWithImages;
  keys: ProductDetailQueryKeys;
  productId: string;
  queryClient: QueryClient;
  requestToken: number;
  setEditingProduct: ProductEditHydrationInput['setEditingProduct'];
  setIsEditHydrating: React.Dispatch<React.SetStateAction<boolean>>;
  handleFetchError: ProductEditFetchErrorHandler;
}): void => {
  input.queryClient.setQueryData(input.keys.detailEditQueryKey, input.cachedData);
  input.setEditingProduct(markEditingProductHydrated(input.cachedData));
  input.setIsEditHydrating(false);
  void fetchFreshEditProductDetail({
    queryClient: input.queryClient,
    productId: input.productId,
    queryKey: input.keys.detailEditQueryKey,
    source: 'products.hooks.useProductEditHydration.handleOpenEditModal.cachedRefresh',
    tags: ['products', 'detail', 'edit', 'fetch', 'cached-refresh'],
  })
    .then((freshProduct: ProductWithImages) => {
      input.queryClient.setQueryData(input.keys.detailQueryKey, freshProduct);
    })
    .catch((error: unknown) => input.handleFetchError(error, input.requestToken, false));
};

const openFreshEditProduct = (input: {
  product: ProductWithImages;
  keys: ProductDetailQueryKeys;
  queryClient: QueryClient;
  requestToken: number;
  refs: ProductEditHydrationRefs;
  setEditingProduct: ProductEditHydrationInput['setEditingProduct'];
  setIsEditHydrating: React.Dispatch<React.SetStateAction<boolean>>;
  handleFetchError: ProductEditFetchErrorHandler;
}): void => {
  input.setEditingProduct(input.product);
  input.setIsEditHydrating(true);
  void fetchFreshEditProductDetail({
    queryClient: input.queryClient,
    productId: input.product.id,
    queryKey: input.keys.detailEditQueryKey,
    source: 'products.hooks.useProductEditHydration.handleOpenEditModal',
    tags: ['products', 'detail', 'edit', 'fetch'],
  })
    .then((freshProduct: ProductWithImages) => {
      input.queryClient.setQueryData(input.keys.detailQueryKey, freshProduct);
      if (input.refs.editOpenRequestTokenRef.current !== input.requestToken) return;
      input.setEditingProduct(markEditingProductHydrated(freshProduct));
      input.setIsEditHydrating(false);
    })
    .catch((error: unknown) => input.handleFetchError(error, input.requestToken, true));
};

const useOpenEditModalHandler = (
  input: Omit<ProductEditOpenActionsInput, 'clearProductEditorQueryParams'>
): ((product: ProductWithImages) => void) => {
  const { queryClient, refs, setActionError, setEditingProduct, setIsEditHydrating } = input;
  const handleFetchError = useProductEditFetchErrorHandler(input);

  return useCallback(
    (product: ProductWithImages): void => {
      setActionError(null);
      refs.editOpenRequestTokenRef.current += 1;
      const requestToken = refs.editOpenRequestTokenRef.current;
      const cached = readFreshCachedEditProductDetail(queryClient, product.id);

      if (cached.cachedData !== undefined) {
        openCachedEditProduct({
          cachedData: cached.cachedData,
          keys: cached.keys,
          productId: product.id,
          queryClient,
          requestToken,
          setEditingProduct,
          setIsEditHydrating,
          handleFetchError,
        });
        return;
      }

      openFreshEditProduct({
        product,
        keys: cached.keys,
        queryClient,
        requestToken,
        refs,
        setEditingProduct,
        setIsEditHydrating,
        handleFetchError,
      });
    },
    [handleFetchError, queryClient, refs, setActionError, setEditingProduct, setIsEditHydrating]
  );
};

const useCloseEditHandler = (
  input: Pick<
    ProductEditOpenActionsInput,
    'clearProductEditorQueryParams' | 'refs' | 'setEditingProduct' | 'setIsEditHydrating'
  >
): (() => void) => {
  const { clearProductEditorQueryParams, refs, setEditingProduct, setIsEditHydrating } = input;
  return useCallback((): void => {
    refs.editOpenRequestTokenRef.current += 1;
    refs.openingProductFromQueryRef.current = null;
    setEditingProduct(null);
    setIsEditHydrating(false);
    clearProductEditorQueryParams();
  }, [clearProductEditorQueryParams, refs, setEditingProduct, setIsEditHydrating]);
};

export const useProductEditOpenActions = (
  input: ProductEditOpenActionsInput
): {
  handleOpenEditModal: (product: ProductWithImages) => void;
  handleCloseEdit: () => void;
} => {
  const handleOpenEditModal = useOpenEditModalHandler(input);
  const handleCloseEdit = useCloseEditHandler(input);

  return {
    handleOpenEditModal,
    handleCloseEdit,
  };
};
