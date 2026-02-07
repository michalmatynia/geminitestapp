'use client';
import dynamic from 'next/dynamic';
import { Profiler, memo, useMemo } from 'react';

import { useProductListContext } from '@/features/products/context/ProductListContext';
import { useQueuedProductIds } from '@/features/products/state/queued-product-ops';
import { DataTable, Button, ListPanel, Alert } from '@/shared/ui';

const ProductListHeader = dynamic(
  () =>
    import('@/features/products/components/list/ProductListHeader').then(
      (mod: typeof import('@/features/products/components/list/ProductListHeader')) => mod.ProductListHeader
    ),
  { ssr: false }
);

const ProductFilters = dynamic(
  () =>
    import('@/features/products/components/list/ProductFilters').then(
      (mod: typeof import('@/features/products/components/list/ProductFilters')) => mod.ProductFilters
    ),
  { ssr: false }
);

const ProductSelectionActions = dynamic(
  () =>
    import('@/features/products/components/list/ProductFilters').then(
      (mod: typeof import('@/features/products/components/list/ProductFilters')) => mod.ProductSelectionActions
    ),
  { ssr: false }
);

export const ProductListPanel = memo(function ProductListPanel() {
  const {
    loadError,
    actionError,
    onDismissActionError,
    data,
    rowSelection,
    setRowSelection,
    handleProductsTableRender,
    tableColumns,
    setRefreshTrigger,
    productNameKey,
    currencyCode,
    priceGroups,
    onProductNameClick,
    onProductEditClick,
    onProductDeleteClick,
    onIntegrationsClick,
    onExportSettingsClick,
    integrationBadgeIds,
    integrationBadgeStatuses,
    getRowId,
    isLoading,
    skeletonRows,
  } = useProductListContext();

  const queuedProductIds = useQueuedProductIds();

  const tableProps = useMemo(
    () => ({
      columns: tableColumns,
      data,
      getRowId,
      rowSelection,
      onRowSelectionChange: setRowSelection,
      isLoading,
      skeletonRows,
      meta: {
        setRefreshTrigger,
        productNameKey,
        currencyCode,
        priceGroups,
        onProductNameClick,
        onProductEditClick,
        onProductDeleteClick,
        onIntegrationsClick,
        onExportSettingsClick,
        integrationBadgeIds,
        integrationBadgeStatuses,
        queuedProductIds,
      },
    }),
    [
      tableColumns,
      data,
      getRowId,
      rowSelection,
      setRowSelection,
      isLoading,
      skeletonRows,
      setRefreshTrigger,
      productNameKey,
      currencyCode,
      priceGroups,
      onProductNameClick,
      onProductEditClick,
      onProductDeleteClick,
      onIntegrationsClick,
      onExportSettingsClick,
      integrationBadgeIds,
      integrationBadgeStatuses,
      queuedProductIds,
    ]
  );

  const alerts = useMemo(() => {
    if (!loadError && !actionError) return null;
    return (
      <div className="flex flex-col gap-2">
        {loadError && (
          <Alert variant="error">
            {loadError}
          </Alert>
        )}
        {actionError && (
          <Alert variant="error">
            <div className="flex items-center justify-between">
              <span>{actionError}</span>
              <Button
                variant="ghost"
                onClick={onDismissActionError}
                className="h-auto p-0 text-red-200 hover:text-white bg-transparent hover:bg-transparent"
              >
                Dismiss
              </Button>
            </div>
          </Alert>
        )}
      </div>
    );
  }, [actionError, loadError, onDismissActionError]);

  return (
    <ListPanel
      header={<ProductListHeader />}
      alerts={alerts}
      filters={<ProductFilters />}
      actions={
        <ProductSelectionActions />
      }
    >
      <Profiler id="ProductsTable" onRender={handleProductsTableRender}>
        <DataTable {...tableProps} />
      </Profiler>
    </ListPanel>
  );
});
