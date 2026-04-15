'use client';

// useProductsTableProps: adapter hook that exposes the product list context in a
// shape consumable by the table component. Provides stable memoized props to
// prevent unnecessary table re-renders when unrelated list state changes.
import { useMemo } from 'react';

import { useProductListTableContext } from '@/features/products/context/ProductListContext';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import type { Row } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export interface UseProductsTablePropsReturn {
  columns: ColumnDef<ProductWithImages>[];
  data: ProductWithImages[];
  getRowClassName?: ((row: Row<ProductWithImages>) => string | undefined) | undefined;
  getRowId: (row: ProductWithImages) => string;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  isLoading: boolean;
  skeletonRows: ReactNode;
  maxHeight?: string | number | undefined;
  stickyHeader?: boolean | undefined;
}

export function useProductsTableProps(): UseProductsTablePropsReturn {
  const {
    data,
    rowSelection,
    setRowSelection,
    tableColumns,
    getRowClassName,
    getRowId,
    isLoading,
    skeletonRows,
    maxHeight,
    stickyHeader,
  } = useProductListTableContext();

  return useMemo(
    () => ({
      columns: tableColumns,
      data,
      getRowClassName,
      getRowId,
      rowSelection,
      onRowSelectionChange: setRowSelection,
      isLoading,
      skeletonRows,
      ...(maxHeight !== undefined && { maxHeight }),
      ...(stickyHeader !== undefined && { stickyHeader }),
    }),
    [
      tableColumns,
      data,
      getRowClassName,
      getRowId,
      rowSelection,
      setRowSelection,
      isLoading,
      skeletonRows,
      maxHeight,
      stickyHeader,
    ]
  );
}
