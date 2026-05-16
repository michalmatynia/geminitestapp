'use client';

import {
  type ProfilerOnRenderCallback,
  type ReactNode,
  useCallback,
  useMemo,
} from 'react';
import type { Row } from '@tanstack/react-table';

import { ProductTableSkeleton } from '@/features/products/components/list/ProductTableSkeleton';
import type { ProductFilters } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  logProductListDebug,
} from '@/features/products/lib/product-list-observability';

import {
  applyProductListAdvancedFilterState,
  applyProductListPageSizeChange,
} from './productListStateHelpers';
import type { useProductListDataState } from './useProductListState.data';
import type { useProductListModalState } from './useProductListState.modals';
import type { useProductListRuntimeState } from './useProductListState.runtime';
import type { ProductOperationInfo } from '../useProductOperations.helpers';

type ProductListDataState = ReturnType<typeof useProductListDataState>;
type ProductListModalState = ReturnType<typeof useProductListModalState>;
type ProductListRuntimeState = ReturnType<typeof useProductListRuntimeState>;

const optionalString = (value: string | undefined): string | undefined =>
  value !== undefined && value.length > 0 ? value : undefined;

const resolveBaseExportedFilter = (value: '' | 'true' | 'false'): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const resolveStockOperatorFilter = (
  value: ProductListDataState['productData']['stockOperator']
): ProductFilters['stockOperator'] => (value === '' ? 'eq' : value);

const buildSelectAllProductFilters = (data: ProductListDataState): ProductFilters => {
  const productData = data.productData;
  if (productData.parsedMatchProductIds.length > 0) {
    return {
      ids: productData.parsedMatchProductIds,
      searchLanguage: data.preferencesState.preferences.nameLocale,
    };
  }
  return {
    search: productData.search,
    id: optionalString(productData.productId),
    idMatchMode: productData.productId.length > 0 ? productData.idMatchMode : undefined,
    sku: productData.sku,
    description: productData.description,
    categoryId: optionalString(productData.categoryId),
    minPrice: productData.minPrice,
    maxPrice: productData.maxPrice,
    stockValue: productData.stockValue,
    stockOperator:
      productData.stockValue !== undefined
        ? resolveStockOperatorFilter(productData.stockOperator)
        : undefined,
    startDate: optionalString(productData.startDate),
    endDate: optionalString(productData.endDate),
    advancedFilter: optionalString(productData.advancedFilter),
    catalogId: productData.catalogFilter === 'all' ? undefined : productData.catalogFilter,
    searchLanguage: data.preferencesState.preferences.nameLocale,
    baseExported: resolveBaseExportedFilter(productData.baseExported),
    archived: productData.includeArchived ? undefined : false,
  };
};

const useProductListPreferenceCallbacks = (
  data: ProductListDataState
): {
  handleSetAdvancedFilter: (value: string) => void;
  handleSetAdvancedFilterState: (value: string, presetId: string | null) => void;
  handleSetCatalogPreference: (filter: string) => void;
  handleSetCurrencyPreference: (code: string) => void;
  handleSetNameLocale: (locale: 'name_en' | 'name_pl' | 'name_de') => void;
  handleSetPageSize: (size: number) => void;
  handleSetShowTriggerRunFeedback: (show: boolean) => void;
} => {
  const handleSetPageSize = useCallback((size: number): void => {
    applyProductListPageSizeChange({
      size,
      setLocalPageSize: data.productData.setPageSize,
      persistPageSize: data.preferencesState.setPageSize,
    });
  }, [data.productData.setPageSize, data.preferencesState.setPageSize]);
  const handleSetAdvancedFilterState = useCallback((value: string, presetId: string | null): void => {
    applyProductListAdvancedFilterState({
      value,
      presetId,
      setLocalState: data.productData.setAdvancedFilterState,
      persistState: data.preferencesState.setAppliedAdvancedFilterState,
    });
  }, [data.productData.setAdvancedFilterState, data.preferencesState.setAppliedAdvancedFilterState]);
  const handleSetAdvancedFilter = useCallback(
    (value: string): void => handleSetAdvancedFilterState(value, null),
    [handleSetAdvancedFilterState]
  );
  const handleSetNameLocale = useCallback(
    (locale: 'name_en' | 'name_pl' | 'name_de'): void => {
      void data.preferencesState.setNameLocale(locale);
    },
    [data.preferencesState]
  );
  const handleSetCurrencyPreference = useCallback((code: string): void => {
    data.catalogState.setCurrencyCode(code);
    void data.preferencesState.setCurrencyCode(code);
  }, [data.catalogState, data.preferencesState]);
  const handleSetCatalogPreference = useCallback((filter: string): void => {
    data.productData.setCatalogFilter(filter);
    void data.preferencesState.setCatalogFilter(filter);
  }, [data.preferencesState, data.productData]);
  const handleSetShowTriggerRunFeedback = useCallback((show: boolean): void => {
    data.setShowTriggerRunFeedback(show);
    void data.preferencesState.setShowTriggerRunFeedback(show);
  }, [data]);
  return {
    handleSetAdvancedFilter,
    handleSetAdvancedFilterState,
    handleSetCatalogPreference,
    handleSetCurrencyPreference,
    handleSetNameLocale,
    handleSetPageSize,
    handleSetShowTriggerRunFeedback,
  };
};

