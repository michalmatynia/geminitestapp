import { useMemo } from 'react';

import type {
  ProductListActionsContextType,
  ProductListAlertsContextType,
  ProductListHeaderActionsContextType,
  ProductListRowActionsContextType,
  ProductListRowVisualsContextType,
  ProductListSelectionContextType,
  ProductListTableContextType,
} from '../ProductListContext.types';
import type { ProductListSubContextsInput } from './useProductListSubContexts.types';

export const useProductListSelectionValue = (
  value: ProductListSubContextsInput
): ProductListSelectionContextType =>
  useMemo(
    () => ({
      data: value.data,
      rowSelection: value.rowSelection,
      setRowSelection: value.setRowSelection,
      onSelectAllGlobal: value.onSelectAllGlobal,
      loadingGlobal: value.loadingGlobal,
      onDeleteSelected: value.onDeleteSelected,
      onAddToMarketplace: value.onAddToMarketplace,
    }),
    [value.data, value.rowSelection, value.setRowSelection, value.onSelectAllGlobal, value.loadingGlobal, value.onDeleteSelected, value.onAddToMarketplace]
  );

export const useProductListTableValue = (
  value: ProductListSubContextsInput
): ProductListTableContextType =>
  useMemo(
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
    [value.data, value.rowSelection, value.setRowSelection, value.handleProductsTableRender, value.tableColumns, value.getRowClassName, value.getRowId, value.isLoading, value.skeletonRows, value.maxHeight, value.stickyHeader]
  );

export const useProductListAlertsValue = (
  value: ProductListSubContextsInput
): ProductListAlertsContextType =>
  useMemo(
    () => ({
      loadError: value.loadError,
      actionError: value.actionError,
      onDismissActionError: value.onDismissActionError,
    }),
    [value.loadError, value.actionError, value.onDismissActionError]
  );

export const useProductListActionsValue = (
  value: ProductListSubContextsInput
): ProductListActionsContextType =>
  useMemo(
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
    [value.onCreateProduct, value.onCreateFromDraft, value.activeDrafts, value.setRefreshTrigger, value.productNameKey, value.priceGroups, value.currencyCode, value.onPrefetchProductDetail, value.onProductNameClick, value.onProductEditClick, value.onProductDeleteClick, value.onDuplicateProduct, value.onIntegrationsClick, value.onExportSettingsClick, value.categoryNameById, value.thumbnailSource, value.imageExternalBaseUrl]
  );

export const useProductListHeaderActionsValue = (
  value: ProductListSubContextsInput
): ProductListHeaderActionsContextType =>
  useMemo(
    () => ({
      onCreateProduct: value.onCreateProduct,
      onCreateFromDraft: value.onCreateFromDraft,
      activeDrafts: value.activeDrafts,
      showTriggerRunFeedback: value.showTriggerRunFeedback,
      setShowTriggerRunFeedback: value.setShowTriggerRunFeedback,
      triggerButtonsReady: value.rowRuntimeReady ?? true,
    }),
    [value.onCreateProduct, value.onCreateFromDraft, value.activeDrafts, value.showTriggerRunFeedback, value.setShowTriggerRunFeedback, value.rowRuntimeReady]
  );

export const useProductListRowActionsValue = (
  value: ProductListSubContextsInput
): ProductListRowActionsContextType =>
  useMemo(
    () => ({
      onPrefetchProductDetail: value.onPrefetchProductDetail,
      onProductNameClick: value.onProductNameClick,
      onProductEditClick: value.onProductEditClick,
      onProductDeleteClick: value.onProductDeleteClick,
      onDuplicateProduct: value.onDuplicateProduct,
      onIntegrationsClick: value.onIntegrationsClick,
      onExportSettingsClick: value.onExportSettingsClick,
    }),
    [value.onPrefetchProductDetail, value.onProductNameClick, value.onProductEditClick, value.onProductDeleteClick, value.onDuplicateProduct, value.onIntegrationsClick, value.onExportSettingsClick]
  );

export const useProductListRowVisualsValue = (
  value: ProductListSubContextsInput
): ProductListRowVisualsContextType =>
  useMemo(
    () => ({
      productNameKey: value.productNameKey,
      priceGroups: value.priceGroups,
      currencyCode: value.currencyCode,
      categoryNameById: value.categoryNameById,
      thumbnailSource: value.thumbnailSource,
      showTriggerRunFeedback: value.showTriggerRunFeedback,
      triggerButtonsReady: value.rowRuntimeReady ?? true,
      imageExternalBaseUrl: value.imageExternalBaseUrl,
    }),
    [value.productNameKey, value.priceGroups, value.currencyCode, value.categoryNameById, value.thumbnailSource, value.showTriggerRunFeedback, value.rowRuntimeReady, value.imageExternalBaseUrl]
  );
