'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { internalError } from '@/shared/errors/app-error';
import { resolveProductAiRunFeedbackForList } from '@/features/products/lib/product-ai-run-feedback';

import type {
  ProductListActionsContextType,
  ProductListAlertsContextType,
  ProductListContextType,
  ProductListFiltersContextType,
  ProductListHeaderActionsContextType,
  ProductListModalsContextType,
  ProductListRowActionsContextType,
  ProductListRowRuntimeContextType,
  ProductListRowVisualsContextType,
  ProductListSelectionContextType,
  ProductListTableContextType,
} from './ProductListContext.types';

export type {
  ProductListActionsContextType,
  ProductListAlertsContextType,
  ProductListContextType,
  ProductListFiltersContextType,
  ProductListHeaderActionsContextType,
  ProductListModalsContextType,
  ProductListRowActionsContextType,
  ProductListRowRuntimeContextType,
  ProductListRowVisualsContextType,
  ProductListSelectionContextType,
  ProductListTableContextType,
} from './ProductListContext.types';

const ProductListFiltersContext = createContext<ProductListFiltersContextType | null>(null);
const ProductListSelectionContext = createContext<ProductListSelectionContextType | null>(null);
const ProductListTableContext = createContext<ProductListTableContextType | null>(null);
const ProductListAlertsContext = createContext<ProductListAlertsContextType | null>(null);
const ProductListActionsContext = createContext<ProductListActionsContextType | null>(null);
const ProductListHeaderActionsContext = createContext<ProductListHeaderActionsContextType | null>(
  null
);
const ProductListRowActionsContext = createContext<ProductListRowActionsContextType | null>(null);
const ProductListRowVisualsContext = createContext<ProductListRowVisualsContextType | null>(null);
type ProductListRowRuntimeStoreState = Pick<
  ProductListContextType,
  | 'integrationBadgeIds'
  | 'integrationBadgeStatuses'
  | 'traderaBadgeIds'
  | 'traderaBadgeStatuses'
  | 'queuedProductIds'
  | 'productAiRunStatusByProductId'
>;

type ProductListRowRuntimeStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: (
    productId: string,
    baseProductId: string | null | undefined
  ) => ProductListRowRuntimeContextType;
  setState: (nextState: ProductListRowRuntimeStoreState) => void;
};

const EMPTY_PRODUCT_LIST_ROW_RUNTIME_SNAPSHOT: ProductListRowRuntimeContextType = Object.freeze({
  showMarketplaceBadge: false,
  integrationStatus: 'not_started',
  showTraderaBadge: false,
  traderaStatus: 'not_started',
  productAiRunFeedback: null,
});

const ProductListRowRuntimeStoreContext = createContext<ProductListRowRuntimeStore | null>(null);
const ProductListModalsContext = createContext<ProductListModalsContextType | null>(null);

const areProductAiRunFeedbacksEqual = (
  left: ProductListRowRuntimeContextType['productAiRunFeedback'],
  right: ProductListRowRuntimeContextType['productAiRunFeedback']
): boolean => {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.runId === right.runId &&
    left.status === right.status &&
    left.updatedAt === right.updatedAt &&
    left.label === right.label &&
    left.variant === right.variant &&
    left.badgeClassName === right.badgeClassName
  );
};

const areProductListRowRuntimeSnapshotsEqual = (
  left: ProductListRowRuntimeContextType,
  right: ProductListRowRuntimeContextType
): boolean =>
  left.showMarketplaceBadge === right.showMarketplaceBadge &&
  left.integrationStatus === right.integrationStatus &&
  left.showTraderaBadge === right.showTraderaBadge &&
  left.traderaStatus === right.traderaStatus &&
  areProductAiRunFeedbacksEqual(left.productAiRunFeedback, right.productAiRunFeedback);

const areProductListRowRuntimeStoreStatesEqual = (
  left: ProductListRowRuntimeStoreState,
  right: ProductListRowRuntimeStoreState
): boolean =>
  left.integrationBadgeIds === right.integrationBadgeIds &&
  left.integrationBadgeStatuses === right.integrationBadgeStatuses &&
  left.traderaBadgeIds === right.traderaBadgeIds &&
  left.traderaBadgeStatuses === right.traderaBadgeStatuses &&
  left.queuedProductIds === right.queuedProductIds &&
  left.productAiRunStatusByProductId === right.productAiRunStatusByProductId;

