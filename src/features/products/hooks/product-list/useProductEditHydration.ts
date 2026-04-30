'use client';
'use no memo';

import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, useSyncExternalStore } from 'react';

import {
  findCachedProductSnapshotById,
  resolveExactProductIdBySku,
  shouldAdoptIncomingEditProductDetail,
  shouldEnableLiveEditProductDetailQuery,
} from './useProductEditHydration.cache';
import { useEditingProductDetailQuery } from './useProductEditHydration.detailQuery';
import {
  useAdoptIncomingEditProductDetail,
  useMissingEditProductHandler,
  useMissingLiveEditProductEffect,
  useOpenProductFromQueryHydration,
  useResetEditHydrationWhenClosed,
} from './useProductEditHydration.effects';
import { useProductEditOpenActions } from './useProductEditHydration.open';
import { useProductDetailPrefetch } from './useProductEditHydration.prefetch';
import {
  getSearchServerSnapshot,
  getSearchSnapshot,
  subscribeToSearchParams,
} from './useProductEditHydration.search';
import type {
  ProductEditHydrationInput,
  ProductEditHydrationRefs,
  ProductEditHydrationResult,
} from './useProductEditHydration.types';
import { useToast } from '@/shared/ui/toast';

export {
  findCachedProductSnapshotById,
  resolveExactProductIdBySku,
  shouldAdoptIncomingEditProductDetail,
  shouldEnableLiveEditProductDetailQuery,
};

export function useProductEditHydration(
  input: ProductEditHydrationInput
): ProductEditHydrationResult {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditHydrating, setIsEditHydrating] = useState(false);
  const editOpenRequestTokenRef = useRef(0);
  const openingProductFromQueryRef = useRef<string | null>(null);
  const refs: ProductEditHydrationRefs = { editOpenRequestTokenRef, openingProductFromQueryRef };
  const openProductIdFromQuery = useSyncExternalStore(
    subscribeToSearchParams,
    getSearchSnapshot,
    getSearchServerSnapshot
  );
  const editingProductDetailQuery = useEditingProductDetailQuery(input.editingProduct);
  const handleMissingEditProduct = useMissingEditProductHandler({
    refs,
    setEditingProduct: input.setEditingProduct,
    setIsEditHydrating,
    clearProductEditorQueryParams: input.clearProductEditorQueryParams,
    toast,
    setRefreshTrigger: input.setRefreshTrigger,
  });
  const prefetchProductDetail = useProductDetailPrefetch(queryClient);
  const { handleOpenEditModal, handleCloseEdit } = useProductEditOpenActions({
    ...input,
    queryClient,
    refs,
    setIsEditHydrating,
    toast,
    handleMissingEditProduct,
  });

  useAdoptIncomingEditProductDetail({ ...input, editingProductDetailQuery, isEditHydrating });
  useResetEditHydrationWhenClosed({ editingProduct: input.editingProduct, refs, setIsEditHydrating });
  useOpenProductFromQueryHydration({
    ...input,
    openProductIdFromQuery,
    refs,
    queryClient,
    setIsEditHydrating,
    handleMissingEditProduct,
    toast,
  });
  useMissingLiveEditProductEffect({
    editingProduct: input.editingProduct,
    editingProductDetailQuery,
    handleMissingEditProduct,
  });

  return {
    isEditHydrating,
    handleOpenEditModal,
    handleCloseEdit,
    prefetchProductDetail,
    editingProductDetailQuery,
  };
}
