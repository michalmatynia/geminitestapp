'use client';
'use no memo';
// ProductListTableSurface: layout wrapper for the products table. Handles
// responsive breakpoints, dynamic max-height calculation, virtualization
// and ties into table context for render profiling.

import dynamic from 'next/dynamic';
import {
  Profiler,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type RefObject,
} from 'react';

import { ProductFilters } from '@/features/products/components/list/ProductFilters';
import { ProductListHeader } from '@/features/products/components/list/ProductListHeader';
import {
  useProductListAlertsContext,
  useProductListTableContext,
} from '@/features/products/context/ProductListContext';
import {
  useProductsTableProps,
  type UseProductsTablePropsReturn,
} from '@/features/products/hooks/useProductsTableProps';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { EmptyState } from '@/shared/ui/empty-state';
import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { Row } from '@tanstack/react-table';

const PRODUCT_LIST_BOTTOM_GAP = 24;

const renderDynamicFallback = (): null => null;

const ProductSelectionActions = dynamic(
  () =>
    import('@/features/products/components/list/ProductSelectionActions').then(
      (mod) => mod.ProductSelectionActions
    ),
  {
    ssr: false,
    loading: renderDynamicFallback,
  }
);

const ProductListMobileCards = dynamic(
  () =>
    import('@/features/products/components/list/ProductListMobileCards').then(
      (mod) => mod.ProductListMobileCards
    ),
  {
    ssr: false,
    loading: renderDynamicFallback,
  }
);

const hasDisplayText = (value: string | null): value is string => value !== null && value !== '';

const resolveAppContentBottom = (): number | null => {
  const appContentBottom = document.getElementById('app-content')?.getBoundingClientRect().bottom;
  if (typeof appContentBottom === 'number' && Number.isFinite(appContentBottom)) {
    return appContentBottom;
  }
  return null;
};

const calculateTableMaxHeight = (tableElement: HTMLDivElement): number => {
  const tableRect = tableElement.getBoundingClientRect();
  const appContentBottom = resolveAppContentBottom();
  const layoutBottom =
    appContentBottom === null ? window.innerHeight : Math.min(window.innerHeight, appContentBottom);
  const availableHeight = Math.floor(layoutBottom - tableRect.top - PRODUCT_LIST_BOTTOM_GAP);
  return Math.max(0, availableHeight);
};

const shouldPreserveTableMaxHeight = (
  currentValue: number | string | undefined,
  nextMaxHeight: number
): boolean =>
  currentValue === nextMaxHeight ||
  (typeof currentValue === 'number' &&
    Number.isFinite(currentValue) &&
    Math.abs(currentValue - nextMaxHeight) <= 1);

const noopCleanup = (): void => {};

function ProductListAlerts(): JSX.Element | null {
  const { loadError, actionError, onDismissActionError } = useProductListAlertsContext();
  const loadErrorAlert = hasDisplayText(loadError) ? (
    <Alert variant='error'>{loadError}</Alert>
  ) : null;
  const actionErrorAlert = hasDisplayText(actionError) ? (
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
  ) : null;

  if (loadErrorAlert === null && actionErrorAlert === null) return null;

  return (
    <div className='flex flex-col gap-2'>
      {loadErrorAlert !== null ? <div key='load-error'>{loadErrorAlert}</div> : null}
      {actionErrorAlert !== null ? <div key='action-error'>{actionErrorAlert}</div> : null}
    </div>
  );
}

const MemoizedProductListAlerts = memo(ProductListAlerts);