const createProductListRowRuntimeStore = (
  initialState: ProductListRowRuntimeStoreState
): ProductListRowRuntimeStore => {
  let state = initialState;
  const listeners = new Set<() => void>();
  const snapshotCache = new Map<string, ProductListRowRuntimeContextType>();

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: (
      productId: string,
      baseProductId: string | null | undefined
    ): ProductListRowRuntimeContextType => {
      if (!productId) return EMPTY_PRODUCT_LIST_ROW_RUNTIME_SNAPSHOT;

      const normalizedBaseProductId =
        typeof baseProductId === 'string' && baseProductId.trim().length > 0
          ? baseProductId.trim()
          : '';
      const cacheKey = `${productId}::${normalizedBaseProductId}`;

      const nextSnapshot: ProductListRowRuntimeContextType = {
        showMarketplaceBadge:
          state.integrationBadgeIds.has(productId) || normalizedBaseProductId.length > 0,
        integrationStatus:
          state.integrationBadgeStatuses.get(productId) ??
          (normalizedBaseProductId.length > 0 ? 'active' : 'not_started'),
        showTraderaBadge: state.traderaBadgeIds.has(productId),
        traderaStatus: state.traderaBadgeStatuses.get(productId) ?? 'not_started',
        productAiRunFeedback: resolveProductAiRunFeedbackForList({
          productId,
          queuedProductIds: state.queuedProductIds,
          productAiRunStatusByProductId: state.productAiRunStatusByProductId,
        }),
      };

      const cachedSnapshot = snapshotCache.get(cacheKey);
      if (cachedSnapshot && areProductListRowRuntimeSnapshotsEqual(cachedSnapshot, nextSnapshot)) {
        return cachedSnapshot;
      }

      snapshotCache.set(cacheKey, nextSnapshot);
      return nextSnapshot;
    },
    setState: (nextState: ProductListRowRuntimeStoreState) => {
      if (areProductListRowRuntimeStoreStatesEqual(state, nextState)) return;
      state = nextState;
      listeners.forEach((listener: () => void) => listener());
    },
  };
};