const useProductListSelectionCallbacks = (
  data: ProductListDataState,
  modal: ProductListModalState
): {
  handleDeleteSelectedOpen: () => Promise<void>;
  handleDismissActionError: () => void;
  handleDuplicateProduct: (product: ProductWithImages) => void;
  handleSelectAllVisibleProducts: () => Promise<void>;
} => {
  const handleDismissActionError = useCallback((): void => {
    modal.operations.setActionError(null);
  }, [modal.operations]);
  const handleSelectAllVisibleProducts = useCallback(async (): Promise<void> => {
    await modal.selection.handleSelectAllGlobal(buildSelectAllProductFilters(data));
  }, [data, modal.selection]);
  const handleDeleteSelectedOpen = useCallback((): Promise<void> => {
    modal.selection.setIsMassDeleteConfirmOpen(true);
    return Promise.resolve();
  }, [modal.selection]);
  const handleDuplicateProduct = useCallback(
    (product: ProductWithImages): void => modal.operations.handleOpenDuplicateModal(product),
    [modal.operations]
  );
  return {
    handleDeleteSelectedOpen,
    handleDismissActionError,
    handleDuplicateProduct,
    handleSelectAllVisibleProducts,
  };
};

const useProductListModalCallbacks = (
  modal: ProductListModalState
): {
  handleCloseCreateModal: () => void;
  handleCloseExportSettingsModal: () => void;
  handleCreateFromDraftOpen: (draftId: string) => void;
  handleCreateSuccessWithDraftReset: (info?: ProductOperationInfo) => void;
  handleListingsUpdated: () => void;
} => {
  const handleCreateFromDraftOpen = useCallback((draftId: string): void => {
    void modal.createDraftController.handleCreateFromDraft(draftId);
  }, [modal.createDraftController]);
  const handleCloseCreateModal = useCallback((): void => {
    modal.operations.setIsCreateOpen(false);
    modal.modals.setCreateDraft(null);
  }, [modal.modals, modal.operations]);
  const handleCreateSuccessWithDraftReset = useCallback((info?: ProductOperationInfo): void => {
    modal.operations.handleCreateSuccess(info);
    modal.modals.setCreateDraft(null);
  }, [modal.modals, modal.operations]);
  const handleCloseExportSettingsModal = useCallback((): void => {
    modal.modals.setExportSettingsProduct(null);
  }, [modal.modals]);
  const handleListingsUpdated = useCallback((): void => {
    void modal.modals.refreshListingBadges();
  }, [modal.modals]);
  return {
    handleCloseCreateModal,
    handleCloseExportSettingsModal,
    handleCreateFromDraftOpen,
    handleCreateSuccessWithDraftReset,
    handleListingsUpdated,
  };
};

const useProductListTableCallbacks = (
  data: ProductListDataState,
  modal: ProductListModalState,
  runtime: ProductListRuntimeState
): {
  getProductRowId: (row: ProductWithImages) => string;
  getRowClassName: (row: Row<ProductWithImages>) => string | undefined;
  handleProductsTableRender: ProfilerOnRenderCallback;
  tableSkeleton: ReactNode;
} => {
  const getRowClassName = useCallback((row: Row<ProductWithImages>): string | undefined => {
    const highlightToken = modal.highlights.jobCompletionHighlights[row.original.id];
    if (highlightToken === undefined) return undefined;
    return highlightToken % 2 === 0
      ? 'product-list-row-job-complete-highlight-a'
      : 'product-list-row-job-complete-highlight-b';
  }, [modal.highlights.jobCompletionHighlights]);
  const tableSkeletonRows = runtime.isMounted ? data.productData.pageSize : 12;
  const tableSkeleton = useMemo(
    () => <ProductTableSkeleton rows={tableSkeletonRows} />,
    [tableSkeletonRows]
  );
  const getProductRowId = useCallback((row: ProductWithImages): string => row.id, []);
  const handleProductsTableRender = useProductsTableRenderCallback(data, runtime);
  return { getProductRowId, getRowClassName, handleProductsTableRender, tableSkeleton };
};

const useProductsTableRenderCallback = (
  data: ProductListDataState,
  runtime: ProductListRuntimeState
): ProfilerOnRenderCallback => {
  const handleProductsTableRender = useCallback<ProfilerOnRenderCallback>(
    (...renderArgs: Parameters<ProfilerOnRenderCallback>) => {
      const [id, phase, actualDuration, baseDuration, startTime, commitTime] = renderArgs;
      if (data.isProductListDebugOpen !== true && runtime.isDebugOpen !== true) return;
      try {
        if (typeof performance !== 'undefined') {
          performance.measure('products:tableRender', {
            start: commitTime - actualDuration,
            end: commitTime,
          });
        }
      } catch (error) {
        logProductListDebug('products-table-render-measure-failed', {
          id,
          phase,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
      logProductListDebug(
        'products-table-render',
        {
          id,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
          visibleCount: data.visibleData.length,
          isLoading: data.productData.isLoading,
          isFetching: data.productData.isFetching,
          queuedProductIdsCount: data.queuedProductIds.size,
          trackedAiRunsCount: data.productAiRunStatusByProductId.size,
        },
        { dedupeKey: 'products-table-render', throttleMs: 500 }
      );
    },
    [data, runtime.isDebugOpen]
  );
  return handleProductsTableRender;
};

export const useProductListCallbacks = (
  data: ProductListDataState,
  modal: ProductListModalState,
  runtime: ProductListRuntimeState
): ReturnType<typeof useProductListPreferenceCallbacks> &
  ReturnType<typeof useProductListSelectionCallbacks> &
  ReturnType<typeof useProductListModalCallbacks> &
  ReturnType<typeof useProductListTableCallbacks> => ({
  ...useProductListPreferenceCallbacks(data),
  ...useProductListSelectionCallbacks(data, modal),
  ...useProductListModalCallbacks(modal),
  ...useProductListTableCallbacks(data, modal, runtime),
});
