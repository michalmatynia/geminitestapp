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
  Row,
  Column,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import React, { JSX, memo, useEffect, useMemo, useState, useRef } from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { EmptyState } from './empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  initialSorting?: SortingState;
  sortingStorageKey?: string;
  getRowId?: (row: TData) => string | number;
  getSubRows?: (row: TData) => TData[] | undefined;
  footer?: (table: ReactTable<TData>) => React.ReactNode;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  expanded?: ExpandedState;
  onExpandedChange?: OnChangeFn<ExpandedState>;
  renderRowDetails?: (props: { row: Row<TData> }) => React.ReactNode;
  isLoading?: boolean;
  skeletonRows?: React.ReactNode;
  emptyState?: React.ReactNode;
  meta?: Record<string, unknown>;
  className?: string;
  getRowClassName?: ((row: Row<TData>) => string | undefined) | undefined;
  maxHeight?: string | number | undefined;
  stickyHeader?: boolean | undefined;
  enableVirtualization?: boolean;
}

export function DataTableSortableHeader<TData, TValue>({
  label,
  column,
  className,
}: {
  label: string;
  column: Column<TData, TValue>;
  className?: string;
}) {
  const direction = column.getIsSorted();
  const handler = column.getToggleSortingHandler();
  const headerClassName = className;

  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      onClick={handler ?? undefined}
      disabled={!handler}
      className={cn(
        '-ml-3 h-8 gap-1 px-3 text-left text-sm font-medium text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60',
        headerClassName
      )}
    >
      {label}
      <span className='text-xs text-muted-foreground'>
        {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕'}
      </span>
    </Button>
  );
}

declare module '@tanstack/table-core' {
  interface TableMeta<TData = unknown> {
    queryClient?: QueryClient;
  }
}

export const DataTable = memo(function DataTable<TData>({
  columns,
  data,
  initialSorting,
  sortingStorageKey,
  getRowId,
  getSubRows,
  footer,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: controlledOnRowSelectionChange,
  expanded: controlledExpanded,
  onExpandedChange: controlledOnExpandedChange,
  renderRowDetails,
  isLoading = false,
  skeletonRows,
  emptyState,
  meta,
  className,
  getRowClassName,
  maxHeight,
  stickyHeader = false,
  enableVirtualization = false,
}: DataTableProps<TData>) {
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({});
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const queryClient = useQueryClient();
  const parentRef = useRef<HTMLDivElement>(null);

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
  const tableMeta = useMemo(
    () => ({
      ...meta,
      queryClient,
    }),
    [meta, queryClient]
  );

  // TanStack Table is not compatible with React Compiler memoization warnings.

  const table = useReactTable<TData>({
    data,
    columns,
    getRowId: getRowId as (row: TData) => string,
    getSubRows: getSubRows as (row: TData) => TData[] | undefined,
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

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Default row height estimation
    overscan: 10,
    enabled: enableVirtualization,
  });

  return (
    <div
      className={cn(
        'rounded-md border border-border flex flex-col',
        className,
        'w-full min-w-0 max-w-none'
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div ref={parentRef} className={cn('flex-1 min-h-0', maxHeight && 'overflow-auto')}>
        <Table className='border-collapse' wrapperClassName={cn(maxHeight && 'overflow-visible')}>
          <TableHeader className={cn(stickyHeader && 'z-10 bg-background')}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='border-border'>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'text-foreground',
                        stickyHeader && 'sticky top-0 z-20 bg-background'
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
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
                  <TableCell colSpan={columns.length} className='h-24'>
                    <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                      <Loader2 className='h-6 w-6 animate-spin text-blue-500' />
                      <span className='text-xs'>Loading data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            ) : rows.length ? (
              enableVirtualization ? (
                <>
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        style={{
                          height: `${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px`,
                          padding: 0,
                        }}
                      />
                    </TableRow>
                  )}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    if (!row) return null;
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow
                          data-state={row.getIsSelected() && 'selected'}
                          className={cn('border-border', getRowClassName?.(row))}
                          data-row-id={getRowId ? getRowId(row.original) : undefined}
                          data-index={virtualRow.index}
                          ref={rowVirtualizer.measureElement}
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
                    );
                  })}
                  {rowVirtualizer.getVirtualItems().length > 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        style={{
                          height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end ?? 0)}px`,
                          padding: 0,
                        }}
                      />
                    </TableRow>
                  )}
                </>
              ) : (
                rows.map((row) => (
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
              )
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 py-12'>
                  {emptyState ?? (
                    <EmptyState
                      title='No results'
                      description="Try adjusting your filters to find what you're looking for."
                      className='border-none p-0'
                    />
                  )}
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
