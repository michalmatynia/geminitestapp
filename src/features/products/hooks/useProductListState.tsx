'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { ProfilerOnRenderCallback, useCallback, useEffect, useMemo, useState } from 'react';

import { getProductColumns } from '@/features/products/components/list/ProductColumns';
import { ProductTableSkeleton } from '@/features/products/components/list/ProductTableSkeleton';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { useCatalogSync } from '@/features/products/hooks/useCatalogSync';
import { useProductData } from '@/features/products/hooks/useProductData';
import { useProductSync } from '@/features/products/hooks/useProductEnhancements';
import { useProductOperations } from '@/features/products/hooks/useProductOperations';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import { useQueuedProductIds } from '@/features/products/state/queued-product-ops';
import type { ProductWithImages, ProductDraftDto } from '@/shared/contracts/products';
import { useProductListSync } from '@/shared/hooks/sync/useBackgroundSync';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import type { ProductListContextType } from '../context/ProductListContext';
import type { Row } from '@tanstack/react-table';

import { useProductListSelection } from './product-list/useProductListSelection';
import { useProductListModals } from './product-list/useProductListModals';
import { useProductListIntegrations } from './product-list/useProductListIntegrations';
import { useProductListUrlSync } from './product-list/useProductListUrlSync';
import { useProductAiPathsRunSync } from './useProductAiPathsRunSync';
import { useProductListHighlights } from './product-list/useProductListHighlights';
import { useProductEditHydration } from './product-list/useProductEditHydration';
import { useProductListListingStatuses } from './product-list/useProductListListingStatuses';
import { useProductListQueueStatus } from './product-list/useProductListQueueStatus';
import { useProductListCategories } from './product-list/useProductListCategories';
import { useProductListFilters } from './product-list/useProductListFilters';
import { useDraftQueries } from '@/features/drafter/hooks/useDraftQueries';

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
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const settingsStore = useSettingsStore();

  const productImageBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const queuedProductIds = useQueuedProductIds();

  useProductSync();
  useProductAiPathsRunSync();

  const {
    preferences,
    loading: preferencesLoading,
    setNameLocale: updateNameLocale,
    setCatalogFilter: updateCatalogFilter,
    setCurrencyCode: updateCurrencyCode,
    setPageSize: updatePageSize,
    setAppliedAdvancedFilterState: persistAppliedAdvancedFilterState,
  } = useUserPreferences();

  const { catalogs, currencyCode, setCurrencyCode, currencyOptions, priceGroups, languageOptions } =
    useCatalogSync(preferences.catalogFilter || 'all', {
      enabled: !preferencesLoading,
    });

  const filters = useProductListFilters({
    initialCatalogFilter: preferences.catalogFilter,
    initialPageSize: preferences.pageSize,
    initialAppliedAdvancedFilter: preferences.appliedAdvancedFilter,
    initialAppliedAdvancedFilterPresetId: preferences.appliedAdvancedFilterPresetId,
    preferencesLoaded: !preferencesLoading,
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
    catalogFilter,
    setCatalogFilter,
    baseExported,
    setBaseExported,
    loadError,
    isLoading,
    isFetching,
    refresh,
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

  const visibleProductIdSet = useMemo(
    () => new Set(data.map((product: ProductWithImages) => product.id)),
    [data]
  );
  const visibleProductIds = useMemo(() => Array.from(visibleProductIdSet), [visibleProductIdSet]);

  const { categoryNameById } = useProductListCategories({
    data,
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
    handleOpenCreateFromDraft,
    handleCreateSuccess,
    handleEditSuccess,
    handleEditSave,
    isPromptOpen,
    setIsPromptOpen,
    handleConfirmSku,
  } = useProductOperations(setRefreshTrigger);

  const selection = useProductListSelection({
    data,
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

  const urlSync = useProductListUrlSync();
  const { clearProductEditorQueryParams } = urlSync;

  const hydration = useProductEditHydration({
    editingProduct,
    setEditingProduct,
    setActionError,
    setRefreshTrigger,
    clearProductEditorQueryParams,
  });

  const {
    isEditHydrating,
    handleOpenEditModal,
    handleCloseEdit,
    prefetchProductDetail,
  } = hydration;

  const highlights = useProductListHighlights();
  const { jobCompletionHighlights, triggerJobCompletionHighlight } = highlights;

  useProductListListingStatuses({
    data,
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

  const { data: allDrafts = [] } = useDraftQueries();
  const activeDrafts = useMemo(
    () => allDrafts.filter((d: ProductDraftDto) => d.active !== false),
    [allDrafts]
  );

  const { handleSetPageSize, handleSetAdvancedFilter, handleSetAdvancedFilterState } = filters;

  return useMemo(
    () => ({
      onCreateProduct: handleOpenCreate,
      onCreateFromDraft: (draftId: string) => {
        const run = async (): Promise<void> => {
          try {
            const { draftKeys } = await import('@/features/drafter/hooks/useDraftQueries');
            const { normalizeQueryKey } = await import('@/shared/lib/query-key-utils');
            const { api } = await import('@/shared/lib/api-client');
            const { fetchQueryV2 } = await import('@/shared/lib/query-factories-v2');
            const draft = await fetchQueryV2<ProductDraftDto>(queryClient, {
              queryKey: normalizeQueryKey(draftKeys.detail(draftId)),
              queryFn: () =>
                api.get<ProductDraftDto>(`/api/drafts/${draftId}`, {
                  timeout: 30_000,
                }),
              staleTime: 5 * 60 * 1000,
              meta: {
                source: 'products.hooks.useProductListState.onCreateFromDraft',
                operation: 'detail',
                resource: 'drafts.detail',
                domain: 'drafter',
                queryKey: normalizeQueryKey(draftKeys.detail(draftId)),
                tags: ['drafts', 'detail', 'fetch'],
              },
            })();
            setCreateDraft(draft);
            handleOpenCreateFromDraft(draft);
            toast(`Creating product from draft: ${draft.name}`, { variant: 'success' });
          } catch (error) {
            const { logClientError } = await import(
              '@/shared/utils/observability/client-error-logger'
            );
            logClientError(error, {
              context: { source: 'useProductListState', action: 'createFromDraft', draftId },
            });
            toast('Failed to load draft template', { variant: 'error' });
          }
        };
        void run();
      },
      activeDrafts,
      page,
      totalPages,
      setPage,
      pageSize,
      setPageSize: handleSetPageSize,
      nameLocale: preferences.nameLocale,
      setNameLocale: (locale) => void updateNameLocale(locale),
      languageOptions,
      currencyCode,
      setCurrencyCode: (code) => {
        setCurrencyCode(code);
        void updateCurrencyCode(code);
      },
      currencyOptions,
      filtersCollapsedByDefault: preferences.filtersCollapsedByDefault ?? false,
      catalogFilter,
      setCatalogFilter: (filter) => {
        setCatalogFilter(filter);
        void updateCatalogFilter(filter);
      },
      baseExported,
      setBaseExported,
      catalogs,
      loadError: loadError?.message || null,
      actionError,
      onDismissActionError: () => setActionError(null),
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
      data: isMounted ? data : [],
      rowSelection,
      setRowSelection,
      onSelectAllGlobal: async (): Promise<void> => {
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
          baseExported:
            baseExported === 'true' ? true : baseExported === 'false' ? false : undefined,
        });
      },
      loadingGlobal: loadingGlobalSelection,
      onDeleteSelected: async (): Promise<void> => {
        setIsMassDeleteConfirmOpen(true);
      },
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
      onDuplicateProduct: (product: ProductWithImages) => {
        setEditingProduct(product);
        handleOpenCreateModal();
      },
      onIntegrationsClick: handleOpenIntegrationsModal,
      onExportSettingsClick: handleOpenExportSettings,
      integrationBadgeIds,
      integrationBadgeStatuses,
      traderaBadgeIds,
      traderaBadgeStatuses,
      queuedProductIds,
      categoryNameById,
      thumbnailSource: preferences.thumbnailSource ?? 'file',
      imageExternalBaseUrl: productImageBaseUrl,
      getRowId: (row) => row.id,
      isLoading: !isMounted || isLoading,
      skeletonRows: tableSkeleton,
      maxHeight: 'calc(100vh - 280px)',
      stickyHeader: true,
      isCreateOpen,
      isPromptOpen,
      setIsPromptOpen,
      handleConfirmSku,
      initialSku,
      createDraft,
      initialCatalogId:
        catalogFilter !== 'all' && catalogFilter !== 'unassigned' ? catalogFilter : null,
      onCloseCreate: () => {
        setIsCreateOpen(false);
        setCreateDraft(null);
      },
      onCreateSuccess: () => {
        handleCreateSuccess();
        setCreateDraft(null);
      },
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
      onCloseExportSettings: () => setExportSettingsProduct(null),
      onListingsUpdated: () => void refreshListingBadges(),
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
    }),
    [
      activeDrafts,
      bulkDeletePending,
      catalogFilter,
      catalogs,
      columns,
      createDraft,
      currencyCode,
      currencyOptions,
      data,
      editingProduct,
      endDate,
      exportSettingsProduct,
      handleAddToMarketplace,
      handleCloseEdit,
      handleCloseIntegrations,
      handleCloseListProduct,
      handleCloseMassList,
      handleConfirmSingleDelete,
      handleCreateSuccess,
      handleEditSave,
      handleEditSuccess,
      handleListProductSuccess,
      handleMassDelete,
      handleMassListSuccess,
      handleOpenCreate,
      handleOpenEditModal,
      prefetchProductDetail,
      handleOpenExportSettings,
      handleOpenIntegrationsModal,
      handleProductsTableRender,
      getRowClassName,
      handleSelectAllGlobal,
      handleSelectIntegrationFromModal,
      initialSku,
      integrationBadgeIds,
      integrationBadgeStatuses,
      integrationsProduct,
      isCreateOpen,
      isEditHydrating,
      isPromptOpen,
      setIsPromptOpen,
      handleConfirmSku,
      isDebugOpen,
      isFetching,
      isLoading,
      isMassDeleteConfirmOpen,
      isMounted,
      languageOptions,
      listProductPreset,
      loadError,
      loadingGlobalSelection,
      massListIntegration,
      massListProductIds,
      maxPrice,
      minPrice,
      stockOperator,
      stockValue,
      advancedFilter,
      activeAdvancedFilterPresetId,
      page,
      pageSize,
      preferences.nameLocale,
      preferences.filtersCollapsedByDefault,
      preferences.thumbnailSource,
      productImageBaseUrl,
      priceGroups,
      productToDelete,
      queuedProductIds,
      refresh,
      rowSelection,
      search,
      productId,
      idMatchMode,
      showIntegrationModal,
      showListProductModal,
      setProductId,
      setIdMatchMode,
      setStockOperator,
      setStockValue,
      handleSetAdvancedFilter,
      handleSetAdvancedFilterState,
      sku,
      description,
      categoryId,
      categoryNameById,
      baseExported,
      setBaseExported,
      startDate,
      tableSkeleton,
      totalPages,
      traderaBadgeIds,
      traderaBadgeStatuses,
      handleOpenCreateFromDraft,
      setCreateDraft,
      handleOpenCreateModal,
      setEditingProduct,
      refreshListingBadges,
      updateNameLocale,
      updateCatalogFilter,
      updateCurrencyCode,
      updatePageSize,
      persistAppliedAdvancedFilterState,
      handleSetPageSize,
      handleSetAdvancedFilter,
      handleSetAdvancedFilterState,
    ]
  );
}
