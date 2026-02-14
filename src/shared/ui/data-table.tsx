'use client';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  SortingState,
  useReactTable,
  Table as ReactTable,
  RowSelectionState,
  ExpandedState,
  OnChangeFn,
  RowData,
  Row,
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import React, { JSX, memo, useEffect, useMemo, useState } from 'react';

import { cn } from '@/shared/utils';

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
  expanded?: ExpandedState;
  onExpandedChange?: OnChangeFn<ExpandedState>;
  renderRowDetails?: (props: { row: Row<TData> }) => React.ReactNode;
  isLoading?: boolean;
  skeletonRows?: React.ReactNode;
  meta?: Record<string, unknown>;
  className?: string;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  maxHeight?: string | number;
  stickyHeader?: boolean;
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
  expanded: controlledExpanded,
  onExpandedChange: controlledOnExpandedChange,
  renderRowDetails,
  isLoading = false,
  skeletonRows,
  meta,
  className,
  getRowClassName,
  maxHeight,
  stickyHeader = false,
}: DataTableProps<TData>) {
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const queryClient = useQueryClient();

  const rowSelection = controlledRowSelection ?? internalRowSelection;
  const onRowSelectionChange = controlledOnRowSelectionChange ?? setInternalRowSelection;
  const expanded = controlledExpanded ?? internalExpanded;
  const onExpandedChange = controlledOnExpandedChange ?? setInternalExpanded;

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
    onExpandedChange: onExpandedChange,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: setSorting,
    state: {
      rowSelection,
      sorting,
      expanded,
    },
    meta: tableMeta,
  });

  return (
    <div 
      className={cn('rounded-md border border-border flex flex-col', className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className={cn('flex-1 min-h-0', maxHeight && 'overflow-auto')}>
        <Table className='border-collapse'>
          <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10 bg-background')}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='border-border'>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead 
                      key={header.id} 
                      className={cn('text-foreground', stickyHeader && 'bg-background')}
                    >
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
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn('border-border', getRowClassName?.(row))}
                    data-row-id={getRowId ? getRowId(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='text-muted-foreground'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && renderRowDetails && (
                    <TableRow className='border-border bg-muted/30'>
                      <TableCell colSpan={columns.length} className='p-0'>
                        {renderRowDetails({ row })}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
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
      </div>
      {footer?.(table)}
    </div>
  );
}) as <TData>(props: DataTableProps<TData>) => JSX.Element;