export const useProductListFiltersContext = (): ProductListFiltersContextType => {
  const context = useContext(ProductListFiltersContext);
  if (!context) {
    throw internalError('useProductListFiltersContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListSelectionContext = (): ProductListSelectionContextType => {
  const context = useContext(ProductListSelectionContext);
  if (!context) {
    throw internalError('useProductListSelectionContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListTableContext = (): ProductListTableContextType => {
  const context = useContext(ProductListTableContext);
  if (!context) {
    throw internalError('useProductListTableContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListAlertsContext = (): ProductListAlertsContextType => {
  const context = useContext(ProductListAlertsContext);
  if (!context) {
    throw internalError('useProductListAlertsContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListActionsContext = (): ProductListActionsContextType => {
  const context = useContext(ProductListActionsContext);
  if (!context) {
    throw internalError('useProductListActionsContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListHeaderActionsContext = (): ProductListHeaderActionsContextType => {
  const context = useContext(ProductListHeaderActionsContext);
  if (!context) {
    throw internalError(
      'useProductListHeaderActionsContext must be used within a ProductListProvider'
    );
  }
  return context;
};

export const useProductListRowActionsContext = (): ProductListRowActionsContextType => {
  const context = useContext(ProductListRowActionsContext);
  if (!context) {
    throw internalError(
      'useProductListRowActionsContext must be used within a ProductListProvider'
    );
  }
  return context;
};

export const useProductListRowVisualsContext = (): ProductListRowVisualsContextType => {
  const context = useContext(ProductListRowVisualsContext);
  if (!context) {
    throw internalError(
      'useProductListRowVisualsContext must be used within a ProductListProvider'
    );
  }
  return context;
};

export const useProductListRowRuntime = (
  productId: string,
  baseProductId: string | null | undefined
): ProductListRowRuntimeContextType => {
  const store = useContext(ProductListRowRuntimeStoreContext);
  if (!store) {
    throw internalError('useProductListRowRuntime must be used within a ProductListProvider');
  }

  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot(productId, baseProductId),
    () => store.getSnapshot(productId, baseProductId)
  );
};

export const useProductListModalsContext = (): ProductListModalsContextType => {
  const context = useContext(ProductListModalsContext);
  if (!context) {
    throw internalError('useProductListModalsContext must be used within a ProductListProvider');
  }
  return context;
};

export function ProductListProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ProductListContextType;
}) {
  const rowRuntimeStoreRef = useRef<ProductListRowRuntimeStore | null>(null);
  if (!rowRuntimeStoreRef.current) {
    rowRuntimeStoreRef.current = createProductListRowRuntimeStore({
      integrationBadgeIds: value.integrationBadgeIds,
      integrationBadgeStatuses: value.integrationBadgeStatuses,
      traderaBadgeIds: value.traderaBadgeIds,
      traderaBadgeStatuses: value.traderaBadgeStatuses,
      queuedProductIds: value.queuedProductIds,
      productAiRunStatusByProductId: value.productAiRunStatusByProductId,
    });
  }
  const rowRuntimeStore = rowRuntimeStoreRef.current;

  useEffect(() => {
    rowRuntimeStore.setState({
      integrationBadgeIds: value.integrationBadgeIds,
      integrationBadgeStatuses: value.integrationBadgeStatuses,
      traderaBadgeIds: value.traderaBadgeIds,
      traderaBadgeStatuses: value.traderaBadgeStatuses,
      queuedProductIds: value.queuedProductIds,
      productAiRunStatusByProductId: value.productAiRunStatusByProductId,
    });
  }, [
    rowRuntimeStore,
    value.integrationBadgeIds,
    value.integrationBadgeStatuses,
    value.traderaBadgeIds,
    value.traderaBadgeStatuses,
    value.queuedProductIds,
    value.productAiRunStatusByProductId,
  ]);

  const filtersValue = useMemo<ProductListFiltersContextType>(
    () => ({
      page: value.page,
      totalPages: value.totalPages,
      setPage: value.setPage,
      pageSize: value.pageSize,
      setPageSize: value.setPageSize,
      nameLocale: value.nameLocale,
      setNameLocale: value.setNameLocale,
      languageOptions: value.languageOptions,
      currencyCode: value.currencyCode,
      setCurrencyCode: value.setCurrencyCode,
      currencyOptions: value.currencyOptions,
      filtersCollapsedByDefault: value.filtersCollapsedByDefault,
      catalogFilter: value.catalogFilter,
      setCatalogFilter: value.setCatalogFilter,
      catalogs: value.catalogs,
      search: value.search,
      setSearch: value.setSearch,
      productId: value.productId,
      setProductId: value.setProductId,
      idMatchMode: value.idMatchMode,
      setIdMatchMode: value.setIdMatchMode,
      sku: value.sku,
      setSku: value.setSku,
      description: value.description,
      setDescription: value.setDescription,
      categoryId: value.categoryId,
      setCategoryId: value.setCategoryId,
      minPrice: value.minPrice,
      setMinPrice: value.setMinPrice,
      maxPrice: value.maxPrice,
      setMaxPrice: value.setMaxPrice,
      stockValue: value.stockValue,
      setStockValue: value.setStockValue,
      stockOperator: value.stockOperator,
      setStockOperator: value.setStockOperator,
      startDate: value.startDate,
      setStartDate: value.setStartDate,
      endDate: value.endDate,
      setEndDate: value.setEndDate,
      advancedFilter: value.advancedFilter,
      activeAdvancedFilterPresetId: value.activeAdvancedFilterPresetId,
      setAdvancedFilter: value.setAdvancedFilter,
      setAdvancedFilterState: value.setAdvancedFilterState,
      baseExported: value.baseExported,
      setBaseExported: value.setBaseExported,
    }),
    [
      value.page,
      value.totalPages,
      value.setPage,
      value.pageSize,
      value.setPageSize,
      value.nameLocale,
      value.setNameLocale,
      value.languageOptions,
      value.currencyCode,
      value.setCurrencyCode,
      value.currencyOptions,
      value.filtersCollapsedByDefault,
      value.catalogFilter,
      value.setCatalogFilter,
      value.catalogs,
      value.search,
      value.setSearch,
      value.productId,
      value.setProductId,
      value.idMatchMode,
      value.setIdMatchMode,
      value.sku,
      value.setSku,
      value.description,
      value.setDescription,
      value.categoryId,
      value.setCategoryId,
      value.minPrice,
      value.setMinPrice,
      value.maxPrice,
      value.setMaxPrice,
      value.stockValue,
      value.setStockValue,
      value.stockOperator,
      value.setStockOperator,
      value.startDate,
      value.setStartDate,
      value.endDate,
      value.setEndDate,
      value.advancedFilter,
      value.activeAdvancedFilterPresetId,
      value.setAdvancedFilter,
      value.setAdvancedFilterState,
      value.baseExported,
      value.setBaseExported,
    ]
  );

  const selectionValue = useMemo<ProductListSelectionContextType>(
    () => ({
      data: value.data,
      rowSelection: value.rowSelection,
      setRowSelection: value.setRowSelection,
      onSelectAllGlobal: value.onSelectAllGlobal,
      loadingGlobal: value.loadingGlobal,
      onDeleteSelected: value.onDeleteSelected,
      onAddToMarketplace: value.onAddToMarketplace,
    }),
    [
      value.data,
      value.rowSelection,
      value.setRowSelection,
      value.onSelectAllGlobal,
      value.loadingGlobal,
      value.onDeleteSelected,
      value.onAddToMarketplace,
    ]
  );

  const tableValue = useMemo<ProductListTableContextType>(
    () => ({
      data: value.data,
      rowSelection: value.rowSelection,
      setRowSelection: value.setRowSelection,
      handleProductsTableRender: value.handleProductsTableRender,
      tableColumns: value.tableColumns,
      getRowClassName: value.getRowClassName,
      getRowId: value.getRowId,
      isLoading: value.isLoading,
      skeletonRows: value.skeletonRows,
      maxHeight: value.maxHeight,
      stickyHeader: value.stickyHeader,
    }),
    [
      value.data,
      value.rowSelection,
      value.setRowSelection,
      value.handleProductsTableRender,
      value.tableColumns,
      value.getRowClassName,
      value.getRowId,
      value.isLoading,
      value.skeletonRows,
      value.maxHeight,
      value.stickyHeader,
    ]
  );

  const alertsValue = useMemo<ProductListAlertsContextType>(
    () => ({
      loadError: value.loadError,
      actionError: value.actionError,
      onDismissActionError: value.onDismissActionError,
    }),
    [value.loadError, value.actionError, value.onDismissActionError]
  );

  const actionsValue = useMemo<ProductListActionsContextType>(
    () => ({
      onCreateProduct: value.onCreateProduct,
      onCreateFromDraft: value.onCreateFromDraft,
      activeDrafts: value.activeDrafts,
      setRefreshTrigger: value.setRefreshTrigger,
      productNameKey: value.productNameKey,
      priceGroups: value.priceGroups,
      currencyCode: value.currencyCode,
      onPrefetchProductDetail: value.onPrefetchProductDetail,
      onProductNameClick: value.onProductNameClick,
      onProductEditClick: value.onProductEditClick,
      onProductDeleteClick: value.onProductDeleteClick,
      onDuplicateProduct: value.onDuplicateProduct,
      onIntegrationsClick: value.onIntegrationsClick,
      onExportSettingsClick: value.onExportSettingsClick,
      categoryNameById: value.categoryNameById,
      thumbnailSource: value.thumbnailSource,
      imageExternalBaseUrl: value.imageExternalBaseUrl,
    }),
    [
      value.onCreateProduct,
      value.onCreateFromDraft,
      value.activeDrafts,
      value.setRefreshTrigger,
      value.productNameKey,
      value.priceGroups,
      value.currencyCode,
      value.onPrefetchProductDetail,
      value.onProductNameClick,
      value.onProductEditClick,
      value.onProductDeleteClick,
      value.onDuplicateProduct,
      value.onIntegrationsClick,
      value.onExportSettingsClick,
      value.categoryNameById,
      value.thumbnailSource,
      value.imageExternalBaseUrl,
    ]
  );

  const headerActionsValue = useMemo<ProductListHeaderActionsContextType>(
    () => ({
      onCreateProduct: value.onCreateProduct,
      onCreateFromDraft: value.onCreateFromDraft,
      activeDrafts: value.activeDrafts,
      showTriggerRunFeedback: value.showTriggerRunFeedback,
      setShowTriggerRunFeedback: value.setShowTriggerRunFeedback,
    }),
    [
      value.onCreateProduct,
      value.onCreateFromDraft,
      value.activeDrafts,
      value.showTriggerRunFeedback,
      value.setShowTriggerRunFeedback,
    ]
  );

  const rowActionsValue = useMemo<ProductListRowActionsContextType>(
    () => ({
      onPrefetchProductDetail: value.onPrefetchProductDetail,
      onProductNameClick: value.onProductNameClick,
      onProductEditClick: value.onProductEditClick,
      onProductDeleteClick: value.onProductDeleteClick,
      onDuplicateProduct: value.onDuplicateProduct,
      onIntegrationsClick: value.onIntegrationsClick,
      onExportSettingsClick: value.onExportSettingsClick,
    }),
    [
      value.onPrefetchProductDetail,
      value.onProductNameClick,
      value.onProductEditClick,
      value.onProductDeleteClick,
      value.onDuplicateProduct,
      value.onIntegrationsClick,
      value.onExportSettingsClick,
    ]
  );

  const rowVisualsValue = useMemo<ProductListRowVisualsContextType>(
    () => ({
      productNameKey: value.productNameKey,
      priceGroups: value.priceGroups,
      currencyCode: value.currencyCode,
      categoryNameById: value.categoryNameById,
      thumbnailSource: value.thumbnailSource,
      showTriggerRunFeedback: value.showTriggerRunFeedback,
      imageExternalBaseUrl: value.imageExternalBaseUrl,
    }),
    [
      value.productNameKey,
      value.priceGroups,
      value.currencyCode,
      value.categoryNameById,
      value.thumbnailSource,
      value.showTriggerRunFeedback,
      value.imageExternalBaseUrl,
    ]
  );

  const modalsValue = useMemo<ProductListModalsContextType>(
    () => ({
      isCreateOpen: value.isCreateOpen,
      isPromptOpen: value.isPromptOpen,
      setIsPromptOpen: value.setIsPromptOpen,
      handleConfirmSku: value.handleConfirmSku,
      initialSku: value.initialSku,
      createDraft: value.createDraft,
      initialCatalogId: value.initialCatalogId,
      onCloseCreate: value.onCloseCreate,
      onCreateSuccess: value.onCreateSuccess,
      editingProduct: value.editingProduct,
      isEditHydrating: value.isEditHydrating,
      onCloseEdit: value.onCloseEdit,
      onEditSuccess: value.onEditSuccess,
      onEditSave: value.onEditSave,
      integrationsProduct: value.integrationsProduct,
      onCloseIntegrations: value.onCloseIntegrations,
      onStartListing: value.onStartListing,
      showListProductModal: value.showListProductModal,
      onCloseListProduct: value.onCloseListProduct,
      onListProductSuccess: value.onListProductSuccess,
      listProductPreset: value.listProductPreset,
      exportSettingsProduct: value.exportSettingsProduct,
      onCloseExportSettings: value.onCloseExportSettings,
      onListingsUpdated: value.onListingsUpdated,
      massListIntegration: value.massListIntegration,
      massListProductIds: value.massListProductIds,
      onCloseMassList: value.onCloseMassList,
      onMassListSuccess: value.onMassListSuccess,
      showIntegrationModal: value.showIntegrationModal,
      onCloseIntegrationModal: value.onCloseIntegrationModal,
      onSelectIntegrationFromModal: value.onSelectIntegrationFromModal,
    }),
    [
      value.isCreateOpen,
      value.isPromptOpen,
      value.setIsPromptOpen,
      value.handleConfirmSku,
      value.initialSku,
      value.createDraft,
      value.initialCatalogId,
      value.onCloseCreate,
      value.onCreateSuccess,
      value.editingProduct,
      value.isEditHydrating,
      value.onCloseEdit,
      value.onEditSuccess,
      value.onEditSave,
      value.integrationsProduct,
      value.onCloseIntegrations,
      value.onStartListing,
      value.showListProductModal,
      value.onCloseListProduct,
      value.onListProductSuccess,
      value.listProductPreset,
      value.exportSettingsProduct,
      value.onCloseExportSettings,
      value.onListingsUpdated,
      value.massListIntegration,
      value.massListProductIds,
      value.onCloseMassList,
      value.onMassListSuccess,
      value.showIntegrationModal,
      value.onCloseIntegrationModal,
      value.onSelectIntegrationFromModal,
    ]
  );

  return (
    <ProductListFiltersContext.Provider value={filtersValue}>
      <ProductListSelectionContext.Provider value={selectionValue}>
        <ProductListAlertsContext.Provider value={alertsValue}>
          <ProductListTableContext.Provider value={tableValue}>
            <ProductListActionsContext.Provider value={actionsValue}>
              <ProductListHeaderActionsContext.Provider value={headerActionsValue}>
                <ProductListRowActionsContext.Provider value={rowActionsValue}>
                  <ProductListRowRuntimeStoreContext.Provider value={rowRuntimeStore}>
                    <ProductListRowVisualsContext.Provider value={rowVisualsValue}>
                      <ProductListModalsContext.Provider value={modalsValue}>
                        {children}
                      </ProductListModalsContext.Provider>
                    </ProductListRowVisualsContext.Provider>
                  </ProductListRowRuntimeStoreContext.Provider>
                </ProductListRowActionsContext.Provider>
              </ProductListHeaderActionsContext.Provider>
            </ProductListActionsContext.Provider>
          </ProductListTableContext.Provider>
        </ProductListAlertsContext.Provider>
      </ProductListSelectionContext.Provider>
    </ProductListFiltersContext.Provider>
  );
}
