'use client';
'use no memo';

import {
  ProfilerOnRenderCallback,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { ProductTableSkeleton } from '@/features/products/components/list/ProductTableSkeleton';
import { loadProductColumns } from '@/features/products/components/list/product-columns-loader';
import { useCatalogSync } from '@/features/products/hooks/useCatalogSync';
import { useProductData } from '@/features/products/hooks/useProductData';
import { useProductSync } from '@/features/products/hooks/useProductEnhancements';
import { useProductOperations } from '@/features/products/hooks/useProductOperations';
import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import { isProductListDebugSearch, logProductListDebug } from '@/features/products/lib/product-list-observability';
import * as queuedProductOps from '@/features/products/state/queued-product-ops';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { useDraftQueries } from '@/shared/hooks/useDraftQueries';
import {
  type BackgroundSyncEvent,
  useProductListSync,
} from '@/shared/hooks/sync/useBackgroundSync';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { useToast } from '@/shared/ui/toast';

import { useProductEditHydration } from './product-list/useProductEditHydration';
import { useProductListCategories } from './product-list/useProductListCategories';
import { useProductListHighlights } from './product-list/useProductListHighlights';
import { useProductListIntegrations } from './product-list/useProductListIntegrations';
import { useProductListModals } from './product-list/useProductListModals';
import { useProductListQueueStatus } from './product-list/useProductListQueueStatus';
import { useProductListSelection } from './product-list/useProductListSelection';
import { useProductListUrlSync } from './product-list/useProductListUrlSync';
import { useCreateFromDraft } from './useCreateFromDraft';
import { useProductAiPathsRunSync } from './useProductAiPathsRunSync';
import {
  applyProductListAdvancedFilterState,
  applyProductListPageSizeChange,
  shouldEnableProductListBackgroundSyncRuntime,
  scheduleDeferredProductListDraftBootstrap,
} from './product-list/productListStateHelpers';
import { useProductListDebugLogging } from './product-list/useProductListDebugLogging';

import type { ProductListContextType } from '../context/ProductListContext';
import type { ColumnDef, Row } from '@tanstack/react-table';

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

const EMPTY_INTEGRATION_BADGE_IDS = new Set<string>();
const EMPTY_INTEGRATION_BADGE_STATUSES = new Map<string, string>();
const EMPTY_TRADERA_BADGE_IDS = new Set<string>();
const EMPTY_TRADERA_BADGE_STATUSES = new Map<string, string>();
const EMPTY_PLAYWRIGHT_PROGRAMMABLE_BADGE_IDS = new Set<string>();
const EMPTY_PLAYWRIGHT_PROGRAMMABLE_BADGE_STATUSES = new Map<string, string>();
const EMPTY_VINTED_BADGE_IDS = new Set<string>();
const EMPTY_VINTED_BADGE_STATUSES = new Map<string, string>();
const EMPTY_PRODUCT_TABLE_COLUMNS: ColumnDef<ProductWithImages>[] = [];

export function useProductListState(): ProductListContextType & {
  isDebugOpen: boolean;
  isMounted: boolean;
  rowRuntimeReady: boolean;
  triggerListingStatusHighlight: (productId: string) => void;
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
  const [draftsReady, setDraftsReady] = useState(false);
  const [rowRuntimeReady, setRowRuntimeReady] = useState(false);
  const [tableColumns, setTableColumns] = useState<ColumnDef<ProductWithImages>[]>(
    EMPTY_PRODUCT_TABLE_COLUMNS
  );
  const [tableColumnsReady, setTableColumnsReady] = useState(false);
  const { toast } = useToast();
  const { imageExternalBaseUrl } = useProductSettings();

  const queuedProductIds = queuedProductOps.useQueuedAiRunProductIds();

  useProductSync({ enabled: rowRuntimeReady });
  const productAiRunStatusByProductId = useProductAiPathsRunSync({
    enabled: rowRuntimeReady,
  });

  const {
    preferences,
    loading: preferencesLoading,
    setNameLocale: updateNameLocale,
    setCatalogFilter: updateCatalogFilter,
    setCurrencyCode: updateCurrencyCode,
    setPageSize: updatePageSize,
    setShowTriggerRunFeedback: updateShowTriggerRunFeedback,
    setAdvancedFilterPresets,
    setAppliedAdvancedFilterState: persistAppliedAdvancedFilterState,
  } = useUserPreferences();

  const [showTriggerRunFeedback, setShowTriggerRunFeedback] = useState(
    preferences.showTriggerRunFeedback ?? true
  );

  const { catalogs, currencyCode, setCurrencyCode, currencyOptions, priceGroups, languageOptions } =
    useCatalogSync(preferences.catalogFilter || 'all', {
      enabled: rowRuntimeReady,
    });

  const {
    data,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize: setLivePageSize,
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
    isFetching,
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

  const { categoryNameById } = useProductListCategories({
    data: visibleData,
    nameLocale: preferences.nameLocale,
    enabled: rowRuntimeReady,
  });

  const shouldEnableListBackgroundSync = shouldEnableProductListBackgroundSyncRuntime({
    rowRuntimeReady,
    isLoading,
    queuedProductIdsCount: queuedProductIds.size,
    activeTrackedProductAiRunsCount: productAiRunStatusByProductId.size,
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
    shouldEnableListBackgroundSync,
    {
      onSyncEvent: (event: BackgroundSyncEvent): void => {
        logProductListDebug(
          'background-sync-event',
          {
            ...event,
            queueCount: queuedProductIds.size,
            trackedAiRunsCount: productAiRunStatusByProductId.size,
            filters: {
              page,
              pageSize,
              hasSearch: search.length > 0,
              hasSku: sku.length > 0,
              hasDescription: description.length > 0,
              hasAdvancedFilter: advancedFilter.length > 0,
              catalogFilter,
              baseExported,
            },
          },
          {
            dedupeKey: `background-sync-event:${event.reason}:${event.status}`,
            throttleMs: 750,
          }
        );
      },
    }
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
    integrationsRecoveryContext,
    integrationsFilterIntegrationSlug,
    showListProductModal,
    listProductPreset,
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

  const isProductListDebugOpen = useMemo(
    () => isProductListDebugSearch(searchParams.toString()),
    [searchParams]
  );

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return scheduleDeferredProductListDraftBootstrap(window, () => {
      setDraftsReady(true);
      setRowRuntimeReady(true);
    });
  }, []);

  useEffect(() => {
    let isActive = true;

    void loadProductColumns()
      .then((nextColumns) => {
        if (!isActive) return;

        startTransition(() => {
          setTableColumns((currentColumns) =>
            currentColumns === nextColumns ? currentColumns : nextColumns
          );
          setTableColumnsReady(true);
        });
      })
      .catch((error) => {
        logClientCatch(error, {
          source: 'useProductListState',
          action: 'loadProductColumns',
        });

        if (!isActive) return;
        startTransition(() => {
          setTableColumnsReady(true);
        });
      });

    return (): void => {
      isActive = false;
    };
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
      id: string,
      phase: 'mount' | 'update' | 'nested-update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      if (!isProductListDebugOpen && !isDebugOpen) return;

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
          visibleCount: visibleData.length,
          isLoading,
          isFetching,
          queuedProductIdsCount: queuedProductIds.size,
          trackedAiRunsCount: productAiRunStatusByProductId.size,
        },
        {
          dedupeKey: 'products-table-render',
          throttleMs: 500,
        }
      );
    },
    [
      isDebugOpen,
      isFetching,
      isLoading,
      isProductListDebugOpen,
      productAiRunStatusByProductId.size,
      queuedProductIds.size,
      visibleData.length,
    ]
  );

  useProductListDebugLogging({
    enabled: isProductListDebugOpen,
    snapshot: {
      page,
      pageSize,
      visibleCount: visibleData.length,
      rowSelectionCount: Object.keys(rowSelection).filter((id: string) => rowSelection[id]).length,
      isLoading,
      isFetching,
      hasLoadError: Boolean(loadError),
      loadErrorMessage: loadError?.message ?? null,
      queuedProductIdsCount: queuedProductIds.size,
      trackedAiRunsCount: productAiRunStatusByProductId.size,
      backgroundSyncEnabled: shouldEnableListBackgroundSync,
      catalogFilter,
      hasSearch: search.length > 0,
      hasSku: sku.length > 0,
      hasDescription: description.length > 0,
      hasProductId: productId.length > 0,
      hasAdvancedFilter: advancedFilter.length > 0,
      baseExported,
      showTriggerRunFeedback,
      isEditHydrating,
    },
  });

  const draftQueries = useDraftQueries as (
    notebookId?: string,
    options?: { enabled?: boolean }
  ) => ListQuery<ProductDraft>;
  const { data: allDrafts = [] } = draftQueries(undefined, { enabled: draftsReady });
  const activeDrafts = useMemo(
    () => allDrafts.filter((d: ProductDraft) => d.active !== false),
    [allDrafts]
  );

  const handleSetPageSize = useCallback(
    (size: number): void => {
      applyProductListPageSizeChange({
        size,
        setLocalPageSize: setLivePageSize,
        persistPageSize: updatePageSize,
      });
    },
    [setLivePageSize, updatePageSize]
  );
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

  const state = useMemo(
    () => ({
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
      advancedFilterPresets: preferences.advancedFilterPresets,
      setAdvancedFilterPresets,
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
      tableColumns,
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
      integrationBadgeIds: EMPTY_INTEGRATION_BADGE_IDS,
      integrationBadgeStatuses: EMPTY_INTEGRATION_BADGE_STATUSES,
      traderaBadgeIds: EMPTY_TRADERA_BADGE_IDS,
      traderaBadgeStatuses: EMPTY_TRADERA_BADGE_STATUSES,
      playwrightProgrammableBadgeIds: EMPTY_PLAYWRIGHT_PROGRAMMABLE_BADGE_IDS,
      playwrightProgrammableBadgeStatuses: EMPTY_PLAYWRIGHT_PROGRAMMABLE_BADGE_STATUSES,
      vintedBadgeIds: EMPTY_VINTED_BADGE_IDS,
      vintedBadgeStatuses: EMPTY_VINTED_BADGE_STATUSES,
      queuedProductIds,
      productAiRunStatusByProductId,
      categoryNameById,
      thumbnailSource: preferences.thumbnailSource ?? 'file',
      showTriggerRunFeedback,
      setShowTriggerRunFeedback: handleSetShowTriggerRunFeedback,
      imageExternalBaseUrl,
      getRowId: getProductRowId,
      isLoading: !isMounted || !tableColumnsReady || isLoading,
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
      integrationsRecoveryContext,
      integrationsFilterIntegrationSlug,
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
      rowRuntimeReady,
      triggerListingStatusHighlight: triggerJobCompletionHighlight,
      productToDelete,
      setProductToDelete,
      isMassDeleteConfirmOpen,
      setIsMassDeleteConfirmOpen,
      handleMassDelete,
      handleConfirmSingleDelete,
      bulkDeletePending,
    }),
    [
      handleOpenCreate,
      handleCreateFromDraftOpen,
      activeDrafts,
      page,
      totalPages,
      setPage,
      pageSize,
      handleSetPageSize,
      preferences.nameLocale,
      handleSetNameLocale,
      languageOptions,
      currencyCode,
      handleSetCurrencyPreference,
      currencyOptions,
      preferences.filtersCollapsedByDefault,
      catalogFilter,
      handleSetCatalogPreference,
      baseExported,
      setBaseExported,
      catalogs,
      loadError,
      actionError,
      handleDismissActionError,
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
      preferences.advancedFilterPresets,
      setAdvancedFilterPresets,
      handleSetAdvancedFilter,
      handleSetAdvancedFilterState,
      visibleData,
      rowSelection,
      setRowSelection,
      handleSelectAllVisibleProducts,
      loadingGlobalSelection,
      handleDeleteSelectedOpen,
      handleAddToMarketplace,
      handleProductsTableRender,
      tableColumns,
      getRowClassName,
      setRefreshTrigger,
      priceGroups,
      prefetchProductDetail,
      handleOpenEditModal,
      setProductToDelete,
      handleDuplicateProduct,
      handleOpenIntegrationsModal,
      handleOpenExportSettings,
      queuedProductIds,
      productAiRunStatusByProductId,
      categoryNameById,
      preferences.thumbnailSource,
      showTriggerRunFeedback,
      handleSetShowTriggerRunFeedback,
      imageExternalBaseUrl,
      getProductRowId,
      isMounted,
      tableColumnsReady,
      isLoading,
      tableSkeleton,
      isCreateOpen,
      isPromptOpen,
      setIsPromptOpen,
      handleConfirmSku,
      initialSku,
      createDraft,
      handleCloseCreateModal,
      handleCreateSuccessWithDraftReset,
      editingProduct,
      isEditHydrating,
      handleCloseEdit,
      handleEditSuccess,
      handleEditSave,
      integrationsProduct,
      integrationsRecoveryContext,
      integrationsFilterIntegrationSlug,
      handleCloseIntegrations,
      handleStartListing,
      showListProductModal,
      handleCloseListProduct,
      handleListProductSuccess,
      listProductPreset,
      exportSettingsProduct,
      handleCloseExportSettingsModal,
      handleListingsUpdated,
      massListIntegration,
      massListProductIds,
      handleCloseMassList,
      handleMassListSuccess,
      showIntegrationModal,
      handleCloseIntegrationModal,
      handleSelectIntegrationFromModal,
      isDebugOpen,
      rowRuntimeReady,
      triggerJobCompletionHighlight,
      productToDelete,
      isMassDeleteConfirmOpen,
      setIsMassDeleteConfirmOpen,
      handleMassDelete,
      handleConfirmSingleDelete,
      bulkDeletePending,
    ]
  );

  return state;
}
