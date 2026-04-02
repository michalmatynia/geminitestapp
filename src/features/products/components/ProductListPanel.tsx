'use client';

import { Profiler, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ProductFilters,
  ProductSelectionActions,
} from '@/features/products/components/list/ProductFilters';
import { ProductListHeader } from '@/features/products/components/list/ProductListHeader';
import { ProductListMobileCards } from '@/features/products/components/list/ProductListMobileCards';
import {
  useProductListAlertsContext,
  useProductListModalsContext,
  useProductListTableContext,
} from '@/features/products/context/ProductListContext';
import { useProductsTableProps } from '@/features/products/hooks/useProductsTableProps';
import { logProductListDebug } from '@/features/products/lib/product-list-observability';
import type { ProductWithImages } from '@/shared/contracts/products';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { Alert, Button, DataTable, EmptyState, StandardDataTablePanel } from '@/shared/ui';
import { PromptModal } from '@/shared/ui/templates/modals';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { Row } from '@tanstack/react-table';

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
    try {
      const mainElement = document.getElementById('app-content');
      const tableElement = desktopTableRef.current;
      if (!mainElement || !tableElement) return;

      const availableHeight = Math.floor(
        mainElement.getBoundingClientRect().bottom -
          tableElement.getBoundingClientRect().top -
          PRODUCT_LIST_BOTTOM_GAP
      );
      const nextMaxHeight = Math.max(0, availableHeight);
      setResolvedTableMaxHeight((currentValue) => {
        if (currentValue === nextMaxHeight) return currentValue;

        logProductListDebug(
          'table-max-height-change',
          {
            previous: currentValue ?? null,
            next: nextMaxHeight,
            availableHeight,
            dataCount: tableProps.data.length,
            isLoading: tableProps.isLoading,
          },
          {
            dedupeKey: 'table-max-height-change',
            throttleMs: 250,
          }
        );
        return nextMaxHeight;
      });
    } catch (error) {
      logClientCatch(error, {
        source: 'ProductListPanel',
        action: 'updateTableMaxHeight',
        level: 'warn',
      });
    }
  }, [tableProps.data.length, tableProps.isLoading]);

  useEffect(() => {
    const mainElement = document.getElementById('app-content');
    if (!mainElement || typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(() => {
      try {
        updateTableMaxHeight();
      } catch (error) {
        logClientCatch(error, {
          source: 'ProductListPanel',
          action: 'resizeObserverUpdateTableMaxHeight',
          level: 'warn',
        });
      }
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
    logProductListDebug(
      'table-layout-raf-scheduled',
      {
        dataCount: tableProps.data.length,
        isLoading: tableProps.isLoading,
        resolvedTableMaxHeight:
          typeof resolvedTableMaxHeight === 'number' ? resolvedTableMaxHeight : null,
      },
      {
        dedupeKey: 'table-layout-raf-scheduled',
        throttleMs: 500,
      }
    );
    const frameId = window.requestAnimationFrame(() => {
      try {
        updateTableMaxHeight();
      } catch (error) {
        logClientCatch(error, {
          source: 'ProductListPanel',
          action: 'animationFrameUpdateTableMaxHeight',
          level: 'warn',
        });
      }
    });

    return (): void => {
      window.cancelAnimationFrame(frameId);
    };
  }, [updateTableMaxHeight]);

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

export const ProductListPanel = memo(function ProductListPanel() {
  return (
    <AppErrorBoundary source='products.ProductListPanel'>
      <ProductListTableSurface />
      <ProductCreatePromptModal />
    </AppErrorBoundary>
  );
});
