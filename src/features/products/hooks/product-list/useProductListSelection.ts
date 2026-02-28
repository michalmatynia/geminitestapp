'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getProducts } from '@/features/products/api';
import { getProductListQueryKey } from '@/features/products/hooks/productCache';
import { useBulkDeleteProductsMutation } from '@/features/products/hooks/useProductData';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { useToast } from '@/shared/ui';
import type { ProductWithImages, ProductFilters } from '@/shared/contracts/products';

export type RowSelectionState = Record<string, boolean>;

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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [loadingGlobalSelection, setLoadingGlobalSelection] = useState(false);
  const [isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithImages | null>(null);

  const bulkDeleteMutation = useBulkDeleteProductsMutation();

  const selectedCount = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]).length,
    [rowSelection]
  );

  const handleSelectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((item) => {
      newSelection[item.id] = true;
    });
    setRowSelection(newSelection);
  }, [data, rowSelection]);

  const handleDeselectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((item) => {
      delete newSelection[item.id];
    });
    setRowSelection(newSelection);
  }, [data, rowSelection]);

  const handleSelectAllGlobal = useCallback(
    async (filters: ProductFilters) => {
      setLoadingGlobalSelection(true);
      try {
        const allProducts = await queryClient.fetchQuery({
          queryKey: normalizeQueryKey(getProductListQueryKey({ scope: 'all', ...filters })),
          queryFn: () => getProducts(filters),
        });

        const newSelection: RowSelectionState = {};
        allProducts.forEach((p: ProductWithImages) => {
          newSelection[p.id] = true;
        });
        setRowSelection(newSelection);
        toast(`Selected ${allProducts.length} products.`, { variant: 'success' });
      } catch (error) {
        logClientError(error, {
          context: { source: 'useProductListSelection', action: 'selectAllGlobal' },
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
      logClientError(error, {
        context: {
          source: 'useProductListSelection',
          action: 'massDelete',
          productIds: selectedProductIds,
        },
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
      logClientError(error, {
        context: { source: 'useProductListSelection', action: 'singleDelete', productId: targetId },
      });
      setActionError(error instanceof Error ? error.message : 'An error occurred during deletion.');
    }
  }, [productToDelete, setActionError, toast, bulkDeleteMutation, setRefreshTrigger]);

  return {
    rowSelection,
    setRowSelection,
    selectedCount,
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
