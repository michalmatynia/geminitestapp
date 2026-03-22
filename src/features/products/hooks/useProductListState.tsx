'use client';

import { ProfilerOnRenderCallback, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { getProductColumns } from '@/features/products/components/list/ProductColumns';
import { ProductTableSkeleton } from '@/features/products/components/list/ProductTableSkeleton';
import { useCatalogSync } from '@/features/products/hooks/useCatalogSync';
import { useProductData } from '@/features/products/hooks/useProductData';
import { useProductSync } from '@/features/products/hooks/useProductEnhancements';
import { useProductOperations } from '@/features/products/hooks/useProductOperations';
import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import * as queuedProductOps from '@/features/products/state/queued-product-ops';
import type { ProductWithImages, ProductDraft } from '@/shared/contracts/products';
import type { ListQuery } from '@/shared/contracts/ui';
import { useDraftQueries } from '@/shared/hooks/useDraftQueries';
import { useProductListSync } from '@/shared/hooks/sync/useBackgroundSync';
import { useToast } from '@/shared/ui';

import { useProductEditHydration } from './product-list/useProductEditHydration';
import { useProductListCategories } from './product-list/useProductListCategories';
import { useProductListFilters } from './product-list/useProductListFilters';
import { useProductListHighlights } from './product-list/useProductListHighlights';
import { useProductListIntegrations } from './product-list/useProductListIntegrations';
import { useProductListListingStatuses } from './product-list/useProductListListingStatuses';
import { useProductListModals } from './product-list/useProductListModals';
import { useProductListQueueStatus } from './product-list/useProductListQueueStatus';
import { useProductListSelection } from './product-list/useProductListSelection';
import { useProductListUrlSync } from './product-list/useProductListUrlSync';
import { useCreateFromDraft } from './useCreateFromDraft';
import { useProductAiPathsRunSync } from './useProductAiPathsRunSync';

import type { ProductListContextType } from '../context/ProductListContext';
import type { Row } from '@tanstack/react-table';

export { shouldAdoptIncomingEditProductDetail } from './product-list/useProductEditHydration';

const subscribeToSearchParams = (callback: () => void): (() => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};
const getSearchParamsSnapshot = (): string =>
  typeof window !== 'undefined' ? window.location.search : '';
const getSearchParamsServerSnapshot = (): string => '';

function useStableSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribeToSearchParams, getSearchParamsSnapshot, getSearchParamsServerSnapshot);
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function applyProductListAdvancedFilterState(args: {
  value: string;
  presetId: string | null;
  setLocalState: (value: string, presetId: string | null) => void;
  persistState: (state: { advancedFilter: string; presetId: string | null }) => Promise<void>;
}): void {
  const normalizedValue = args.value.trim();
  const normalizedPresetId = normalizedValue.length > 0 ? args.presetId : null;

  args.setLocalState(normalizedValue, normalizedPresetId);
  void args.persistState({
    advancedFilter: normalizedValue,
    presetId: normalizedPresetId,
  });
}

