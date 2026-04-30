'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getProductIds } from '@/features/products/api';
import { useBulkDeleteProductsMutation } from '@/features/products/hooks/useProductDataMutations';
import type { ProductFilters } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { RowSelectionState, SetStateAction } from './useProductListSelection.cache';

type ProductListSelectionSetter = (action: SetStateAction<RowSelectionState>) => void;
type ToastFn = ReturnType<typeof useToast>['toast'];
type DeleteProductsFn = (productIds: string[]) => Promise<unknown>;

export type PageSelectionHandlers = {
  handleSelectPage: () => void;
  handleDeselectPage: () => void;
};

export type GlobalSelectionHandler = {
  handleSelectAllGlobal: (filters: ProductFilters) => Promise<void>;
};

export type ProductListDeleteHandlers = {
  handleMassDelete: () => Promise<void>;
  handleConfirmSingleDelete: () => Promise<void>;
  bulkDeletePending: boolean;
};

const omitPaginationFilters = (filters: ProductFilters): ProductFilters => {
  const selectionFilters = { ...filters };
  delete selectionFilters.page;
  delete selectionFilters.pageSize;
  return selectionFilters;
};

const isQueuedDeleteResult = (result: unknown): boolean =>
  result === null || result === undefined;

const useMassDeleteHandler = (input: {
  rowSelection: RowSelectionState;
  setRowSelection: ProductListSelectionSetter;
  setIsMassDeleteConfirmOpen: (action: SetStateAction<boolean>) => void;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  setActionError: (error: string | null) => void;
  deleteProducts: DeleteProductsFn;
  toast: ToastFn;
}): (() => Promise<void>) => {
  const {
    rowSelection,
    setRowSelection,
    setIsMassDeleteConfirmOpen,
    setRefreshTrigger,
    setActionError,
    deleteProducts,
    toast,
  } = input;

  return useCallback(async (): Promise<void> => {
    const selectedProductIds = Object.keys(rowSelection).filter(
      (id: string) => rowSelection[id] === true
    );
    if (selectedProductIds.length === 0) return;

    try {
      setIsMassDeleteConfirmOpen(false);
      const result = await deleteProducts(selectedProductIds);
      if (!isQueuedDeleteResult(result)) {
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
  }, [
    rowSelection,
    setActionError,
    toast,
    deleteProducts,
    setRefreshTrigger,
    setIsMassDeleteConfirmOpen,
    setRowSelection,
  ]);
};

const useSingleDeleteHandler = (input: {
  productToDelete: ProductWithImages | null;
  setProductToDelete: (action: SetStateAction<ProductWithImages | null>) => void;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  setActionError: (error: string | null) => void;
  deleteProducts: DeleteProductsFn;
  toast: ToastFn;
}): (() => Promise<void>) => {
  const {
    productToDelete,
    setProductToDelete,
    setRefreshTrigger,
    setActionError,
    deleteProducts,
    toast,
  } = input;

  return useCallback(async (): Promise<void> => {
    if (productToDelete === null) return;
    const targetId = productToDelete.id;
    setProductToDelete(null);
    try {
      const result = await deleteProducts([targetId]);
      if (!isQueuedDeleteResult(result)) {
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
  }, [productToDelete, setActionError, toast, deleteProducts, setRefreshTrigger, setProductToDelete]);
};

export const usePageSelectionHandlers = (
  data: ProductWithImages[],
  setRowSelection: ProductListSelectionSetter
): PageSelectionHandlers => {
  const handleSelectPage = useCallback((): void => {
    setRowSelection((previousSelection) => {
      const nextSelection = { ...previousSelection };
      data.forEach((item) => {
        nextSelection[item.id] = true;
      });
      return nextSelection;
    });
  }, [data, setRowSelection]);

  const handleDeselectPage = useCallback((): void => {
    setRowSelection((previousSelection) => {
      const nextSelection = { ...previousSelection };
      data.forEach((item) => {
        delete nextSelection[item.id];
      });
      return nextSelection;
    });
  }, [data, setRowSelection]);

  return { handleSelectPage, handleDeselectPage };
};

export const useGlobalSelectionHandler = (
  setRowSelection: ProductListSelectionSetter,
  setLoadingGlobalSelection: (action: SetStateAction<boolean>) => void
): GlobalSelectionHandler => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSelectAllGlobal = useCallback(
    async (filters: ProductFilters): Promise<void> => {
      setLoadingGlobalSelection(true);
      try {
        const selectionFilters = omitPaginationFilters(filters);
        const queryKey = normalizeQueryKey([
          'products',
          'ids',
          { scope: 'all', ...selectionFilters },
        ]);
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
    [queryClient, setLoadingGlobalSelection, setRowSelection, toast]
  );

  return { handleSelectAllGlobal };
};

export const useProductListDeleteHandlers = (input: {
  rowSelection: RowSelectionState;
  productToDelete: ProductWithImages | null;
  setRowSelection: ProductListSelectionSetter;
  setProductToDelete: (action: SetStateAction<ProductWithImages | null>) => void;
  setIsMassDeleteConfirmOpen: (action: SetStateAction<boolean>) => void;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  setActionError: (error: string | null) => void;
}): ProductListDeleteHandlers => {
  const {
    rowSelection,
    productToDelete,
    setRowSelection,
    setProductToDelete,
    setIsMassDeleteConfirmOpen,
    setRefreshTrigger,
    setActionError,
  } = input;
  const { toast } = useToast();
  const bulkDeleteMutation = useBulkDeleteProductsMutation();
  const deleteProducts = bulkDeleteMutation.mutateAsync;
  const handleMassDelete = useMassDeleteHandler({
    rowSelection,
    setRowSelection,
    setIsMassDeleteConfirmOpen,
    setRefreshTrigger,
    setActionError,
    deleteProducts,
    toast,
  });
  const handleConfirmSingleDelete = useSingleDeleteHandler({
    productToDelete,
    setProductToDelete,
    setRefreshTrigger,
    setActionError,
    deleteProducts,
    toast,
  });

  return {
    handleMassDelete,
    handleConfirmSingleDelete,
    bulkDeletePending: bulkDeleteMutation.isPending,
  };
};
