'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { ProfilerOnRenderCallback, useCallback, useEffect, useMemo, useState } from 'react';

import { useDrafts, draftKeys } from '@/features/drafter/hooks/useDrafts';
import {
  fetchIntegrationsWithConnections,
  fetchPreferredBaseConnection,
  integrationSelectionQueryKeys,
} from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import { useIntegrationOperations } from '@/features/integrations/hooks/useIntegrationOperations';
import {
  fetchProductListings,
  productListingsQueryKey,
} from '@/features/integrations/hooks/useListingQueries';
import { getProducts } from '@/features/products/api';
import DebugPanel from '@/features/products/components/DebugPanel';
import { getProductColumns } from '@/features/products/components/list/ProductColumns';
import { ProductTableSkeleton } from '@/features/products/components/list/ProductTableSkeleton';
import { ProductListPanel } from '@/features/products/components/ProductListPanel';
import { ProductModals } from '@/features/products/components/ProductModals';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { ProductListProvider } from '@/features/products/context/ProductListContext';
import {
  getProductDetailQueryKey,
  getProductListQueryKey,
  inactiveProductDetailQueryKey,
  invalidateProductsAndCounts,
} from '@/features/products/hooks/productCache';
import { useCatalogSync } from '@/features/products/hooks/useCatalogSync';
import {
  useProductData,
  useBulkDeleteProductsMutation,
} from '@/features/products/hooks/useProductData';
import { 
  useProductCacheWarmup, 
  useProductPrefetch, 
  useProductSync 
} from '@/features/products/hooks/useProductEnhancements';
import { useProductOperations } from '@/features/products/hooks/useProductOperations';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import { useQueuedProductIds } from '@/features/products/state/queued-product-ops';
import type { ProductWithImages } from '@/features/products/types';
import type { ProductDraft } from '@/features/products/types/drafts';
import { useProductListSync } from '@/shared/hooks/sync/useBackgroundSync';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast, ConfirmDialog } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type RowSelectionState = Record<string, boolean>;

