'use client';

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useCatalogSync } from '@/features/products/hooks/useCatalogSync';
import { useProductData } from '@/features/products/hooks/useProductData';
import { useProductSync } from '@/features/products/hooks/useProductEnhancements';
import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import {
  isProductListDebugSearch,
  logProductListDebug,
} from '@/features/products/lib/product-list-observability';
import * as queuedProductOps from '@/features/products/state/queued-product-ops';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { useDraftQueries } from '@/shared/hooks/useDraftQueries';
import {
  DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID,
  resolveDefaultProductCategoryTreeCatalogId,
} from '@/shared/lib/products/default-category-tree';
import {
  type BackgroundSyncEvent,
  useProductListSync,
} from '@/shared/hooks/sync/useBackgroundSync';

import { useProductListCategories } from './useProductListCategories';
import { useProductAiPathsRunSync } from '../useProductAiPathsRunSync';
import { useProductListScanRunSync } from '../useProductListScanRunSync';
import { shouldEnableProductListBackgroundSyncRuntime } from './productListStateHelpers';

type ProductListRuntimeDataInput = {
  draftsReady: boolean;
  isMounted: boolean;
  refreshTrigger: number;
  rowRuntimeReady: boolean;
  searchParams: URLSearchParams;
};

type ProductListSyncFilters = Parameters<typeof useProductListSync>[0];
type ProductListUserCatalogState = ReturnType<typeof useProductListUserCatalogState>;
type ProductListQueryState = {
  categoryNameById: ReadonlyMap<string, string>;
  productAiRunStatusByProductId: ReturnType<typeof useProductAiPathsRunSync>;
  productData: ReturnType<typeof useProductData>;
  productScanRunStatusByProductId: ReturnType<typeof useProductListScanRunSync>;
  queuedProductOperationIds: Set<string>;
  queuedProductIds: Set<string>;
  shouldEnableListBackgroundSync: boolean;
  visibleData: ProductWithImages[];
  visibleProductIdSet: Set<string>;
};

const resolveCatalogFilterPreference = (value: string): string =>
  value.length > 0 ? value : 'all';

const buildProductListSyncFilters = (
  productData: ReturnType<typeof useProductData>
): ProductListSyncFilters => ({
  search: productData.search,
  sku: productData.sku,
  description: productData.description,
  categoryId: productData.categoryId,
  minPrice: productData.minPrice,
  maxPrice: productData.maxPrice,
  stockValue: productData.stockValue,
  stockOperator: productData.stockOperator,
  startDate: productData.startDate,
  endDate: productData.endDate,
  advancedFilter: productData.advancedFilter,
  catalogFilter: productData.catalogFilter,
  baseExported: productData.baseExported,
  includeArchived: productData.includeArchived,
  ids: productData.parsedMatchProductIds.length > 0
    ? productData.parsedMatchProductIds
    : undefined,
  page: productData.page,
  pageSize: productData.pageSize,
});

const useProductListBackgroundSyncLogging = ({
  enabled,
  productAiRunStatusByProductId,
  productData,
  queuedProductIds,
}: {
  enabled: boolean;
  productAiRunStatusByProductId: ReturnType<typeof useProductAiPathsRunSync>;
  productData: ReturnType<typeof useProductData>;
  queuedProductIds: Set<string>;
}): void => {
  const handleSyncEvent = useCallback(
    (event: BackgroundSyncEvent): void => {
      logProductListDebug(
        'background-sync-event',
        {
          ...event,
          queueCount: queuedProductIds.size,
          trackedAiRunsCount: productAiRunStatusByProductId.size,
          filters: {
            page: productData.page,
            pageSize: productData.pageSize,
            hasSearch: productData.search.length > 0,
            hasSku: productData.sku.length > 0,
            hasDescription: productData.description.length > 0,
            hasAdvancedFilter: productData.advancedFilter.length > 0,
            catalogFilter: productData.catalogFilter,
            baseExported: productData.baseExported,
            includeArchived: productData.includeArchived,
            parsedMatchProductIdsCount: productData.parsedMatchProductIds.length,
          },
        },
        { dedupeKey: `background-sync-event:${event.reason}:${event.status}`, throttleMs: 750 }
      );
    },
    [productAiRunStatusByProductId.size, productData, queuedProductIds.size]
  );

  useProductListSync(
    buildProductListSyncFilters(productData),
    enabled,
    { onSyncEvent: handleSyncEvent }
  );
};

const useProductListUserCatalogState = (
  rowRuntimeReady: boolean
): {
  catalogState: ReturnType<typeof useCatalogSync>;
  imageExternalBaseUrl: string | null;
  preferencesState: ReturnType<typeof useUserPreferences>;
  setShowTriggerRunFeedback: Dispatch<SetStateAction<boolean>>;
  showTriggerRunFeedback: boolean;
} => {
  const preferencesState = useUserPreferences();
  const { imageExternalBaseUrl } = useProductSettings();
  const [showTriggerRunFeedback, setShowTriggerRunFeedback] = useState(
    preferencesState.preferences.showTriggerRunFeedback
  );
  const catalogState = useCatalogSync(
    resolveCatalogFilterPreference(preferencesState.preferences.catalogFilter),
    { enabled: rowRuntimeReady }
  );

  useEffect(() => {
    if (preferencesState.loading) return;
    const currencyCode = preferencesState.preferences.currencyCode;
    if (currencyCode === null || currencyCode.length === 0) return;
    catalogState.setCurrencyCode(currencyCode);
  }, [catalogState, preferencesState.loading, preferencesState.preferences.currencyCode]);

  useEffect(() => {
    if (preferencesState.loading) return;
    setShowTriggerRunFeedback(preferencesState.preferences.showTriggerRunFeedback);
  }, [preferencesState.loading, preferencesState.preferences.showTriggerRunFeedback]);

  return {
    catalogState,
    imageExternalBaseUrl,
    preferencesState,
    setShowTriggerRunFeedback,
    showTriggerRunFeedback,
  };
};