function useResolvedTableMaxHeight(initialMaxHeight: number | string | undefined): {
  desktopTableRef: RefObject<HTMLDivElement | null>;
  resolvedTableMaxHeight: number | string | undefined;
} {
  const desktopTableRef = useRef<HTMLDivElement>(null);
  const [resolvedTableMaxHeight, setResolvedTableMaxHeight] = useState<
    number | string | undefined
  >(initialMaxHeight);

  const updateTableMaxHeight = useCallback((): void => {
    try {
      const tableElement = desktopTableRef.current;
      if (tableElement === null) return;

      const nextMaxHeight = calculateTableMaxHeight(tableElement);
      setResolvedTableMaxHeight((currentValue) => {
        if (shouldPreserveTableMaxHeight(currentValue, nextMaxHeight)) return currentValue;
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

  useEffect((): (() => void) => {
    const mainElement = document.getElementById('app-content');
    if (mainElement === null || typeof ResizeObserver === 'undefined') return noopCleanup;

    let throttleTimer: number | null = null;
    const throttledUpdate = (): void => {
      if (throttleTimer !== null) return;
      throttleTimer = window.setTimeout(() => {
        updateTableMaxHeight();
        throttleTimer = null;
      }, 100);
    };

    const resizeObserver = new ResizeObserver(throttledUpdate);
    resizeObserver.observe(mainElement);

    window.addEventListener('resize', throttledUpdate);
    updateTableMaxHeight();

    return (): void => {
      if (throttleTimer !== null) window.clearTimeout(throttleTimer);
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

  return { desktopTableRef, resolvedTableMaxHeight };
}

const getProductRowClassName = (
  tableProps: UseProductsTablePropsReturn
): ((row: Row<ProductWithImages>) => string | undefined) | undefined => tableProps.getRowClassName;

function ProductListMobileSurface({ isEmpty }: { isEmpty: boolean }): JSX.Element {
  return (
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
  );
}

function ProductListDesktopTable({
  desktopTableRef,
  resolvedTableMaxHeight,
  tableProps,
}: {
  desktopTableRef: RefObject<HTMLDivElement | null>;
  resolvedTableMaxHeight: number | string | undefined;
  tableProps: UseProductsTablePropsReturn;
}): JSX.Element {
  return (
    <div ref={desktopTableRef} className='hidden lg:block'>
      <DataTable
        columns={tableProps.columns}
        data={tableProps.data}
        isLoading={tableProps.isLoading}
        getRowId={tableProps.getRowId}
        getRowClassName={getProductRowClassName(tableProps)}
        rowSelection={tableProps.rowSelection}
        onRowSelectionChange={tableProps.onRowSelectionChange}
        skeletonRows={tableProps.skeletonRows}
        maxHeight={resolvedTableMaxHeight}
        stickyHeader={tableProps.stickyHeader}
        enableVirtualization={true}
        tableLayout='fixed'
      />
    </div>
  );
}

function ProductListTableContent(): JSX.Element {
  const tableProps = useProductsTableProps();
  const { desktopTableRef, resolvedTableMaxHeight } = useResolvedTableMaxHeight(
    tableProps.maxHeight
  );
  const isEmpty = tableProps.isLoading === false && tableProps.data.length === 0;

  return (
    <StandardDataTablePanel
      variant='flat'
      className='[&>div:first-child]:mb-3'
      header={<ProductListHeader filtersContent={<ProductFilters instanceId='header' />} />}
      alerts={<MemoizedProductListAlerts />}
      actions={<ProductSelectionActions />}
      columns={tableProps.columns}
      data={tableProps.data}
      isLoading={tableProps.isLoading}
      getRowId={tableProps.getRowId}
      getRowClassName={getProductRowClassName(tableProps)}
      rowSelection={tableProps.rowSelection}
      onRowSelectionChange={tableProps.onRowSelectionChange}
      skeletonRows={tableProps.skeletonRows}
      stickyHeader={tableProps.stickyHeader}
      enableVirtualization={true}
      maxHeight={resolvedTableMaxHeight}
      showTable={false}
    >
      <ProductListMobileSurface isEmpty={isEmpty} />
      <ProductListDesktopTable
        desktopTableRef={desktopTableRef}
        resolvedTableMaxHeight={resolvedTableMaxHeight}
        tableProps={tableProps}
      />
    </StandardDataTablePanel>
  );
}

export const ProductListTableSurface = memo((): JSX.Element => {
  const { handleProductsTableRender } = useProductListTableContext();

  return (
    <Profiler id='ProductsTable' onRender={handleProductsTableRender}>
      <ProductListTableContent />
    </Profiler>
  );
});
