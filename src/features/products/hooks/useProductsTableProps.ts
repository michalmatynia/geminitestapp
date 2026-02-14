'use client';

import { useMemo } from 'react';

import { useProductListTableContext } from '@/features/products/context/ProductListContext';

export function useProductsTableProps() {
  const {
    data,
    rowSelection,
    setRowSelection,
    tableColumns,
    getRowId,
    isLoading,
    skeletonRows,
  } = useProductListTableContext();

  return useMemo(
    () => ({
      columns: tableColumns,
      data,
      getRowId,
      rowSelection,
      onRowSelectionChange: setRowSelection,
      isLoading,
      skeletonRows,
    }),
    [
      tableColumns,
      data,
      getRowId,
      rowSelection,
      setRowSelection,
      isLoading,
      skeletonRows,
    ]
  );
}
