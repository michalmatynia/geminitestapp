'use client';

import type { ProductFilters } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  useGlobalSelectionHandler,
  usePageSelectionHandlers,
  useProductListDeleteHandlers,
} from './useProductListSelection.actions';
import {
  useProductListSelectionCache,
  type RowSelectionState,
  type SetStateAction,
} from './useProductListSelection.cache';

export type { RowSelectionState };

export type ProductListSelectionResult = {
  rowSelection: RowSelectionState;
  setRowSelection: (action: SetStateAction<RowSelectionState>) => void;
  handleSelectPage: () => void;
  handleDeselectPage: () => void;
  handleSelectAllGlobal: (filters: ProductFilters) => Promise<void>;
  loadingGlobalSelection: boolean;
  isMassDeleteConfirmOpen: boolean;
  setIsMassDeleteConfirmOpen: (action: SetStateAction<boolean>) => void;
  handleMassDelete: () => Promise<void>;
  productToDelete: ProductWithImages | null;
  setProductToDelete: (action: SetStateAction<ProductWithImages | null>) => void;
  handleConfirmSingleDelete: () => Promise<void>;
  bulkDeletePending: boolean;
};

export function useProductListSelection({
  data,
  setRefreshTrigger,
  setActionError,
}: {
  data: ProductWithImages[];
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  setActionError: (error: string | null) => void;
}): ProductListSelectionResult {
  const selectionCache = useProductListSelectionCache();
  const pageHandlers = usePageSelectionHandlers(data, selectionCache.setRowSelection);
  const globalHandler = useGlobalSelectionHandler(
    selectionCache.setRowSelection,
    selectionCache.setLoadingGlobalSelection
  );
  const deleteHandlers = useProductListDeleteHandlers({
    rowSelection: selectionCache.rowSelection,
    productToDelete: selectionCache.productToDelete,
    setRowSelection: selectionCache.setRowSelection,
    setProductToDelete: selectionCache.setProductToDelete,
    setIsMassDeleteConfirmOpen: selectionCache.setIsMassDeleteConfirmOpen,
    setRefreshTrigger,
    setActionError,
  });

  return {
    rowSelection: selectionCache.rowSelection,
    setRowSelection: selectionCache.setRowSelection,
    handleSelectPage: pageHandlers.handleSelectPage,
    handleDeselectPage: pageHandlers.handleDeselectPage,
    handleSelectAllGlobal: globalHandler.handleSelectAllGlobal,
    loadingGlobalSelection: selectionCache.loadingGlobalSelection,
    isMassDeleteConfirmOpen: selectionCache.isMassDeleteConfirmOpen,
    setIsMassDeleteConfirmOpen: selectionCache.setIsMassDeleteConfirmOpen,
    handleMassDelete: deleteHandlers.handleMassDelete,
    productToDelete: selectionCache.productToDelete,
    setProductToDelete: selectionCache.setProductToDelete,
    handleConfirmSingleDelete: deleteHandlers.handleConfirmSingleDelete,
    bulkDeletePending: deleteHandlers.bulkDeletePending,
  };
}