export function AdminProductsPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const productImageBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [createDraft, setCreateDraft] = useState<ProductDraft | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductWithImages | null>(null);
  const queryClient = useQueryClient();

  const prefetchIntegrationSelectionData = useCallback((): void => {
    void import('@/features/integrations/components/listings/SelectIntegrationModal');
    void queryClient.prefetchQuery({
      queryKey: integrationSelectionQueryKeys.withConnections,
      queryFn: fetchIntegrationsWithConnections,
      staleTime: 5 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: integrationSelectionQueryKeys.defaultConnection,
      queryFn: fetchPreferredBaseConnection,
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  const prefetchProductListingsData = useCallback((productId: string): void => {
    if (!productId) return;
    void queryClient.prefetchQuery({
      queryKey: productListingsQueryKey(productId),
      queryFn: () => fetchProductListings(productId),
      staleTime: 30 * 1000,
    });
  }, [queryClient]);

  const refreshProductListingsData = useCallback((productId: string): void => {
    if (!productId) return;
    void queryClient.fetchQuery({
      queryKey: productListingsQueryKey(productId),
      queryFn: () => fetchProductListings(productId),
      staleTime: 0,
    });
  }, [queryClient]);

  const { data: allDrafts = [] } = useDrafts();
  const activeDrafts = useMemo(() => allDrafts.filter((d: ProductDraft) => d.active !== false), [allDrafts]);

  const queuedProductIds = useQueuedProductIds();

  // Enhanced TanStack Query features
  useProductCacheWarmup();
  useProductSync();
  useProductPrefetch();

  // Load user preferences
  const {
    preferences,
    loading: preferencesLoading,
    setNameLocale: updateNameLocale,
    setCatalogFilter: updateCatalogFilter,
    setCurrencyCode: updateCurrencyCode,
    setPageSize: updatePageSize,
  } = useUserPreferences();

  // Load catalog and currency data first
  const {
    catalogs,
    currencyCode,
    setCurrencyCode,
    currencyOptions,
    priceGroups,
    languageOptions,
    fallbackNameLocale,
  } = useCatalogSync(preferences.catalogFilter || 'all');

  const {
    data,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    sku,
    setSku,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    catalogFilter,
    setCatalogFilter,
    loadError,
    isLoading,
  } = useProductData({
    refreshTrigger,
    initialCatalogFilter: preferences.catalogFilter,
    initialPageSize: preferences.pageSize,
    preferencesLoaded: !preferencesLoading,
    currencyCode,
    priceGroups,
    searchLanguage: preferences.nameLocale,
  });

  // Enable background sync for product list
  useProductListSync({
    search,
    sku,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    catalogFilter,
    page,
    pageSize,
  }, !isLoading);

  const {
    isCreateOpen,
    setIsCreateOpen,
    initialSku,
    editingProduct,
    setEditingProduct,
    lastEditedId,
    actionError,
    setActionError,
    handleOpenCreateModal,
    handleOpenCreateFromDraft,
    handleCreateSuccess,
    handleEditSuccess,
    handleEditSave,
  } = useProductOperations(setRefreshTrigger);
  const editingProductDetailQuery = useQuery({
    queryKey: editingProduct
      ? getProductDetailQueryKey(editingProduct.id)
      : inactiveProductDetailQueryKey,
    queryFn: () => api.get<ProductWithImages>(`/api/products/${editingProduct?.id}`),
    enabled: Boolean(editingProduct?.id),
    staleTime: 0,
    refetchInterval: editingProduct?.id ? 5000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  const {
    integrationsProduct,
    setIntegrationsProduct,
    showListProductModal,
    setShowListProductModal,
    listProductPreset,
    setListProductPreset,
    integrationBadgeIds,
    integrationBadgeStatuses,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
    handleListProductSuccess: baseHandleListProductSuccess,
  } = useIntegrationOperations();

  useEffect(() => {
    prefetchIntegrationSelectionData();
  }, [prefetchIntegrationSelectionData]);

  // Initialize currency code from preferences
  useEffect(() => {
    if (!preferencesLoading && preferences.currencyCode) {
      setCurrencyCode(preferences.currencyCode);
    }
  }, [preferencesLoading, preferences.currencyCode, setCurrencyCode]);
  useEffect(() => {
    if (!editingProduct?.id) return;
    const fresh = editingProductDetailQuery.data;
    if (!fresh) return;
    if (fresh.id !== editingProduct.id) return;
    if ((fresh.updatedAt ?? null) === (editingProduct.updatedAt ?? null)) return;
    setEditingProduct(fresh);
  }, [editingProduct, editingProductDetailQuery.data, setEditingProduct]);

  const handleOpenEditModal = useCallback((product: ProductWithImages) => {
    const run = async (): Promise<void> => {
      setActionError(null);
      try {
        const fullProduct = await queryClient.fetchQuery({
          queryKey: getProductDetailQueryKey(product.id),
          queryFn: () => api.get<ProductWithImages>(`/api/products/${product.id}`),
          staleTime: 0,
        });
        setEditingProduct(fullProduct);
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminProductsPage',
            action: 'openEditModal',
            productId: product.id,
          },
        });
        setEditingProduct(product);
        toast('Could not load full product details. Opened with limited data.', {
          variant: 'info',
        });
      }
    };
    void run();
  }, [setActionError, queryClient, setEditingProduct, toast]);

  const handleOpenCreate = useCallback(() => {
    setCreateDraft(null);
    void handleOpenCreateModal();
  }, [handleOpenCreateModal]);

  const handleOpenIntegrationsModal = useCallback((product: ProductWithImages) => {
    prefetchIntegrationSelectionData();
    prefetchProductListingsData(product.id);
    setIntegrationsProduct(product);
  }, [prefetchIntegrationSelectionData, prefetchProductListingsData, setIntegrationsProduct]);

  const handleOpenExportSettings = useCallback((product: ProductWithImages) => {
    setExportSettingsProduct(product);
    refreshProductListingsData(product.id);
  }, [refreshProductListingsData, setExportSettingsProduct]);

  const handleSetPage = useCallback((p: number) => {
    setPage(p);
  }, [setPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    void updatePageSize(size);
  }, [setPageSize, updatePageSize]);

  const handleSetNameLocale = useCallback((locale: 'name_en' | 'name_pl' | 'name_de') => {
    void updateNameLocale(locale);
  }, [updateNameLocale]);

  const handleSetCurrencyCode = useCallback((code: string) => {
    setCurrencyCode(code);
    void updateCurrencyCode(code);
  }, [setCurrencyCode, updateCurrencyCode]);

  const handleSetCatalogFilter = useCallback((filter: string) => {
    setCatalogFilter(filter);
    void updateCatalogFilter(filter);
  }, [setCatalogFilter, updateCatalogFilter]);

  useEffect(() => {
    if (!languageOptions.length) return;
    const allowed = new Set(languageOptions.map((option: { label: string; value: 'name_en' | 'name_pl' | 'name_de' }) => option.value));
    if (allowed.has(preferences.nameLocale)) return;
    const nextLocale = (fallbackNameLocale && allowed.has(fallbackNameLocale))
      ? fallbackNameLocale
      : languageOptions[0]!.value;
    void updateNameLocale(nextLocale);
  }, [languageOptions, fallbackNameLocale, preferences.nameLocale, updateNameLocale]);

  const handleCreateFromDraft = useCallback((draftId: string): void => {
    const run = async (): Promise<void> => {
      try {
        const draft = await queryClient.fetchQuery({
          queryKey: draftKeys.detail(draftId),
          queryFn: () => api.get<ProductDraft>(`/api/drafts/${draftId}`)
        });
        setCreateDraft(draft);
        handleOpenCreateFromDraft(draft);
        toast(`Creating product from draft: ${draft.name}`, { variant: 'success' });
      } catch (error) {
        logClientError(error, { context: { source: 'AdminProductsPage', action: 'createFromDraft', draftId } });
        toast('Failed to load draft template', { variant: 'error' });
      }
    };
    void run();
  }, [handleOpenCreateFromDraft, toast, queryClient]);

  const handleCloseCreate = useCallback(() => {
    setIsCreateOpen(false);
    setCreateDraft(null);
  }, [setIsCreateOpen]);
  const handleDismissActionError = useCallback(() => {
    setActionError(null);
  }, [setActionError]);
  const handleCloseEdit = useCallback(() => setEditingProduct(null), [setEditingProduct]);
  const handleCloseIntegrations = useCallback(() => {
    setIntegrationsProduct(null);
    setShowListProductModal(false);
  }, [setIntegrationsProduct, setShowListProductModal]);
  const handleCloseListProduct = useCallback(() => {
    setShowListProductModal(false);
    setListProductPreset(null);
  }, [setShowListProductModal, setListProductPreset]);

  const handleListProductSuccess = useCallback(() => {
    setListProductPreset(null);
    baseHandleListProductSuccess();
  }, [setListProductPreset, baseHandleListProductSuccess]);

  const handleStartListing = useCallback((integrationId: string, connectionId: string) => {
    setListProductPreset({ integrationId, connectionId });
    setShowListProductModal(true);
  }, [setListProductPreset, setShowListProductModal]);

  // Mass listing state
  const [massListIntegration, setMassListIntegration] = useState<{ integrationId: string; connectionId: string } | null>(null);
  const [massListProductIds, setMassListProductIds] = useState<string[]>([]);
  const [isMassListing, setIsMassListing] = useState(false);
  const [isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen] = useState(false);

  // State for integration selection modal
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);

  const handleCloseIntegrationModal = useCallback(() => {
    setShowIntegrationModal(false);
    setIsMassListing(false);
  }, []);

  const getRowId = useCallback((row: ProductWithImages): string => row.id, []);

  const handleSelectIntegrationFromModal = useCallback((integrationId: string, connectionId: string): void => {
    setShowIntegrationModal(false);
    if (isMassListing) {
      const ids = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
      setMassListProductIds(ids);
      setMassListIntegration({ integrationId, connectionId });
    }
  }, [isMassListing, rowSelection]);

  const handleCloseMassList = useCallback(() => {
    setMassListIntegration(null);
    setMassListProductIds([]);
    setIsMassListing(false);
  }, []);

  const handleMassListSuccess = useCallback(() => {
    setMassListIntegration(null);
    setMassListProductIds([]);
    setIsMassListing(false);
    setRefreshTrigger((prev: number) => prev + 1);
    toast('Products listed successfully.', { variant: 'success' });
    void refreshListingBadges();
  }, [toast, refreshListingBadges]);

  const handleAddToMarketplace = useCallback(() => {
    prefetchIntegrationSelectionData();
    setIsMassListing(true);
    setShowIntegrationModal(true);
  }, [prefetchIntegrationSelectionData]);

  const [loadingGlobalSelection, setLoadingGlobalSelection] = useState(false);

  const bulkDeleteMutation = useBulkDeleteProductsMutation();

  const handleSelectAllGlobal = useCallback(async () => {
    setLoadingGlobalSelection(true);
    try {
      const filters = {
        search,
        sku,
        minPrice,
        maxPrice,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        catalogId: catalogFilter === 'all' ? undefined : catalogFilter,
        searchLanguage: preferences.nameLocale,
      };

      const allProducts = await queryClient.fetchQuery({
        queryKey: getProductListQueryKey({ scope: 'all', ...filters }),
        queryFn: () => getProducts(filters)
      });

      const newSelection: RowSelectionState = {};
      allProducts.forEach((p: ProductWithImages) => {
        newSelection[p.id] = true;
      });
      setRowSelection(newSelection);
      toast(`Selected ${allProducts.length} products.`, { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminProductsPage', action: 'selectAllGlobal' } });
      toast('Failed to select all products', { variant: 'error' });
    } finally {
      setLoadingGlobalSelection(false);
    }
  }, [search, sku, minPrice, maxPrice, startDate, endDate, catalogFilter, preferences.nameLocale, toast, queryClient]);

  const handleMassDelete = useCallback(async () => {
    const selectedProductIds = Object.keys(rowSelection).filter(
      (id: string) => rowSelection[id]
    );

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
      logClientError(error, { context: { source: 'AdminProductsPage', action: 'massDelete', productIds: selectedProductIds } });
      setActionError(error instanceof Error ? error.message : 'An error occurred during deletion.');
    }
  }, [rowSelection, setActionError, toast, bulkDeleteMutation]);

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
      logClientError(error, { context: { source: 'AdminProductsPage', action: 'singleDelete', productId: targetId } });
      setActionError(error instanceof Error ? error.message : 'An error occurred during deletion.');
    }
  }, [productToDelete, setActionError, toast, bulkDeleteMutation]);

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    setIsMounted(true);
    // Force fresh product queries on mount to avoid showing stale persisted caches.
    void invalidateProductsAndCounts(queryClient);
  }, [queryClient]);

  useEffect(() => {
    if (!lastEditedId) return;
    if (data.length === 0) return;
    const target = document.querySelector(`[data-row-id="${lastEditedId}"]`);
    if (target instanceof HTMLElement) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [data, lastEditedId]);

  const tableSkeletonRows = isMounted ? pageSize : 12;
  const tableSkeleton = useMemo(
    () => <ProductTableSkeleton rows={tableSkeletonRows} />,
    [tableSkeletonRows]
  );

  const handleProductsTableRender = useCallback<ProfilerOnRenderCallback>(
    (_id: string, _phase: 'mount' | 'update' | 'nested-update', actualDuration: number, _baseDuration: number, _startTime: number, commitTime: number) => {
      if (!isDebugOpen || typeof performance === 'undefined') return;
      performance.measure('products:tableRender', {
        start: commitTime - actualDuration,
        end: commitTime,
      });
    },
    [isDebugOpen]
  );

  const columns = useMemo(
    () => getProductColumns(preferences.thumbnailSource ?? 'file', productImageBaseUrl),
    [preferences.thumbnailSource, productImageBaseUrl]
  );

  return (
    <>
      {isDebugOpen && <DebugPanel />}
      <ConfirmDialog
        open={isMassDeleteConfirmOpen}
        onOpenChange={(open: boolean): void => setIsMassDeleteConfirmOpen(open)}
        onConfirm={(): void => {
          void handleMassDelete();
        }}
        title='Delete Products'
        description={`Are you sure you want to delete ${Object.keys(rowSelection).filter((id: string) => rowSelection[id]).length} selected products? This action cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
        loading={bulkDeleteMutation.isPending}
      />
      <ConfirmDialog
        open={!!productToDelete}
        onOpenChange={(open: boolean): void => {
          if (!open) setProductToDelete(null);
        }}
        onConfirm={(): void => {
          void handleConfirmSingleDelete();
        }}
        title='Delete Product'
        description={`Are you sure you want to delete product "${productToDelete?.name_en || productToDelete?.name_pl || 'this product'}"? This action cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
        loading={bulkDeleteMutation.isPending}
      />
      <ProductListProvider
        value={{
          onCreateProduct: handleOpenCreate,
          onCreateFromDraft: handleCreateFromDraft,
          activeDrafts,
          page,
          totalPages,
          setPage: handleSetPage,
          pageSize,
          setPageSize: handleSetPageSize,
          nameLocale: preferences.nameLocale,
          setNameLocale: handleSetNameLocale,
          languageOptions,
          currencyCode,
          setCurrencyCode: handleSetCurrencyCode,
          currencyOptions,
          catalogFilter,
          setCatalogFilter: handleSetCatalogFilter,
          catalogs,
          loadError: loadError?.message || null,
          actionError,
          onDismissActionError: handleDismissActionError,
          search,
          setSearch,
          sku,
          setSku,
          minPrice,
          setMinPrice,
          maxPrice,
          setMaxPrice,
          startDate: startDate || '',
          setStartDate,
          endDate: endDate || '',
          setEndDate,
          data: isMounted ? data : [],
          rowSelection,
          setRowSelection,
          onSelectAllGlobal: async (): Promise<void> => {
            await handleSelectAllGlobal();
          },
          loadingGlobal: loadingGlobalSelection,
          onDeleteSelected: async (): Promise<void> => { setIsMassDeleteConfirmOpen(true); },
          onAddToMarketplace: handleAddToMarketplace,
          handleProductsTableRender,
          tableColumns: columns,
          setRefreshTrigger,
          productNameKey: preferences.nameLocale,
          priceGroups,
          onProductNameClick: handleOpenEditModal,
          onProductEditClick: handleOpenEditModal,
          onProductDeleteClick: setProductToDelete,
          onIntegrationsClick: handleOpenIntegrationsModal,
          onExportSettingsClick: handleOpenExportSettings,
          integrationBadgeIds,
          integrationBadgeStatuses,
          queuedProductIds,
          getRowId,
          isLoading: !isMounted || isLoading,
          skeletonRows: tableSkeleton,
          // Modals
          isCreateOpen,
          initialSku,
          createDraft,
          initialCatalogId:
                  catalogFilter !== 'all' && catalogFilter !== 'unassigned'
                    ? catalogFilter
                    : null,
          onCloseCreate: handleCloseCreate,
          onCreateSuccess: () => {
            handleCreateSuccess();
            setCreateDraft(null);
          },
          editingProduct,
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
        }}
      >
        <ProductListPanel />
        <ProductModals />
      </ProductListProvider>
    </>
  );
}
