'use client';

import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';

export type RowSelectionState = Record<string, boolean>;
export type SetStateAction<TState> = TState | ((previousState: TState) => TState);

export type CachedProductListSelectionState = {
  rowSelection: RowSelectionState;
  setRowSelection: (action: SetStateAction<RowSelectionState>) => void;
  loadingGlobalSelection: boolean;
  setLoadingGlobalSelection: (action: SetStateAction<boolean>) => void;
  isMassDeleteConfirmOpen: boolean;
  setIsMassDeleteConfirmOpen: (action: SetStateAction<boolean>) => void;
  productToDelete: ProductWithImages | null;
  setProductToDelete: (action: SetStateAction<ProductWithImages | null>) => void;
};

const PRODUCT_LIST_ROW_SELECTION_QUERY_KEY = ['products', 'list', 'ui', 'rowSelection'] as const;
const PRODUCT_LIST_LOADING_GLOBAL_QUERY_KEY = [
  'products',
  'list',
  'ui',
  'loadingGlobalSelection',
] as const;
const PRODUCT_LIST_MASS_DELETE_MODAL_QUERY_KEY = [
  'products',
  'list',
  'ui',
  'massDeleteConfirmOpen',
] as const;
const PRODUCT_LIST_PENDING_DELETE_QUERY_KEY = [
  'products',
  'list',
  'ui',
  'pendingDeleteProduct',
] as const;

const resolveStateAction = <TState>(
  action: SetStateAction<TState>,
  previousState: TState
): TState =>
  typeof action === 'function'
    ? (action as (previousState: TState) => TState)(previousState)
    : action;

const useCachedSelectionState = <TState,>(
  queryKey: QueryKey,
  initialData: TState
): [TState, (action: SetStateAction<TState>) => void] => {
  const queryClient = useQueryClient();
  const { data = initialData } = useSingleQueryV2<TState>({
    queryKey,
    queryFn: () => Promise.resolve(initialData),
    initialData,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    meta: {
      source: 'products.hooks.useProductListSelectionCache',
      operation: 'detail',
      resource: 'products.list-ui-state',
      domain: 'products',
      queryKey,
      tags: ['products', 'list', 'ui-state'],
      description: 'Stores products list UI state in the query cache.',
      errorPresentation: 'silent',
    },
  });
  const setState = useCallback(
    (action: SetStateAction<TState>): void => {
      queryClient.setQueryData<TState>(queryKey, (previous) =>
        resolveStateAction(action, previous ?? initialData)
      );
    },
    [initialData, queryClient, queryKey]
  );

  return [data, setState];
};

export const useProductListSelectionCache = (): CachedProductListSelectionState => {
  const [rowSelection, setRowSelection] = useCachedSelectionState<RowSelectionState>(
    PRODUCT_LIST_ROW_SELECTION_QUERY_KEY,
    {}
  );
  const [loadingGlobalSelection, setLoadingGlobalSelection] = useCachedSelectionState<boolean>(
    PRODUCT_LIST_LOADING_GLOBAL_QUERY_KEY,
    false
  );
  const [isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen] =
    useCachedSelectionState<boolean>(PRODUCT_LIST_MASS_DELETE_MODAL_QUERY_KEY, false);
  const [productToDelete, setProductToDelete] = useCachedSelectionState<ProductWithImages | null>(
    PRODUCT_LIST_PENDING_DELETE_QUERY_KEY,
    null
  );

  return {
    rowSelection,
    setRowSelection,
    loadingGlobalSelection,
    setLoadingGlobalSelection,
    isMassDeleteConfirmOpen,
    setIsMassDeleteConfirmOpen,
    productToDelete,
    setProductToDelete,
  };
};
