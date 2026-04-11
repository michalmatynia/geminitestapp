'use client';

import dynamic from 'next/dynamic';
import { Profiler, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ProductFilters } from '@/features/products/components/list/ProductFilters';
import { ProductListHeader } from '@/features/products/components/list/ProductListHeader';
import {
  useProductListAlertsContext,
  useProductListTableContext,
} from '@/features/products/context/ProductListContext';
import { useProductsTableProps } from '@/features/products/hooks/useProductsTableProps';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { EmptyState } from '@/shared/ui/empty-state';
import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { Row } from '@tanstack/react-table';

const PRODUCT_LIST_BOTTOM_GAP = 24;

const ProductSelectionActions = dynamic(
  () =>
    import('@/features/products/components/list/ProductSelectionActions').then(
      (mod: typeof import('@/features/products/components/list/ProductSelectionActions')) =>
        mod.ProductSelectionActions
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

const ProductListMobileCards = dynamic(
  () =>
    import('@/features/products/components/list/ProductListMobileCards').then(
      (mod: typeof import('@/features/products/components/list/ProductListMobileCards')) =>
        mod.ProductListMobileCards
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

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
                className='h-auto bg-transparent p-0 text-red-200 hover:bg-transparent hover:text-white'
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

export const ProductListTableSurface = memo(function ProductListTableSurface() {
  const { handleProductsTableRender } = useProductListTableContext();
  const tableProps = useProductsTableProps();
  const desktopTableRef = useRef<HTMLDivElement>(null);
  const [resolvedTableMaxHeight, setResolvedTableMaxHeight] = useState<
    number | string | undefined
  >(tableProps.maxHeight);
  const actionsContent = useMemo(() => <ProductSelectionActions />, []);
  const alertsContent = useMemo(() => <ProductListAlerts />, []);
  const headerFiltersContent = useMemo(() => <ProductFilters instanceId='header' />, []);

  const updateTableMaxHeight = useCallback(() => {
    try {
      const mainElement = document.getElementById('app-content');
      const tableElement = desktopTableRef.current;
      if (!mainElement || !tableElement) return;

      const mainRect = mainElement.getBoundingClientRect();
      const tableRect = tableElement.getBoundingClientRect();
      
      const availableHeight = Math.floor(
        mainRect.bottom - tableRect.top - PRODUCT_LIST_BOTTOM_GAP
      );
      const nextMaxHeight = Math.max(0, availableHeight);
      
      setResolvedTableMaxHeight((currentValue) => {
        if (currentValue === nextMaxHeight) return currentValue;
        return nextMaxHeight;
      });
    } catch (error) {
      logClientCatch(error, {
        source: 'ProductListTableSurface',
        action: 'updateTableMaxHeight',
        level: 'warn',
      });
    }
  }, []);

  useEffect(() => {
    const mainElement = document.getElementById('app-content');
    if (!mainElement || typeof ResizeObserver === 'undefined') return;

    let throttleTimer: number | null = null;
    const throttledUpdate = () => {
      if (throttleTimer) return;
      throttleTimer = window.setTimeout(() => {
        updateTableMaxHeight();
        throttleTimer = null;
      }, 100);
    };

    const resizeObserver = new ResizeObserver(throttledUpdate);
    resizeObserver.observe(mainElement);
    if (desktopTableRef.current) {
      resizeObserver.observe(desktopTableRef.current);
    }

    window.addEventListener('resize', throttledUpdate);
    updateTableMaxHeight();

    return (): void => {
      if (throttleTimer) window.clearTimeout(throttleTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', throttledUpdate);
    };
  }, [updateTableMaxHeight]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(updateTableMaxHeight);
    return (): void => {
      window.cancelAnimationFrame(frameId);
    };
  }, [updateTableMaxHeight]);

  const headerContent = useMemo(() => {
    return <ProductListHeader filtersContent={headerFiltersContent} />;
  }, [headerFiltersContent]);
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
        enableVirtualization={true}
        maxHeight={resolvedTableMaxHeight}
        showTable={false}
      >
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
            enableVirtualization={true}
            tableLayout='fixed'
          />
        </div>
      </StandardDataTablePanel>
    </Profiler>
  );
});
