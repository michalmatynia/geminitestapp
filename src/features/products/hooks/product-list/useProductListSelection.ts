'use client';

// useProductListSelection: manages table row selection state (single/multi),
// keyboard modifiers, and helper APIs for bulk actions. Exposes stable
// selection state suitable for passing into the table component and
// integrates with URL/state persistence where necessary.

// useProductListSelection: manages per-row selection state and global selection
// operations for the product list. Provides helpers to select the current page,
// select all matches (server-side via an API query), and orchestrates bulk
// deletions with optimistic UI behavior and toast/error reporting.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getProductIds } from '@/features/products/api';
import { useBulkDeleteProductsMutation } from '@/features/products/hooks/useProductDataMutations';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductFilters } from '@/shared/contracts/products/drafts';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export type RowSelectionState = Record<string, boolean>;
type SetStateAction<TState> = TState | ((previousState: TState) => TState);

const PRODUCT_LIST_ROW_SELECTION_QUERY_KEY = ['products', 'list', 'ui', 'rowSelection'] as const;
const PRODUCT_LIST_LOADING_GLOBAL_QUERY_KEY = ['products', 'list', 'ui', 'loadingGlobalSelection'] as const;
const PRODUCT_LIST_MASS_DELETE_MODAL_QUERY_KEY = ['products', 'list', 'ui', 'massDeleteConfirmOpen'] as const;
const PRODUCT_LIST_PENDING_DELETE_QUERY_KEY = ['products', 'list', 'ui', 'pendingDeleteProduct'] as const;

const resolveStateAction = <TState>(
  action: SetStateAction<TState>,
  previousState: TState
): TState =>
  typeof action === 'function'
    ? (action as (previousState: TState) => TState)(previousState)
    : action;

