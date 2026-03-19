'use client';
import dynamic from 'next/dynamic';
import { Profiler, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useProductListAlertsContext,
  useProductListModalsContext,
  useProductListTableContext,
} from '@/features/products/context/ProductListContext';
import { useProductsTableProps } from '@/features/products/hooks/useProductsTableProps';
import type { ProductWithImages } from '@/shared/contracts/products';
import { Alert, Button, DataTable, EmptyState, StandardDataTablePanel } from '@/shared/ui';

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

const ProductListMobileCards = dynamic(
  () =>
    import('@/features/products/components/list/ProductListMobileCards').then(
      (mod: typeof import('@/features/products/components/list/ProductListMobileCards')) =>
        mod.ProductListMobileCards
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

const PRODUCT_LIST_BOTTOM_GAP = 24;

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
  const desktopTableRef = useRef<HTMLDivElement>(null);
  const [resolvedTableMaxHeight, setResolvedTableMaxHeight] = useState<
    number | string | undefined
  >(tableProps.maxHeight);
  const actionsContent = useMemo(() => <ProductSelectionActions />, []);
  const alertsContent = useMemo(() => <ProductListAlerts />, []);

  const updateTableMaxHeight = useCallback(() => {
    const mainElement = document.getElementById('app-content');
    const tableElement = desktopTableRef.current;
    if (!mainElement || !tableElement) return;

    const availableHeight = Math.floor(
      mainElement.getBoundingClientRect().bottom -
        tableElement.getBoundingClientRect().top -
        PRODUCT_LIST_BOTTOM_GAP
    );
    const nextMaxHeight = Math.max(0, availableHeight);
    setResolvedTableMaxHeight((currentValue) =>
      currentValue === nextMaxHeight ? currentValue : nextMaxHeight
    );
  }, []);

  useEffect(() => {
    const mainElement = document.getElementById('app-content');
    if (!mainElement || typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(() => {
      updateTableMaxHeight();
    });
    resizeObserver.observe(mainElement);
    if (desktopTableRef.current) {
      resizeObserver.observe(desktopTableRef.current);
    }

    window.addEventListener('resize', updateTableMaxHeight);
    updateTableMaxHeight();

    return (): void => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateTableMaxHeight);
    };
  }, [updateTableMaxHeight]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      updateTableMaxHeight();
    });

    return (): void => {
      window.cancelAnimationFrame(frameId);
    };
  });

  const headerContent = useMemo(() => {
    return <ProductListHeader filtersContent={<ProductFilters />} />;
  }, []);
  const isEmpty = !tableProps.isLoading && tableProps.data.length === 0;

  return (
    <Profiler id='ProductsTable' onRender={handleProductsTableRender}>
      <StandardDataTablePanel
        variant='flat'
        className='[&>div:first-child]:mb-3'
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
        stickyHeader={tableProps.stickyHeader}
        enableVirtualization={false}
      >
        <div className='space-y-4'>
          <div className='lg:hidden'>
            {isEmpty ? (
              <EmptyState
                title='No results'
                description="Try adjusting your filters to find what you're looking for."
                className='border-none p-0'
              />
            ) : (
              <ProductListMobileCards />
            )}
          </div>
          <div ref={desktopTableRef} className='hidden lg:block'>
            <DataTable
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
              maxHeight={resolvedTableMaxHeight}
              stickyHeader={tableProps.stickyHeader}
              enableVirtualization={false}
              tableLayout='fixed'
            />
          </div>
        </div>
      </StandardDataTablePanel>
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
