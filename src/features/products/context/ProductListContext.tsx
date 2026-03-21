'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type {
  ProductListActionsContextType,
  ProductListAlertsContextType,
  ProductListContextType,
  ProductListFiltersContextType,
  ProductListHeaderActionsContextType,
  ProductListModalsContextType,
  ProductListRowActionsContextType,
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
const ProductListModalsContext = createContext<ProductListModalsContextType | null>(null);

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
      integrationBadgeIds: value.integrationBadgeIds,
      integrationBadgeStatuses: value.integrationBadgeStatuses,
      traderaBadgeIds: value.traderaBadgeIds,
      traderaBadgeStatuses: value.traderaBadgeStatuses,
      queuedProductIds: value.queuedProductIds,
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
      value.integrationBadgeIds,
      value.integrationBadgeStatuses,
      value.traderaBadgeIds,
      value.traderaBadgeStatuses,
      value.queuedProductIds,
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
      integrationBadgeIds: value.integrationBadgeIds,
      integrationBadgeStatuses: value.integrationBadgeStatuses,
      traderaBadgeIds: value.traderaBadgeIds,
      traderaBadgeStatuses: value.traderaBadgeStatuses,
      queuedProductIds: value.queuedProductIds,
      productAiRunStatusByProductId: value.productAiRunStatusByProductId,
      categoryNameById: value.categoryNameById,
      thumbnailSource: value.thumbnailSource,
      showTriggerRunFeedback: value.showTriggerRunFeedback,
      imageExternalBaseUrl: value.imageExternalBaseUrl,
    }),
    [
      value.productNameKey,
      value.priceGroups,
      value.currencyCode,
      value.integrationBadgeIds,
      value.integrationBadgeStatuses,
      value.traderaBadgeIds,
      value.traderaBadgeStatuses,
      value.queuedProductIds,
      value.productAiRunStatusByProductId,
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
                  <ProductListRowVisualsContext.Provider value={rowVisualsValue}>
                    <ProductListModalsContext.Provider value={modalsValue}>
                      {children}
                    </ProductListModalsContext.Provider>
                  </ProductListRowVisualsContext.Provider>
                </ProductListRowActionsContext.Provider>
              </ProductListHeaderActionsContext.Provider>
            </ProductListActionsContext.Provider>
          </ProductListTableContext.Provider>
        </ProductListAlertsContext.Provider>
      </ProductListSelectionContext.Provider>
    </ProductListFiltersContext.Provider>
  );
}
