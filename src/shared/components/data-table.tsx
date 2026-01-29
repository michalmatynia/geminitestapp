"use client";
import React, { JSX, memo, useEffect, useMemo, useState } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
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
} from "@tanstack/react-table";
import { useQueryClient, QueryClient } from "@tanstack/react-query";


export type PriceGroupForCalculation = {
  id: string;
  groupId?: string;
  currencyId: string;
  type: string;
  isDefault: boolean;
  sourceGroupId: string | null;
  priceMultiplier: number;
  addToPrice: number;
  currency: { code: string };
  currencyCode?: string;
};

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  initialSorting?: SortingState;
  sortingStorageKey?: string;
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
  productNameKey?: "name_en" | "name_pl" | "name_de";
  currencyCode?: string;
  priceGroups?: PriceGroupForCalculation[];
  onProductNameClick?: (row: TData) => void;
  onProductEditClick?: (row: TData) => void;
  onIntegrationsClick?: (row: TData) => void;
  onExportSettingsClick?: (row: TData) => void;
  integrationBadgeIds?: Set<string>;
  integrationBadgeStatuses?: Map<string, string>;
  getRowId?: (row: TData) => string | number;
  footer?: (table: ReactTable<TData>) => React.ReactNode;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  isLoading?: boolean;
  skeletonRows?: React.ReactNode;
}

declare module "@tanstack/react-table" {
  interface TableMeta<TData> {
    setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
    productNameKey?: "name_en" | "name_pl" | "name_de";
    currencyCode?: string;
    priceGroups?: PriceGroupForCalculation[];
    onProductNameClick?: (row: TData) => void;
    onProductEditClick?: (row: TData) => void;
    onIntegrationsClick?: (row: TData) => void;
    onExportSettingsClick?: (row: TData) => void;
    integrationBadgeIds?: Set<string>;
    integrationBadgeStatuses?: Map<string, string>;
    queryClient?: QueryClient;
  }
}

export const DataTable = memo(function DataTable<TData>({
  columns,
  data,
  initialSorting,
  sortingStorageKey,
  setRefreshTrigger,
  productNameKey,
  currencyCode,
  priceGroups,
  onProductNameClick,
  onProductEditClick,
  onIntegrationsClick,
  onExportSettingsClick,
  integrationBadgeIds,
  integrationBadgeStatuses,
  getRowId,
  footer,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: controlledOnRowSelectionChange,
  isLoading = false,
  skeletonRows,
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
    ...(setRefreshTrigger ? { setRefreshTrigger } : {}),
    ...(productNameKey ? { productNameKey } : {}),
    ...(currencyCode ? { currencyCode } : {}),
    ...(priceGroups ? { priceGroups } : {}),
    ...(onProductNameClick ? { onProductNameClick } : {}),
    ...(onProductEditClick ? { onProductEditClick } : {}),
    ...(onIntegrationsClick ? { onIntegrationsClick } : {}),
    ...(onExportSettingsClick ? { onExportSettingsClick } : {}),
    ...(integrationBadgeIds ? { integrationBadgeIds } : {}),
    ...(integrationBadgeStatuses ? { integrationBadgeStatuses } : {}),
    queryClient,
  }), [
    setRefreshTrigger,
    productNameKey,
    currencyCode,
    priceGroups,
    onProductNameClick,
    onProductEditClick,
    onIntegrationsClick,
    onExportSettingsClick,
    integrationBadgeIds,
    integrationBadgeStatuses,
    queryClient,
  ]);

  // TanStack Table is not compatible with React Compiler memoization warnings.
  // eslint-disable-next-line react-hooks/incompatible-library
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
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-border">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} className="text-foreground">
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
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            )
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="border-border"
                data-row-id={getRowId ? getRowId(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-muted-foreground">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {footer && footer(table)}
    </div>
  );
}) as <TData>(props: DataTableProps<TData>) => JSX.Element;
