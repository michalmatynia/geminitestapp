'use client';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Table as ReactTable,
  RowSelectionState,
  OnChangeFn,
  RowData,
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import React, { JSX, memo, useEffect, useMemo, useState } from 'react';

import { EmptyState } from './empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';


interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  initialSorting?: SortingState;
  sortingStorageKey?: string;
  getRowId?: (row: TData) => string | number;
  footer?: (table: ReactTable<TData>) => React.ReactNode;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  isLoading?: boolean;
  skeletonRows?: React.ReactNode;
  meta?: Record<string, unknown>;
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    queryClient?: QueryClient;
  }
}

 
export const DataTable = memo(function DataTable<TData>({
  columns,
  data,
  initialSorting,
  sortingStorageKey,
  getRowId,
  footer,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: controlledOnRowSelectionChange,
  isLoading = false,
  skeletonRows,
  meta,
}: DataTableProps<TData>) {
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const queryClient = useQueryClient();

  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const onRowSelectionChange = controlledOnRowSelectionChange ?? setInternalRowSelection;

  useEffect(() => {
    if (!sortingStorageKey) return;
    try {
      const raw = window.localStorage.getItem(sortingStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SortingState;
      if (Array.isArray(parsed)) {
        setSorting(parsed);
      }
    } catch {
      // Ignore invalid localStorage values.
    }
  }, [sortingStorageKey]);

  useEffect(() => {
    if (!sortingStorageKey) return;
    try {
      window.localStorage.setItem(sortingStorageKey, JSON.stringify(sorting));
    } catch {
      // Ignore storage write errors.
    }
  }, [sorting, sortingStorageKey]);

  // Memoize table meta to prevent unnecessary re-renders
  const tableMeta = useMemo(() => ({
    ...meta,
    queryClient,
  }), [
    meta,
    queryClient,
  ]);

  // TanStack Table is not compatible with React Compiler memoization warnings.
   
  const table = useReactTable<TData>({
    data,
    columns,
    getRowId: getRowId as (row: TData) => string,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: onRowSelectionChange,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      rowSelection,
      sorting,
    },
    meta: tableMeta,
  });

  return (
    <div className='rounded-md border border-border'>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className='border-border'>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} className='text-foreground'>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            skeletonRows || (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24'
                >
                  <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                    <Loader2 className='h-6 w-6 animate-spin text-blue-500' />
                    <span className='text-xs'>Loading data...</span>
                  </div>
                </TableCell>
              </TableRow>
            )
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className='border-border'
                data-row-id={getRowId ? getRowId(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className='text-muted-foreground'>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className='h-24 py-12'
              >
                <EmptyState 
                  title='No results' 
                  description="Try adjusting your filters to find what you're looking for."
                  className='border-none p-0'
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {footer?.(table)}
    </div>
  );
}) as <TData>(props: DataTableProps<TData>) => JSX.Element;
