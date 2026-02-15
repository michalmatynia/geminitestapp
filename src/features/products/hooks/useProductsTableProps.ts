'use client';

import { useMemo } from 'react';

import { useProductListTableContext } from '@/features/products/context/ProductListContext';
import type { ProductWithImages } from '@/features/products/types';

import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import type { Row } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export interface UseProductsTablePropsReturn {
  columns: ColumnDef<ProductWithImages>[];
  data: ProductWithImages[];
  getRowClassName?: (row: Row<ProductWithImages>) => string | undefined;
  getRowId: (row: ProductWithImages) => string;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  isLoading: boolean;
  skeletonRows: ReactNode;
  maxHeight?: string | number;
  stickyHeader?: boolean;
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
