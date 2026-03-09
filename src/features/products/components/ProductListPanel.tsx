'use client';
import dynamic from 'next/dynamic';
import { Profiler, memo, useMemo } from 'react';

import {
  useProductListAlertsContext,
  useProductListModalsContext,
  useProductListTableContext,
} from '@/features/products/context/ProductListContext';
import { useProductsTableProps } from '@/features/products/hooks/useProductsTableProps';
import type { ProductWithImages } from '@/shared/contracts/products';
import { Alert, Button, StandardDataTablePanel } from '@/shared/ui';

import type { Row } from '@tanstack/react-table';

const ProductListHeader = dynamic(
  () =>
    import('@/features/products/components/list/ProductListHeader').then(
      (mod: typeof import('@/features/products/components/list/ProductListHeader')) =>
        mod.ProductListHeader
    ),
  { ssr: false }
);

const ProductFilters = dynamic(
  () =>
    import('@/features/products/components/list/ProductFilters').then(
      (mod: typeof import('@/features/products/components/list/ProductFilters')) =>
        mod.ProductFilters
    ),
  { ssr: false }
);

const ProductSelectionActions = dynamic(
  () =>
    import('@/features/products/components/list/ProductFilters').then(
      (mod: typeof import('@/features/products/components/list/ProductFilters')) =>
        mod.ProductSelectionActions
    ),
  { ssr: false }
);

const PromptModal = dynamic(
  () =>
    import('@/shared/ui/templates/modals').then(
      (mod: typeof import('@/shared/ui/templates/modals')) => mod.PromptModal
    ),
  { ssr: false }
);

const ProductCreatePromptModal = memo(function ProductCreatePromptModal() {
  const { isPromptOpen, setIsPromptOpen, handleConfirmSku } = useProductListModalsContext();
  if (!isPromptOpen) return null;

  return (
    <PromptModal
      open={isPromptOpen}
      onClose={() => setIsPromptOpen(false)}
      onConfirm={handleConfirmSku}
      title='Create New Product'
      label='Enter a new unique SKU'
      placeholder='e.g. ABC-123'
      required
    />
  );
});

const ProductListAlerts = memo(function ProductListAlerts() {
  const { loadError, actionError, onDismissActionError } = useProductListAlertsContext();

  const alerts = useMemo(() => {
    if (!loadError && !actionError) return null;
    return (
      <div className='flex flex-col gap-2'>
        {loadError && <Alert variant='error'>{loadError}</Alert>}
        {actionError && (
          <Alert variant='error'>
            <div className='flex items-center justify-between'>
              <span>{actionError}</span>
              <Button
                variant='ghost'
                onClick={onDismissActionError}
                className='h-auto p-0 text-red-200 hover:text-white bg-transparent hover:bg-transparent'
              >
                Dismiss
              </Button>
            </div>
          </Alert>
        )}
      </div>
    );
  }, [actionError, loadError, onDismissActionError]);

  return alerts;
});

const ProductListTableSurface = memo(function ProductListTableSurface() {
  const { handleProductsTableRender } = useProductListTableContext();
  const tableProps = useProductsTableProps();
  const headerContent = useMemo(
    () => <ProductListHeader filtersContent={<ProductFilters />} />,
    []
  );
  const actionsContent = useMemo(() => <ProductSelectionActions />, []);
  const alertsContent = useMemo(() => <ProductListAlerts />, []);

  return (
    <Profiler id='ProductsTable' onRender={handleProductsTableRender}>
      <StandardDataTablePanel
        header={headerContent}
        alerts={alertsContent}
        actions={actionsContent}
        columns={tableProps.columns}
        data={tableProps.data}
        isLoading={tableProps.isLoading}
        getRowId={tableProps.getRowId}
        getRowClassName={
          tableProps.getRowClassName as (row: Row<ProductWithImages>) => string | undefined
        }
        rowSelection={tableProps.rowSelection}
        onRowSelectionChange={tableProps.onRowSelectionChange}
        skeletonRows={tableProps.skeletonRows}
        maxHeight={tableProps.maxHeight}
        stickyHeader={tableProps.stickyHeader}
        enableVirtualization={true}
      />
    </Profiler>
  );
});

export const ProductListPanel = memo(function ProductListPanel() {
  return (
    <>
      <ProductListTableSurface />
      <ProductCreatePromptModal />
    </>
  );
});