const useProductListDraftState = (draftsReady: boolean): ProductDraft[] => {
  const draftQueries = useDraftQueries as (
    notebookId?: string,
    options?: { enabled?: boolean }
  ) => ListQuery<ProductDraft>;
  const { data: allDrafts = [] } = draftQueries(undefined, { enabled: draftsReady });
  return useMemo(
    () => allDrafts.filter((draft: ProductDraft) => draft.active !== false),
    [allDrafts]
  );
};

const useProductListProductData = (
  input: ProductListRuntimeDataInput,
  userCatalog: ProductListUserCatalogState
): ReturnType<typeof useProductData> =>
  useProductData({
    refreshTrigger: input.refreshTrigger,
    initialCatalogFilter: userCatalog.preferencesState.preferences.catalogFilter,
    initialPageSize: userCatalog.preferencesState.preferences.pageSize,
    initialAppliedAdvancedFilter: userCatalog.preferencesState.preferences.appliedAdvancedFilter,
    initialAppliedAdvancedFilterPresetId:
      userCatalog.preferencesState.preferences.appliedAdvancedFilterPresetId,
    preferencesLoaded: userCatalog.preferencesState.loading !== true,
    currencyCode: userCatalog.catalogState.currencyCode,
    priceGroups: userCatalog.catalogState.priceGroups,
    searchLanguage: userCatalog.preferencesState.preferences.nameLocale,
  });

const useVisibleProductRows = (
  isMounted: boolean,
  productData: ReturnType<typeof useProductData>
): {
  visibleData: ProductWithImages[];
  visibleProductIdSet: Set<string>;
} => {
  const visibleData = useMemo(
    () => (isMounted ? productData.data : []),
    [isMounted, productData.data]
  );
  const visibleProductIdSet = useMemo(
    () => new Set(visibleData.map((product: ProductWithImages) => product.id)),
    [visibleData]
  );
  return { visibleData, visibleProductIdSet };
};

const useProductListCategoryNames = (
  input: ProductListRuntimeDataInput,
  userCatalog: ProductListUserCatalogState,
  visibleData: ProductWithImages[]
): ReadonlyMap<string, string> => {
  const { categoryNameById } = useProductListCategories({
    data: visibleData,
    nameLocale: userCatalog.preferencesState.preferences.nameLocale,
    enabled: input.rowRuntimeReady,
    defaultCategoryCatalogId:
      resolveDefaultProductCategoryTreeCatalogId(userCatalog.catalogState.catalogs) ??
      (userCatalog.catalogState.catalogsLoading ? null : DEFAULT_PRODUCT_CATEGORY_TREE_CATALOG_ID),
  });
  return categoryNameById;
};

const useProductListQueryState = (
  input: ProductListRuntimeDataInput,
  userCatalog: ProductListUserCatalogState
): ProductListQueryState => {
  const queuedProductOperationIds = queuedProductOps.useQueuedProductIds();
  const queuedProductIds = queuedProductOps.useQueuedAiRunProductIds();
  useProductSync({ enabled: input.rowRuntimeReady });
  const productAiRunStatusByProductId = useProductAiPathsRunSync({
    enabled: input.rowRuntimeReady,
  });
  const productData = useProductListProductData(input, userCatalog);
  const { visibleData, visibleProductIdSet } = useVisibleProductRows(
    input.isMounted,
    productData
  );
  const productScanRunStatusByProductId = useProductListScanRunSync({
    enabled: input.rowRuntimeReady,
    productIds: visibleData.map((product: ProductWithImages) => product.id),
  });
  const categoryNameById = useProductListCategoryNames(input, userCatalog, visibleData);
  const shouldEnableListBackgroundSync = shouldEnableProductListBackgroundSyncRuntime({
    rowRuntimeReady: input.rowRuntimeReady,
    isLoading: productData.isLoading,
    queuedProductIdsCount: queuedProductOperationIds.size,
    activeTrackedProductAiRunsCount: productAiRunStatusByProductId.size,
  });
  useProductListBackgroundSyncLogging({
    enabled: shouldEnableListBackgroundSync,
    productAiRunStatusByProductId,
    productData,
    queuedProductIds: queuedProductOperationIds,
  });
  return {
    categoryNameById,
    productAiRunStatusByProductId,
    productData,
    productScanRunStatusByProductId,
    queuedProductOperationIds,
    queuedProductIds,
    shouldEnableListBackgroundSync,
    visibleData,
    visibleProductIdSet,
  };
};

export const useProductListDataState = (
  input: ProductListRuntimeDataInput
): ReturnType<typeof useProductListUserCatalogState> &
  ReturnType<typeof useProductListQueryState> & {
    activeDrafts: ProductDraft[];
    isProductListDebugOpen: boolean;
  } => {
  const userCatalog = useProductListUserCatalogState(input.rowRuntimeReady);
  const queryState = useProductListQueryState(input, userCatalog);
  const activeDrafts = useProductListDraftState(input.draftsReady);
  const isProductListDebugOpen = useMemo(
    () => isProductListDebugSearch(input.searchParams.toString()),
    [input.searchParams]
  );
  return { ...userCatalog, ...queryState, activeDrafts, isProductListDebugOpen };
};
