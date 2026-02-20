'use client';

import { useQueries, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProfilerOnRenderCallback, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDraftQueries, draftKeys } from '@/features/drafter/hooks/useDraftQueries';
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
import { getProductColumns } from '@/features/products/components/list/ProductColumns';
import { ProductTableSkeleton } from '@/features/products/components/list/ProductTableSkeleton';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import {
  EDIT_PRODUCT_DETAIL_STALE_TIME_MS,
  LISTING_COMPLETED_STATUSES,
  LISTING_IN_FLIGHT_STATUSES,
  PRODUCT_ROW_HIGHLIGHT_TOTAL_MS,
  isIncomingProductDetailNewer,
  normalizeListingStatus,
  resolveCategoryLabelByLocale,
  resolveProductCatalogId,
  resolveProductCategoryId,
} from '@/features/products/hooks/product-list-state-utils';
import {
  getProductDetailQueryKey,
  getProductListQueryKey,
} from '@/features/products/hooks/productCache';
import { useCatalogSync } from '@/features/products/hooks/useCatalogSync';
import {
  useProductData,
  useBulkDeleteProductsMutation,
} from '@/features/products/hooks/useProductData';
import { 
  useProductSync 
} from '@/features/products/hooks/useProductEnhancements';
import { useProductOperations } from '@/features/products/hooks/useProductOperations';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import { useQueuedProductIds } from '@/features/products/state/queued-product-ops';
import type { ProductCategory, ProductWithImages } from '@/features/products/types';
import type { ProductDraftDto } from '@/features/products/types/drafts';
import { useProductListSync } from '@/shared/hooks/sync/useBackgroundSync';
import { ApiError, api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { ProductListContextType } from '../context/ProductListContext';
import type { Row } from '@tanstack/react-table';

type RowSelectionState = Record<string, boolean>;
const PRODUCT_EDITOR_QUERY_KEYS = [
  'openProductId',
  'openProductTab',
  'studioImageSlotIndex',
  'studioVariantSlotId',
  'studioProjectId',
  'studioSourceSlotId',
] as const;

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openProductIdFromQuery = searchParams.get('openProductId')?.trim() ?? '';
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const productImageBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [jobCompletionHighlights, setJobCompletionHighlights] = useState<Record<string, number>>({});
  const [createDraft, setCreateDraft] = useState<ProductDraftDto | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductWithImages | null>(null);
  const previousQueuedProductIdsRef = useRef<Set<string> | null>(null);
  const previousListingBadgeStatusesRef = useRef<Map<string, string> | null>(null);
  const openingProductFromQueryRef = useRef<string | null>(null);
  const jobHighlightTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const queryClient = useQueryClient();

  const prefetchIntegrationSelectionData = useCallback((): void => {
    void import('@/features/integrations/components/listings/SelectIntegrationModal');
    void queryClient.prefetchQuery({
      queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
      queryFn: fetchIntegrationsWithConnections,
      staleTime: 5 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
      queryFn: fetchPreferredBaseConnection,
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  const prefetchProductListingsData = useCallback((productId: string): void => {
    if (!productId) return;
    void queryClient.prefetchQuery({
      queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
      queryFn: () => fetchProductListings(productId),
      staleTime: 30 * 1000,
    });
  }, [queryClient]);

  const refreshProductListingsData = useCallback((productId: string): void => {
    if (!productId) return;
    void queryClient.fetchQuery({
      queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
      queryFn: () => fetchProductListings(productId),
      staleTime: 0,
    });
  }, [queryClient]);

  const { data: allDrafts = [] } = useDraftQueries();
  const activeDrafts = useMemo(() => allDrafts.filter((d: ProductDraftDto) => d.active !== false), [allDrafts]);

  const queuedProductIds = useQueuedProductIds();

  // Keep cross-tab list updates, avoid eager warmups on initial page load.
  useProductSync();

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
  } = useCatalogSync(preferences.catalogFilter || 'all', {
    enabled: !preferencesLoading,
  });

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
    description,
    setDescription,
    categoryId,
    setCategoryId,
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
    preferencesLoaded: !preferencesLoading,
    currencyCode,
    priceGroups,
    searchLanguage: preferences.nameLocale,
  });
  const visibleProductIdSet = useMemo(
    () => new Set(data.map((product: ProductWithImages) => product.id)),
    [data]
  );
  const categoryLookupCatalogIds = useMemo((): string[] => {
    const ids = new Set<string>();
    data.forEach((product: ProductWithImages) => {
      const categoryId = resolveProductCategoryId(product);
      const catalogId = resolveProductCatalogId(product);
      if (!categoryId || !catalogId) return;
      ids.add(catalogId);
    });
    return Array.from(ids);
  }, [data]);
  const categoryQueries = useQueries({
    queries: categoryLookupCatalogIds.map((catalogId: string) => ({
      queryKey: normalizeQueryKey(QUERY_KEYS.products.metadata.categories(catalogId)),
      queryFn: ({ signal }: { signal?: AbortSignal }): Promise<ProductCategory[]> =>
        api.get<ProductCategory[]>(
          `/api/products/categories?catalogId=${encodeURIComponent(catalogId)}`,
          { signal }
        ),
      staleTime: 1000 * 60 * 5,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    })),
  });
  const categoryNameById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    const locale = preferences.nameLocale ?? 'name_en';
    categoryQueries.forEach((queryResult) => {
      const categories = queryResult.data ?? [];
      categories.forEach((category: ProductCategory) => {
        if (!category.id || map.has(category.id)) return;
        const label = resolveCategoryLabelByLocale(category, locale);
        if (!label) return;
        map.set(category.id, label);
      });
    });
    return map;
  }, [categoryQueries, preferences.nameLocale]);

  // Enable background sync for product list
  useProductListSync({
    search,
    sku,
    description,
    categoryId,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    catalogFilter,
    baseExported,
    page,
    pageSize,
  }, !isLoading);

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

  const editingProductDetailQuery = createSingleQueryV2<ProductWithImages>({
    id: editingProduct?.id,
    queryKey: (id) =>
      id !== 'none'
        ? QUERY_KEYS.products.detail(id)
        : [...QUERY_KEYS.products.details(), 'inactive'],
    queryFn: () =>
      api.get<ProductWithImages>(`/api/products/${editingProduct?.id}`),
    staleTime: EDIT_PRODUCT_DETAIL_STALE_TIME_MS,
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'products.hooks.useProductListState.editingProductDetail',
      operation: 'detail',
      resource: 'products.detail',
      domain: 'products',
      tags: ['products', 'detail', 'editing'],
    },
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
    traderaBadgeIds,
    traderaBadgeStatuses,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
    handleListProductSuccess: baseHandleListProductSuccess,
  } = useIntegrationOperations();
  const visibleListingBadgeStatuses = useMemo(() => {
    const statuses = new Map<string, string>();
    for (const product of data) {
      const baseStatus = normalizeListingStatus(integrationBadgeStatuses.get(product.id));
      if (baseStatus) {
        statuses.set(`${product.id}:base`, baseStatus);
      }
      const traderaStatus = normalizeListingStatus(traderaBadgeStatuses.get(product.id));
      if (traderaStatus) {
        statuses.set(`${product.id}:tradera`, traderaStatus);
      }
    }
    return statuses;
  }, [data, integrationBadgeStatuses, traderaBadgeStatuses]);

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
    if (!isIncomingProductDetailNewer(fresh, editingProduct)) return;
    setEditingProduct(fresh);
  }, [editingProduct, editingProductDetailQuery.data, setEditingProduct]);

  const handleOpenEditModal = useCallback((product: ProductWithImages) => {
    setActionError(null);
    void queryClient
      .fetchQuery({
        queryKey: normalizeQueryKey(getProductDetailQueryKey(product.id)),
        queryFn: ({ signal }) =>
          api.get<ProductWithImages>(`/api/products/${encodeURIComponent(product.id)}`, {
            signal,
            cache: 'no-store',
            logError: false,
          }),
        staleTime: EDIT_PRODUCT_DETAIL_STALE_TIME_MS,
      })
      .then((freshProduct: ProductWithImages) => {
        setEditingProduct(freshProduct);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          toast('This product no longer exists. Refreshing the list.', { variant: 'warning' });
          setRefreshTrigger((prev: number) => prev + 1);
          return;
        }
        toast(
          error instanceof Error ? error.message : 'Failed to open product editor.',
          { variant: 'error' }
        );
      });
  }, [queryClient, setActionError, setEditingProduct, toast]);

  useEffect(() => {
    if (!openProductIdFromQuery) {
      openingProductFromQueryRef.current = null;
      return;
    }
    if (editingProduct?.id === openProductIdFromQuery) return;
    if (openingProductFromQueryRef.current === openProductIdFromQuery) return;
    openingProductFromQueryRef.current = openProductIdFromQuery;

    setActionError(null);
    void queryClient
      .fetchQuery({
        queryKey: normalizeQueryKey(getProductDetailQueryKey(openProductIdFromQuery)),
        queryFn: ({ signal }) =>
          api.get<ProductWithImages>(`/api/products/${encodeURIComponent(openProductIdFromQuery)}`, {
            signal,
            cache: 'no-store',
            logError: false,
          }),
        staleTime: EDIT_PRODUCT_DETAIL_STALE_TIME_MS,
      })
      .then((freshProduct: ProductWithImages) => {
        setEditingProduct(freshProduct);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          toast('This product no longer exists. Refreshing the list.', { variant: 'warning' });
          setRefreshTrigger((prev: number) => prev + 1);
          return;
        }
        toast(
          error instanceof Error ? error.message : 'Failed to open product editor.',
          { variant: 'error' }
        );
      });
  }, [
    editingProduct?.id,
    openProductIdFromQuery,
    queryClient,
    setActionError,
    setEditingProduct,
    toast,
  ]);

  useEffect(() => {
    if (!editingProduct?.id) return;
    if (!editingProductDetailQuery.error) return;
    const error = editingProductDetailQuery.error;
    if (!(error instanceof ApiError) || error.status !== 404) return;

    setEditingProduct(null);
    toast('This product was deleted or is unavailable.', { variant: 'warning' });
    setRefreshTrigger((prev: number) => prev + 1);
  }, [editingProduct?.id, editingProductDetailQuery.error, setEditingProduct, toast]);

  const handleOpenCreate = useCallback(() => {
    setCreateDraft(null);
    handleOpenCreateModal();
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

  const triggerJobCompletionHighlight = useCallback((productId: string): void => {
    if (!productId) return;

    setJobCompletionHighlights((prev: Record<string, number>) => ({
      ...prev,
      [productId]: (prev[productId] ?? 0) + 1,
    }));

    const existingTimeout = jobHighlightTimeoutsRef.current.get(productId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      setJobCompletionHighlights((prev: Record<string, number>) => {
        if (!(productId in prev)) return prev;
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      jobHighlightTimeoutsRef.current.delete(productId);
    }, PRODUCT_ROW_HIGHLIGHT_TOTAL_MS);

    jobHighlightTimeoutsRef.current.set(productId, timeoutId);
  }, []);

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
          queryKey: normalizeQueryKey(draftKeys.detail(draftId)),
          queryFn: () => api.get<ProductDraftDto>(`/api/drafts/${draftId}`)
        });
        setCreateDraft(draft);
        handleOpenCreateFromDraft(draft);
        toast(`Creating product from draft: ${draft.name}`, { variant: 'success' });
      } catch (error) {
        logClientError(error, { context: { source: 'useProductListState', action: 'createFromDraft', draftId } });
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

  const clearProductEditorQueryParams = useCallback((): void => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    PRODUCT_EDITOR_QUERY_KEYS.forEach((key) => {
      if (!params.has(key)) return;
      params.delete(key);
      changed = true;
    });
    if (!changed) return;
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleCloseEdit = useCallback(() => {
    setEditingProduct(null);
    clearProductEditorQueryParams();
  }, [clearProductEditorQueryParams, setEditingProduct]);

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
        description,
        categoryId: categoryId || undefined,
        minPrice,
        maxPrice,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        catalogId: catalogFilter === 'all' ? undefined : catalogFilter,
        searchLanguage: preferences.nameLocale,
        baseExported:
          baseExported === 'true'
            ? true
            : baseExported === 'false'
              ? false
              : undefined,
      };

      const allProducts = await queryClient.fetchQuery({
        queryKey: normalizeQueryKey(getProductListQueryKey({ scope: 'all', ...filters })),
        queryFn: () => getProducts(filters)
      });

      const newSelection: RowSelectionState = {};
      allProducts.forEach((p: ProductWithImages) => {
        newSelection[p.id] = true;
      });
      setRowSelection(newSelection);
      toast(`Selected ${allProducts.length} products.`, { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useProductListState', action: 'selectAllGlobal' } });
      toast('Failed to select all products', { variant: 'error' });
    } finally {
      setLoadingGlobalSelection(false);
    }
  }, [search, sku, description, categoryId, minPrice, maxPrice, startDate, endDate, catalogFilter, baseExported, preferences.nameLocale, toast, queryClient]);

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
      logClientError(error, { context: { source: 'useProductListState', action: 'massDelete', productIds: selectedProductIds } });
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
      logClientError(error, { context: { source: 'useProductListState', action: 'singleDelete', productId: targetId } });
      setActionError(error instanceof Error ? error.message : 'An error occurred during deletion.');
    }
  }, [productToDelete, setActionError, toast, bulkDeleteMutation]);

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const previousQueuedProductIds = previousQueuedProductIdsRef.current;
    if (previousQueuedProductIds) {
      previousQueuedProductIds.forEach((productId: string) => {
        if (!queuedProductIds.has(productId) && visibleProductIdSet.has(productId)) {
          triggerJobCompletionHighlight(productId);
        }
      });
    }
    previousQueuedProductIdsRef.current = new Set(queuedProductIds);
  }, [queuedProductIds, triggerJobCompletionHighlight, visibleProductIdSet]);

  useEffect(() => {
    const previousStatuses = previousListingBadgeStatusesRef.current;
    if (previousStatuses) {
      const completedProductIds = new Set<string>();

      previousStatuses.forEach((previousStatus: string, key: string) => {
        if (!LISTING_IN_FLIGHT_STATUSES.has(previousStatus)) return;

        const currentStatus = visibleListingBadgeStatuses.get(key);
        if (!currentStatus || !LISTING_COMPLETED_STATUSES.has(currentStatus)) return;

        const productId = key.split(':')[0];
        if (!productId || !visibleProductIdSet.has(productId)) return;
        completedProductIds.add(productId);
      });

      completedProductIds.forEach((productId: string) => {
        triggerJobCompletionHighlight(productId);
      });
    }

    previousListingBadgeStatusesRef.current = new Map(visibleListingBadgeStatuses);
  }, [triggerJobCompletionHighlight, visibleListingBadgeStatuses, visibleProductIdSet]);

  useEffect(() => {
    return (): void => {
      jobHighlightTimeoutsRef.current.forEach((timeoutId: ReturnType<typeof setTimeout>) => {
        clearTimeout(timeoutId);
      });
      jobHighlightTimeoutsRef.current.clear();
    };
  }, []);

  const getRowClassName = useCallback((row: Row<ProductWithImages>): string | undefined => {
    const highlightToken = jobCompletionHighlights[row.original.id];
    if (!highlightToken) return undefined;

    return highlightToken % 2 === 0
      ? 'product-list-row-job-complete-highlight-a'
      : 'product-list-row-job-complete-highlight-b';
  }, [jobCompletionHighlights]);

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
    () => getProductColumns(preferences.thumbnailSource ?? 'file', productImageBaseUrl, categoryNameById),
    [categoryNameById, preferences.thumbnailSource, productImageBaseUrl]
  );

  return useMemo(() => ({
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
    filtersCollapsedByDefault: preferences.filtersCollapsedByDefault ?? false,
    catalogFilter,
    setCatalogFilter: handleSetCatalogFilter,
    baseExported,
    setBaseExported,
    catalogs,
    loadError: loadError?.message || null,
    actionError,
    onDismissActionError: handleDismissActionError,
    search,
    setSearch,
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
    getRowClassName,
    setRefreshTrigger,
    productNameKey: preferences.nameLocale,
    priceGroups,
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
    getRowId,
    isLoading: !isMounted || isLoading,
    skeletonRows: tableSkeleton,
    maxHeight: 'calc(100vh - 280px)',
    stickyHeader: true,
    // Modals
    isCreateOpen,
    isPromptOpen,
    setIsPromptOpen,
    handleConfirmSku,
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
    // Hook-specific exports
    isDebugOpen,
    isMounted,
    productToDelete,
    setProductToDelete,
    isMassDeleteConfirmOpen,
    setIsMassDeleteConfirmOpen,
    handleMassDelete,
    handleConfirmSingleDelete,
    bulkDeletePending: bulkDeleteMutation.isPending,
  }), [
    activeDrafts,
    bulkDeleteMutation.isPending,
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
    handleCloseCreate,
    handleCloseEdit,
    handleCloseIntegrations,
    handleCloseListProduct,
    handleCloseMassList,
    handleConfirmSingleDelete,
    handleCreateFromDraft,
    handleCreateSuccess,
    handleDismissActionError,
    handleEditSave,
    handleEditSuccess,
    handleListProductSuccess,
    handleMassDelete,
    handleMassListSuccess,
    handleOpenCreate,
    handleOpenEditModal,
    handleOpenExportSettings,
    handleOpenIntegrationsModal,
    handleProductsTableRender,
    getRowClassName,
    handleSelectAllGlobal,
    handleSelectIntegrationFromModal,
    handleSetCatalogFilter,
    handleSetCurrencyCode,
    handleSetNameLocale,
    handleSetPage,
    handleSetPageSize,
    handleStartListing,
    initialSku,
    integrationBadgeIds,
    integrationBadgeStatuses,
    integrationsProduct,
    isCreateOpen,
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
    page,
    pageSize,
    preferences.nameLocale,
    preferences.filtersCollapsedByDefault,
    priceGroups,
    productToDelete,
    queuedProductIds,
    refresh,
    rowSelection,
    search,
    showIntegrationModal,
    showListProductModal,
    sku,
    description,
    categoryId,
    baseExported,
    setBaseExported,
    startDate,
    tableSkeleton,
    totalPages,
    traderaBadgeIds,
    traderaBadgeStatuses,
  ]);
}
