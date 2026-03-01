'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { ProfilerOnRenderCallback, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDraftQueries, draftKeys } from '@/features/drafter/hooks/useDraftQueries';
import {
  fetchIntegrationsWithConnections,
  fetchPreferredBaseConnection,
  integrationSelectionQueryKeys,
} from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import {
  fetchProductListings,
  productListingsQueryKey,
} from '@/features/integrations/hooks/useListingQueries';
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
import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import { getProductDetailQueryKey } from '@/features/products/hooks/productCache';
import { useCatalogSync } from '@/features/products/hooks/useCatalogSync';
import { useProductData } from '@/features/products/hooks/useProductData';
import { useProductSync } from '@/features/products/hooks/useProductEnhancements';
import { useProductOperations } from '@/features/products/hooks/useProductOperations';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import { useQueuedProductIds } from '@/features/products/state/queued-product-ops';
import type {
  ProductCategory,
  ProductWithImages,
  ProductDraftDto,
} from '@/shared/contracts/products';
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

import { useProductListSelection } from './product-list/useProductListSelection';
import { useProductListModals } from './product-list/useProductListModals';
import { useProductListUrlSync } from './product-list/useProductListUrlSync';

const PRODUCT_DETAIL_TIMEOUT_MS = 60_000;
const PRODUCT_CATEGORY_BATCH_TIMEOUT_MS = 60_000;
const DRAFT_DETAIL_TIMEOUT_MS = 30_000;

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
  const openProductIdFromQuery = searchParams.get('openProductId')?.trim() ?? '';
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const productImageBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const [jobCompletionHighlights, setJobCompletionHighlights] = useState<Record<string, number>>(
    {}
  );
  const previousQueuedProductIdsRef = useRef<Set<string> | null>(null);
  const previousListingBadgeStatusesRef = useRef<Map<string, string> | null>(null);
  const openingProductFromQueryRef = useRef<string | null>(null);
  const editOpenRequestTokenRef = useRef(0);
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

  const prefetchProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
      void queryClient.prefetchQuery({
        queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
        queryFn: () => fetchProductListings(productId),
        staleTime: 30 * 1000,
      });
    },
    [queryClient]
  );

  const refreshProductListingsData = useCallback(
    (productId: string): void => {
      if (!productId) return;
      void queryClient.fetchQuery({
        queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
        queryFn: () => fetchProductListings(productId),
        staleTime: 0,
      });
    },
    [queryClient]
  );

  const { data: allDrafts = [] } = useDraftQueries();
  const activeDrafts = useMemo(
    () => allDrafts.filter((d: ProductDraftDto) => d.active !== false),
    [allDrafts]
  );

  const queuedProductIds = useQueuedProductIds();

  useProductSync();

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

  const {
    data,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
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
    setAdvancedFilterState,
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
  const visibleProductIds = useMemo(
    () => Array.from(visibleProductIdSet),
    [visibleProductIdSet]
  );
  const categoryLookupCatalogIds = useMemo((): string[] => {
    const ids = new Set<string>();
    data.forEach((product: ProductWithImages) => {
      const categoryId = resolveProductCategoryId(product);
      const catalogId = resolveProductCatalogId(product);
      if (!categoryId || !catalogId) return;
      ids.add(catalogId);
    });
    return Array.from(ids).sort();
  }, [data]);

  const batchCategoryQueryKey = useMemo(
    () =>
      normalizeQueryKey([
        ...QUERY_KEYS.products.metadata.all,
        'categories-batch',
        categoryLookupCatalogIds,
      ]),
    [categoryLookupCatalogIds]
  );
  const { data: categoryBatchData } = useQuery<Record<string, ProductCategory[]>>({
    queryKey: batchCategoryQueryKey,
    queryFn: ({ signal }): Promise<Record<string, ProductCategory[]>> => {
      if (categoryLookupCatalogIds.length === 0) return Promise.resolve({});
      return api.get<Record<string, ProductCategory[]>>(
        `/api/products/categories/batch?catalogIds=${categoryLookupCatalogIds.map(encodeURIComponent).join(',')}`,
        {
          signal,
          timeout: PRODUCT_CATEGORY_BATCH_TIMEOUT_MS,
        }
      );
    },
    staleTime: 5 * 60 * 1_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: categoryLookupCatalogIds.length > 0,
  });

  const categoryNameById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    const locale = preferences.nameLocale ?? 'name_en';
    const grouped = categoryBatchData ?? {};
    for (const categories of Object.values(grouped)) {
      for (const category of categories) {
        if (!category.id || map.has(category.id)) continue;
        const label = resolveCategoryLabelByLocale(category, locale);
        if (!label) continue;
        map.set(category.id, label);
      }
    }
    return map;
  }, [categoryBatchData, preferences.nameLocale]);

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

  const editingProductDetailQuery = createSingleQueryV2<ProductWithImages>({
    id: editingProduct?.id,
    queryKey: (id) =>
      id !== 'none'
        ? QUERY_KEYS.products.detail(id)
        : [...QUERY_KEYS.products.details(), 'inactive'],
    queryFn: () =>
      api.get<ProductWithImages>(`/api/products/${editingProduct?.id}`, {
        timeout: PRODUCT_DETAIL_TIMEOUT_MS,
      }),
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
    setEditingProduct(markEditingProductHydrated(fresh));
  }, [editingProduct, editingProductDetailQuery.data, setEditingProduct]);

  useEffect(() => {
    if (editingProduct?.id) return;
    editOpenRequestTokenRef.current += 1;
  }, [editingProduct?.id]);

  const handleOpenEditModal = useCallback(
    (product: ProductWithImages) => {
      setActionError(null);
      editOpenRequestTokenRef.current += 1;
      const requestToken = editOpenRequestTokenRef.current;
      // Open modal immediately with list data; submit is blocked by requireHydratedEditProduct
      setEditingProduct(product);
      void queryClient
        .fetchQuery({
          queryKey: normalizeQueryKey(getProductDetailQueryKey(product.id)),
          queryFn: ({ signal }) =>
            api.get<ProductWithImages>(`/api/products/${encodeURIComponent(product.id)}?fresh=1`, {
              signal,
              cache: 'no-store',
              logError: false,
              timeout: PRODUCT_DETAIL_TIMEOUT_MS,
            }),
          staleTime: 0,
        })
        .then((freshProduct: ProductWithImages) => {
          if (editOpenRequestTokenRef.current !== requestToken) return;
          setEditingProduct(markEditingProductHydrated(freshProduct));
        })
        .catch((error: unknown) => {
          if (editOpenRequestTokenRef.current !== requestToken) return;
          if (error instanceof ApiError && error.status === 404) {
            toast('This product no longer exists. Refreshing the list.', { variant: 'warning' });
            setRefreshTrigger((prev: number) => prev + 1);
            return;
          }
          toast(error instanceof Error ? error.message : 'Failed to open product editor.', {
            variant: 'error',
          });
        });
    },
    [queryClient, setActionError, setEditingProduct, toast]
  );

  useEffect(() => {
    if (!openProductIdFromQuery) {
      openingProductFromQueryRef.current = null;
      return;
    }
    if (editingProduct?.id === openProductIdFromQuery) return;
    if (openingProductFromQueryRef.current === openProductIdFromQuery) return;
    openingProductFromQueryRef.current = openProductIdFromQuery;
    editOpenRequestTokenRef.current += 1;
    const requestToken = editOpenRequestTokenRef.current;

    setActionError(null);
    void queryClient
      .fetchQuery({
        queryKey: normalizeQueryKey(getProductDetailQueryKey(openProductIdFromQuery)),
        queryFn: ({ signal }) =>
          api.get<ProductWithImages>(
            `/api/products/${encodeURIComponent(openProductIdFromQuery)}?fresh=1`,
            {
              signal,
              cache: 'no-store',
              logError: false,
              timeout: PRODUCT_DETAIL_TIMEOUT_MS,
            }
          ),
        staleTime: 0,
      })
      .then((freshProduct: ProductWithImages) => {
        if (editOpenRequestTokenRef.current !== requestToken) return;
        setEditingProduct(markEditingProductHydrated(freshProduct));
      })
      .catch((error: unknown) => {
        if (editOpenRequestTokenRef.current !== requestToken) return;
        if (error instanceof ApiError && error.status === 404) {
          toast('This product no longer exists. Refreshing the list.', { variant: 'warning' });
          setRefreshTrigger((prev: number) => prev + 1);
          return;
        }
        toast(error instanceof Error ? error.message : 'Failed to open product editor.', {
          variant: 'error',
        });
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

  const handleSetPageSize = useCallback(
    (size: number) => {
      setPageSize(size);
      void updatePageSize(size);
    },
    [setPageSize, updatePageSize]
  );

  const handleSetAdvancedFilterState = useCallback(
    (value: string, presetId: string | null) => {
      const normalizedValue = value.trim();
      const normalizedPresetId = normalizedValue.length > 0 ? presetId : null;
      setAdvancedFilterState(normalizedValue, normalizedPresetId);
      void persistAppliedAdvancedFilterState({
        advancedFilter: normalizedValue,
        presetId: normalizedPresetId,
      });
    },
    [persistAppliedAdvancedFilterState, setAdvancedFilterState]
  );

  const handleSetAdvancedFilter = useCallback(
    (value: string) => {
      handleSetAdvancedFilterState(value, null);
    },
    [handleSetAdvancedFilterState]
  );

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

  const handleCreateFromDraft = useCallback(
    (draftId: string): void => {
      const run = async (): Promise<void> => {
        try {
          const draft = await queryClient.fetchQuery({
            queryKey: normalizeQueryKey(draftKeys.detail(draftId)),
            queryFn: () =>
              api.get<ProductDraftDto>(`/api/drafts/${draftId}`, {
                timeout: DRAFT_DETAIL_TIMEOUT_MS,
              }),
          });
          setCreateDraft(draft);
          handleOpenCreateFromDraft(draft);
          toast(`Creating product from draft: ${draft.name}`, { variant: 'success' });
        } catch (error) {
          logClientError(error, {
            context: { source: 'useProductListState', action: 'createFromDraft', draftId },
          });
          toast('Failed to load draft template', { variant: 'error' });
        }
      };
      void run();
    },
    [handleOpenCreateFromDraft, toast, queryClient, setCreateDraft]
  );

  const handleCloseEdit = useCallback(() => {
    setEditingProduct(null);
    clearProductEditorQueryParams();
  }, [clearProductEditorQueryParams, setEditingProduct]);

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

  return useMemo(
    () => ({
      onCreateProduct: handleOpenCreate,
      onCreateFromDraft: handleCreateFromDraft,
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
      handleCreateFromDraft,
      handleCreateSuccess,
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
    ]
  );
}