export function useProductListState(): ProductListContextType & {
  isDebugOpen: boolean;
  isMounted: boolean;
  productToDelete: ProductWithImages | null;
  setProductToDelete: (product: ProductWithImages | null) => void;
  isMassDeleteConfirmOpen: boolean;
  setIsMassDeleteConfirmOpen: (open: boolean) => void;
  handleMassDelete: () => Promise<void>;
  handleConfirmSingleDelete: () => Promise<void>;
  bulkDeletePending: boolean;
  } {
  const searchParams = useStableSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const { imageExternalBaseUrl } = useProductSettings();

  const useQueuedAiRunProductIdsHook =
    queuedProductOps.useQueuedAiRunProductIds ?? queuedProductOps.useQueuedProductIds;

  const queuedProductIds = useQueuedAiRunProductIdsHook
    ? useQueuedAiRunProductIdsHook()
    : new Set<string>();

  useProductSync();
  const productAiRunStatusByProductId = useProductAiPathsRunSync();

  const {
    preferences,
    loading: preferencesLoading,
    setNameLocale: updateNameLocale,
    setCatalogFilter: updateCatalogFilter,
    setCurrencyCode: updateCurrencyCode,
    setPageSize: updatePageSize,
    setShowTriggerRunFeedback: updateShowTriggerRunFeedback,
    setAppliedAdvancedFilterState: persistAppliedAdvancedFilterState,
  } = useUserPreferences();

  const [showTriggerRunFeedback, setShowTriggerRunFeedback] = useState(
    preferences.showTriggerRunFeedback ?? true
  );

  const { catalogs, currencyCode, setCurrencyCode, currencyOptions, priceGroups, languageOptions } =
    useCatalogSync(preferences.catalogFilter || 'all', {
      enabled: !preferencesLoading,
    });

  const filters = useProductListFilters({
    updatePageSize,
    persistAppliedAdvancedFilterState,
  });

  const {
    data,
    totalPages,
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    productId,
    setProductId,
    idMatchMode,
    setIdMatchMode,
    sku,
    setSku,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    stockValue,
    setStockValue,
    stockOperator,
    setStockOperator,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    advancedFilter,
    activeAdvancedFilterPresetId,
    setAdvancedFilterState: setAdvancedFilterStateLocal,
    catalogFilter,
    setCatalogFilter,
    baseExported,
    setBaseExported,
    loadError,
    isLoading,
  } = useProductData({
    refreshTrigger,
    initialCatalogFilter: preferences.catalogFilter,
    initialPageSize: preferences.pageSize,
    initialAppliedAdvancedFilter: preferences.appliedAdvancedFilter,
    initialAppliedAdvancedFilterPresetId: preferences.appliedAdvancedFilterPresetId,
    preferencesLoaded: !preferencesLoading,
    currencyCode,
    priceGroups,
    searchLanguage: preferences.nameLocale,
  });
  const visibleData = useMemo(() => (isMounted ? data : []), [data, isMounted]);

  const visibleProductIdSet = useMemo(
    () => new Set(visibleData.map((product: ProductWithImages) => product.id)),
    [visibleData]
  );
  const visibleProductIds = useMemo(() => Array.from(visibleProductIdSet), [visibleProductIdSet]);

  const { categoryNameById } = useProductListCategories({
    data: visibleData,
    nameLocale: preferences.nameLocale,
  });

  useProductListSync(
    {
      search,
      sku,
      description,
      categoryId,
      minPrice,
      maxPrice,
      stockValue,
      stockOperator,
      startDate,
      endDate,
      advancedFilter,
      catalogFilter,
      baseExported,
      page,
      pageSize,
    },
    !isLoading
  );

  const {
    isCreateOpen,
    setIsCreateOpen,
    initialSku,
    editingProduct,
    setEditingProduct,
    actionError,
    setActionError,
    handleOpenCreateModal,
    handleOpenDuplicateModal,
    handleOpenCreateFromDraft,
    handleCreateSuccess,
    handleEditSuccess,
    handleEditSave,
    isPromptOpen,
    setIsPromptOpen,
    handleConfirmSku,
  } = useProductOperations(setRefreshTrigger);

  const selection = useProductListSelection({
    data: visibleData,
    setRefreshTrigger,
    setActionError,
  });

  const {
    rowSelection,
    setRowSelection,
    handleSelectAllGlobal,
    loadingGlobalSelection,
    isMassDeleteConfirmOpen,
    setIsMassDeleteConfirmOpen,
    handleMassDelete,
    productToDelete,
    setProductToDelete,
    handleConfirmSingleDelete,
    bulkDeletePending,
  } = selection;

  const integrations = useProductListIntegrations();
  const {
    prefetchIntegrationSelectionData,
    prefetchProductListingsData,
    refreshProductListingsData,
  } = integrations;

  const modals = useProductListModals({
    handleOpenCreateModal,
    prefetchIntegrationSelectionData,
    prefetchProductListingsData,
    refreshProductListingsData,
    visibleProductIds,
    rowSelection,
    toast,
  });

  const {
    createDraft,
    setCreateDraft,
    handleOpenCreate,
    handleOpenIntegrationsModal,
    handleOpenExportSettings,
    handleCloseIntegrations,
    handleCloseListProduct,
    handleListProductSuccess,
    handleStartListing,
    massListIntegration,
    massListProductIds,
    showIntegrationModal,
    handleCloseIntegrationModal,
    handleSelectIntegrationFromModal,
    handleCloseMassList,
    handleMassListSuccess,
    handleAddToMarketplace,
    integrationsProduct,
    showListProductModal,
    listProductPreset,
    integrationBadgeIds,
    integrationBadgeStatuses,
    traderaBadgeIds,
    traderaBadgeStatuses,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
  } = modals;

  const { handleCreateFromDraft } = useCreateFromDraft({
    setCreateDraft,
    handleOpenCreateFromDraft,
  });

  const urlSync = useProductListUrlSync();
  const { clearProductEditorQueryParams } = urlSync;

  const hydration = useProductEditHydration({
    editingProduct,
    setEditingProduct,
    setActionError,
    setRefreshTrigger,
    clearProductEditorQueryParams,
  });

  const { isEditHydrating, handleOpenEditModal, handleCloseEdit, prefetchProductDetail } =
    hydration;

  const highlights = useProductListHighlights();
  const { jobCompletionHighlights, triggerJobCompletionHighlight } = highlights;

  useProductListListingStatuses({
    data: visibleData,
    integrationBadgeStatuses,
    traderaBadgeStatuses,
    visibleProductIdSet,
    triggerJobCompletionHighlight,
  });

  useProductListQueueStatus({
    queuedProductIds,
    visibleProductIdSet,
    triggerJobCompletionHighlight,
  });

  useEffect(() => {
    if (!preferencesLoading && preferences.currencyCode) {
      setCurrencyCode(preferences.currencyCode);
    }
  }, [preferencesLoading, preferences.currencyCode, setCurrencyCode]);

  useEffect(() => {
    if (!preferencesLoading) {
      setShowTriggerRunFeedback(preferences.showTriggerRunFeedback ?? true);
    }
  }, [preferences.showTriggerRunFeedback, preferencesLoading]);

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getRowClassName = useCallback(
    (row: Row<ProductWithImages>): string | undefined => {
      const highlightToken = jobCompletionHighlights[row.original.id];
      if (!highlightToken) return undefined;

      return highlightToken % 2 === 0
        ? 'product-list-row-job-complete-highlight-a'
        : 'product-list-row-job-complete-highlight-b';
    },
    [jobCompletionHighlights]
  );

  const tableSkeletonRows = isMounted ? pageSize : 12;
  const tableSkeleton = useMemo(
    () => <ProductTableSkeleton rows={tableSkeletonRows} />,
    [tableSkeletonRows]
  );

  const handleProductsTableRender = useCallback<ProfilerOnRenderCallback>(
    (
      _id: string,
      _phase: 'mount' | 'update' | 'nested-update',
      actualDuration: number,
      _baseDuration: number,
      _startTime: number,
      commitTime: number
    ) => {
      if (!isDebugOpen || typeof performance === 'undefined') return;
      performance.measure('products:tableRender', {
        start: commitTime - actualDuration,
        end: commitTime,
      });
    },
    [isDebugOpen]
  );

  const columns = useMemo(() => getProductColumns(), []);

  const draftQueries = useDraftQueries as () => ListQuery<ProductDraft>;
  const { data: allDrafts = [] } = draftQueries();
  const activeDrafts = useMemo(
    () => allDrafts.filter((d: ProductDraft) => d.active !== false),
    [allDrafts]
  );

  const { handleSetPageSize } = filters;
  const handleSetAdvancedFilterState = useCallback(
    (value: string, presetId: string | null): void => {
      applyProductListAdvancedFilterState({
        value,
        presetId,
        setLocalState: setAdvancedFilterStateLocal,
        persistState: persistAppliedAdvancedFilterState,
      });
    },
    [persistAppliedAdvancedFilterState, setAdvancedFilterStateLocal]
  );
  const handleSetAdvancedFilter = useCallback(
    (value: string): void => {
      handleSetAdvancedFilterState(value, null);
    },
    [handleSetAdvancedFilterState]
  );
  const handleCreateFromDraftOpen = useCallback(
    (draftId: string): void => {
      void handleCreateFromDraft(draftId);
    },
    [handleCreateFromDraft]
  );
  const handleSetNameLocale = useCallback(
    (locale: 'name_en' | 'name_pl' | 'name_de'): void => {
      void updateNameLocale(locale);
    },
    [updateNameLocale]
  );
  const handleSetCurrencyPreference = useCallback(
    (code: string): void => {
      setCurrencyCode(code);
      void updateCurrencyCode(code);
    },
    [setCurrencyCode, updateCurrencyCode]
  );
  const handleSetCatalogPreference = useCallback(
    (filter: string): void => {
      setCatalogFilter(filter);
      void updateCatalogFilter(filter);
    },
    [setCatalogFilter, updateCatalogFilter]
  );
  const handleSetShowTriggerRunFeedback = useCallback(
    (show: boolean): void => {
      setShowTriggerRunFeedback(show);
      void updateShowTriggerRunFeedback(show);
    },
    [updateShowTriggerRunFeedback]
  );
  const handleDismissActionError = useCallback((): void => {
    setActionError(null);
  }, []);
  const handleSelectAllVisibleProducts = useCallback(async (): Promise<void> => {
    await handleSelectAllGlobal({
      search,
      id: productId || undefined,
      idMatchMode: productId ? idMatchMode : undefined,
      sku,
      description,
      categoryId: categoryId || undefined,
      minPrice,
      maxPrice,
      stockValue,
      stockOperator: stockValue !== undefined ? stockOperator || 'eq' : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      advancedFilter: advancedFilter || undefined,
      catalogId: catalogFilter === 'all' ? undefined : catalogFilter,
      searchLanguage: preferences.nameLocale,
      baseExported: baseExported === 'true' ? true : baseExported === 'false' ? false : undefined,
    });
  }, [
    advancedFilter,
    baseExported,
    catalogFilter,
    categoryId,
    description,
    endDate,
    handleSelectAllGlobal,
    idMatchMode,
    maxPrice,
    minPrice,
    preferences.nameLocale,
    productId,
    search,
    sku,
    startDate,
    stockOperator,
    stockValue,
  ]);
  const handleDeleteSelectedOpen = useCallback((): Promise<void> => {
    setIsMassDeleteConfirmOpen(true);
    return Promise.resolve();
  }, []);
  const handleDuplicateProduct = useCallback(
    (product: ProductWithImages): void => {
      handleOpenDuplicateModal(product);
    },
    [handleOpenDuplicateModal]
  );
  const getProductRowId = useCallback((row: ProductWithImages): string => row.id, []);
  const handleCloseCreateModal = useCallback((): void => {
    setIsCreateOpen(false);
    setCreateDraft(null);
  }, [setCreateDraft, setIsCreateOpen]);
  const handleCreateSuccessWithDraftReset = useCallback((): void => {
    handleCreateSuccess();
    setCreateDraft(null);
  }, [handleCreateSuccess, setCreateDraft]);
  const handleCloseExportSettingsModal = useCallback((): void => {
    setExportSettingsProduct(null);
  }, [setExportSettingsProduct]);
  const handleListingsUpdated = useCallback((): void => {
    void refreshListingBadges();
  }, [refreshListingBadges]);

  return {
    onCreateProduct: handleOpenCreate,
    onCreateFromDraft: handleCreateFromDraftOpen,
    activeDrafts,
    page,
    totalPages,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    nameLocale: preferences.nameLocale,
    setNameLocale: handleSetNameLocale,
    languageOptions,
    currencyCode,
    setCurrencyCode: handleSetCurrencyPreference,
    currencyOptions,
    filtersCollapsedByDefault: preferences.filtersCollapsedByDefault ?? true,
    catalogFilter,
    setCatalogFilter: handleSetCatalogPreference,
    baseExported,
    setBaseExported,
    catalogs,
    loadError: loadError?.message || null,
    actionError,
    onDismissActionError: handleDismissActionError,
    search,
    setSearch,
    productId,
    setProductId,
    idMatchMode,
    setIdMatchMode,
    sku,
    setSku,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    stockValue,
    setStockValue,
    stockOperator,
    setStockOperator,
    startDate: startDate || '',
    setStartDate,
    endDate: endDate || '',
    setEndDate,
    advancedFilter,
    activeAdvancedFilterPresetId,
    setAdvancedFilter: handleSetAdvancedFilter,
    setAdvancedFilterState: handleSetAdvancedFilterState,
    data: visibleData,
    rowSelection,
    setRowSelection,
    onSelectAllGlobal: handleSelectAllVisibleProducts,
    loadingGlobal: loadingGlobalSelection,
    onDeleteSelected: handleDeleteSelectedOpen,
    onAddToMarketplace: handleAddToMarketplace,
    handleProductsTableRender,
    tableColumns: columns,
    getRowClassName,
    setRefreshTrigger,
    productNameKey: preferences.nameLocale,
    priceGroups,
    onPrefetchProductDetail: prefetchProductDetail,
    onProductNameClick: handleOpenEditModal,
    onProductEditClick: handleOpenEditModal,
    onProductDeleteClick: setProductToDelete,
    onDuplicateProduct: handleDuplicateProduct,
    onIntegrationsClick: handleOpenIntegrationsModal,
    onExportSettingsClick: handleOpenExportSettings,
    integrationBadgeIds,
    integrationBadgeStatuses,
    traderaBadgeIds,
    traderaBadgeStatuses,
    queuedProductIds,
    productAiRunStatusByProductId,
    categoryNameById,
    thumbnailSource: preferences.thumbnailSource ?? 'file',
    showTriggerRunFeedback,
    setShowTriggerRunFeedback: handleSetShowTriggerRunFeedback,
    imageExternalBaseUrl,
    getRowId: getProductRowId,
    isLoading: !isMounted || isLoading,
    skeletonRows: tableSkeleton,
    maxHeight: 'calc(100vh - 200px)',
    stickyHeader: true,
    isCreateOpen,
    isPromptOpen,
    setIsPromptOpen,
    handleConfirmSku,
    initialSku,
    createDraft,
    initialCatalogId:
      catalogFilter !== 'all' && catalogFilter !== 'unassigned' ? catalogFilter : null,
    onCloseCreate: handleCloseCreateModal,
    onCreateSuccess: handleCreateSuccessWithDraftReset,
    editingProduct,
    isEditHydrating,
    onCloseEdit: handleCloseEdit,
    onEditSuccess: handleEditSuccess,
    onEditSave: handleEditSave,
    integrationsProduct,
    onCloseIntegrations: handleCloseIntegrations,
    onStartListing: handleStartListing,
    showListProductModal,
    onCloseListProduct: handleCloseListProduct,
    onListProductSuccess: handleListProductSuccess,
    listProductPreset,
    exportSettingsProduct,
    onCloseExportSettings: handleCloseExportSettingsModal,
    onListingsUpdated: handleListingsUpdated,
    massListIntegration,
    massListProductIds,
    onCloseMassList: handleCloseMassList,
    onMassListSuccess: handleMassListSuccess,
    showIntegrationModal,
    onCloseIntegrationModal: handleCloseIntegrationModal,
    onSelectIntegrationFromModal: handleSelectIntegrationFromModal,
    isDebugOpen,
    isMounted,
    productToDelete,
    setProductToDelete,
    isMassDeleteConfirmOpen,
    setIsMassDeleteConfirmOpen,
    handleMassDelete,
    handleConfirmSingleDelete,
    bulkDeletePending,
  };
}