export function useProductListSelection({
  data,
  setRefreshTrigger,
  setActionError,
}: {
  data: ProductWithImages[];
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  setActionError: (error: string | null) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rowSelection = {} } = useQuery<RowSelectionState>({
    queryKey: PRODUCT_LIST_ROW_SELECTION_QUERY_KEY,
    queryFn: async () => ({}),
    initialData: {},
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  const { data: loadingGlobalSelection = false } = useQuery<boolean>({
    queryKey: PRODUCT_LIST_LOADING_GLOBAL_QUERY_KEY,
    queryFn: async () => false,
    initialData: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  const { data: isMassDeleteConfirmOpen = false } = useQuery<boolean>({
    queryKey: PRODUCT_LIST_MASS_DELETE_MODAL_QUERY_KEY,
    queryFn: async () => false,
    initialData: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  const { data: productToDelete = null } = useQuery<ProductWithImages | null>({
    queryKey: PRODUCT_LIST_PENDING_DELETE_QUERY_KEY,
    queryFn: async () => null,
    initialData: null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const setRowSelection = useCallback(
    (action: SetStateAction<RowSelectionState>): void => {
      queryClient.setQueryData<RowSelectionState>(PRODUCT_LIST_ROW_SELECTION_QUERY_KEY, (previous) =>
        resolveStateAction(action, previous ?? {})
      );
    },
    [queryClient]
  );
  const setLoadingGlobalSelection = useCallback(
    (action: SetStateAction<boolean>): void => {
      queryClient.setQueryData<boolean>(PRODUCT_LIST_LOADING_GLOBAL_QUERY_KEY, (previous) =>
        resolveStateAction(action, previous ?? false)
      );
    },
    [queryClient]
  );
  const setIsMassDeleteConfirmOpen = useCallback(
    (action: SetStateAction<boolean>): void => {
      queryClient.setQueryData<boolean>(PRODUCT_LIST_MASS_DELETE_MODAL_QUERY_KEY, (previous) =>
        resolveStateAction(action, previous ?? false)
      );
    },
    [queryClient]
  );
  const setProductToDelete = useCallback(
    (action: SetStateAction<ProductWithImages | null>): void => {
      queryClient.setQueryData<ProductWithImages | null>(PRODUCT_LIST_PENDING_DELETE_QUERY_KEY, (previous) =>
        resolveStateAction(action, previous ?? null)
      );
    },
    [queryClient]
  );

  const bulkDeleteMutation = useBulkDeleteProductsMutation();

  const handleSelectPage = useCallback(() => {
    setRowSelection((previousSelection) => {
      const nextSelection = { ...previousSelection };
      data.forEach((item) => {
        nextSelection[item.id] = true;
      });
      return nextSelection;
    });
  }, [data]);

  const handleDeselectPage = useCallback(() => {
    setRowSelection((previousSelection) => {
      const nextSelection = { ...previousSelection };
      data.forEach((item) => {
        delete nextSelection[item.id];
      });
      return nextSelection;
    });
  }, [data]);

  const handleSelectAllGlobal = useCallback(
    async (filters: ProductFilters) => {
      setLoadingGlobalSelection(true);
      try {
        const { page: _page, pageSize: _pageSize, ...selectionFilters } = filters;
        const queryKey = normalizeQueryKey(['products', 'ids', { scope: 'all', ...selectionFilters }]);
        const productIds = await fetchQueryV2<string[]>(queryClient, {
          queryKey,
          queryFn: () => getProductIds({ page: 1, pageSize: 20, ...selectionFilters }),
          staleTime: 5000,
          meta: {
            source: 'products.hooks.useProductListSelection.selectAllGlobal',
            operation: 'list',
            resource: 'products.ids.all',
            domain: 'products',
            queryKey,
            tags: ['products', 'ids', 'select-all'],
            description: 'Loads matching product ids for global selection.',
          },
        })();

        const newSelection: RowSelectionState = {};
        productIds.forEach((id: string) => {
          newSelection[id] = true;
        });
        setRowSelection(newSelection);
        toast(`Selected ${productIds.length} products.`, { variant: 'success' });
      } catch (error) {
        logClientCatch(error, {
          source: 'useProductListSelection',
          action: 'selectAllGlobal',
        });
        toast('Failed to select all products', { variant: 'error' });
      } finally {
        setLoadingGlobalSelection(false);
      }
    },
    [queryClient, toast]
  );

  const handleMassDelete = useCallback(async () => {
    const selectedProductIds = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);

    if (selectedProductIds.length === 0) return;

    try {
      setIsMassDeleteConfirmOpen(false);
      const result = await bulkDeleteMutation.mutateAsync(selectedProductIds);
      const isQueued = result == null;
      if (!isQueued) {
        toast('Selected products deleted successfully.', { variant: 'success' });
        setRowSelection({});
        setRefreshTrigger((prev: number) => prev + 1);
      }
    } catch (error) {
      logClientCatch(error, {
        source: 'useProductListSelection',
        action: 'massDelete',
        productIds: selectedProductIds,
      });
      setActionError(error instanceof Error ? error.message : 'An error occurred during deletion.');
    }
  }, [rowSelection, setActionError, toast, bulkDeleteMutation, setRefreshTrigger]);

  const handleConfirmSingleDelete = useCallback(async () => {
    if (!productToDelete) return;
    const targetId = productToDelete.id;
    setProductToDelete(null);
    try {
      const result = await bulkDeleteMutation.mutateAsync([targetId]);
      const isQueued = result == null;
      if (!isQueued) {
        toast('Product deleted successfully.', { variant: 'success' });
        setRefreshTrigger((prev: number) => prev + 1);
      }
    } catch (error) {
      logClientCatch(error, {
        source: 'useProductListSelection',
        action: 'singleDelete',
        productId: targetId,
      });
      setActionError(error instanceof Error ? error.message : 'An error occurred during deletion.');
    }
  }, [productToDelete, setActionError, toast, bulkDeleteMutation, setRefreshTrigger]);

  return {
    rowSelection,
    setRowSelection,
    handleSelectPage,
    handleDeselectPage,
    handleSelectAllGlobal,
    loadingGlobalSelection,
    isMassDeleteConfirmOpen,
    setIsMassDeleteConfirmOpen,
    handleMassDelete,
    productToDelete,
    setProductToDelete,
    handleConfirmSingleDelete,
    bulkDeletePending: bulkDeleteMutation.isPending,
  };
}
