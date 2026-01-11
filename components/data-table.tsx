"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Table as ReactTable,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  initialSorting?: SortingState;
  sortingStorageKey?: string;
  setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
  productNameKey?: "name_en" | "name_pl" | "name_de";
  onProductNameClick?: (row: TData) => void;
  onProductEditClick?: (row: TData) => void;
  getRowId?: (row: TData) => string | number;
  footer?: (table: ReactTable<TData>) => React.ReactNode;
}

declare module "@tanstack/react-table" {
  interface TableMeta<TData> {
    setRefreshTrigger?: React.Dispatch<React.SetStateAction<number>>;
    productNameKey?: "name_en" | "name_pl" | "name_de";
    onProductNameClick?: (row: TData) => void;
    onProductEditClick?: (row: TData) => void;
  }
}

export function DataTable<TData>({
  columns,
  data,
  initialSorting,
  sortingStorageKey,
  setRefreshTrigger,
  productNameKey,
  onProductNameClick,
  onProductEditClick,
  getRowId,
  footer,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);

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

  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      rowSelection,
      sorting,
    },
    meta: {
      ...(setRefreshTrigger ? { setRefreshTrigger } : {}),
      ...(productNameKey ? { productNameKey } : {}),
      ...(onProductNameClick ? { onProductNameClick } : {}),
      ...(onProductEditClick ? { onProductEditClick } : {}),
    },
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
          {table.getRowModel().rows?.length ? (
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
}
