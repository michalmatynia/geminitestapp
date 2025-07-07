"use client"

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { deleteProduct } from "@/app/actions";
import { Product } from "./columns";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
}

export function DataTable<TData>({ columns, data }: DataTableProps<TData>) {
  const router = useRouter();
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);

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
  });

  const handleMassDelete = async () => {
    console.log("CLIENT: handleMassDelete triggered.");
    const selectedProductIds = table.getSelectedRowModel().rows.map((row) => (row.original as Product).id);

    if (selectedProductIds.length === 0) {
      alert("Please select products to delete.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedProductIds.length} selected products?`)) {
      try {
        await Promise.all(selectedProductIds.map((id) => deleteProduct(id)));
        setRowSelection({});
        alert("Selected products deleted successfully.");
        console.log("CLIENT: Deletion successful. Calling router.refresh().");
        router.refresh();
        console.log("CLIENT: router.refresh() called.");
      } catch (error) {
        console.error("Error during mass deletion:", error);
        alert("An error occurred during deletion.");
      }
    }
  };

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
      <div className="flex items-center justify-between space-x-2 px-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          onClick={handleMassDelete}
          disabled={table.getFilteredSelectedRowModel().rows.length === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Delete Selected
        </Button>
      </div>
    </div>
  );
}