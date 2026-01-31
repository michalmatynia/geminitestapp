"use client";

import { Button } from "@/shared/ui";
import type { ColumnDef, Column } from "@tanstack/react-table";

import type { DatabaseInfo } from "../types";

// ✅ Use TanStack's Column type, and accept that the handler may be undefined.
const renderSortableHeader = <TData, TValue>(
  label: string,
  column: Column<TData, TValue>
): React.JSX.Element => {
  const direction = column.getIsSorted(); // false | "asc" | "desc"
  const handler = column.getToggleSortingHandler(); // ((event) => void) | undefined

  return (
    <Button
      type="button"
      onClick={handler ?? undefined}
      // optional: prevent "clickable" affordance if it can't sort
      disabled={!handler}
      className="inline-flex items-center gap-1 text-left text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
      <span className="text-xs text-muted-foreground">
        {direction === "asc" ? "▲" : direction === "desc" ? "▼" : "↕"}
      </span>
    </Button>
  );
};

export const getDatabaseColumns = (options?: {
  onPreview?: (backupName: string) => void;
  onRestoreRequest?: (backup: DatabaseInfo) => void;
  onDeleteRequest?: (backupName: string) => void;
}): ColumnDef<DatabaseInfo>[] => [
  {
    accessorKey: "name",
    header: ({ column }: { column: Column<DatabaseInfo, unknown> }): React.JSX.Element => renderSortableHeader("Name", column),
  },
  {
    accessorKey: "size",
    header: ({ column }: { column: Column<DatabaseInfo, unknown> }): React.JSX.Element => renderSortableHeader("Size", column),
    sortingFn: (rowA: { getValue: (id: string) => string }, rowB: { getValue: (id: string) => string }, columnId: string): number => {
      const toNumber = (value: string): number =>
        Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
      return (
        toNumber(rowA.getValue(columnId)) - toNumber(rowB.getValue(columnId))
      );
    },
  },
  {
    id: "createdAt",
    accessorFn: (row: DatabaseInfo): number | undefined => row.createdAt,
    header: ({ column }: { column: Column<DatabaseInfo, unknown> }): React.JSX.Element => renderSortableHeader("Created", column),
    cell: ({ row }: { row: { original: DatabaseInfo } }): string | undefined => row.original.created,
  },
  {
    id: "lastModifiedAt",
    accessorFn: (row: DatabaseInfo): number | undefined => row.lastModifiedAt,
    header: ({ column }: { column: Column<DatabaseInfo, unknown> }): React.JSX.Element => renderSortableHeader("Last Modified", column),
    cell: ({ row }: { row: { original: DatabaseInfo } }): string | undefined => row.original.lastModified,
  },
  {
    accessorKey: "lastRestored",
    header: "Last Restored",
    cell: ({ row }: { row: { original: DatabaseInfo } }): string => row.original.lastRestored || "Never",
  },
  {
    id: "actions",
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.JSX.Element => {
      const backup = row.original;
      return (
        <div className="flex space-x-2">
          {options?.onPreview && (
            <Button
              variant="secondary"
              onClick={(): void => options.onPreview?.(backup.name)}
            >
              Preview
            </Button>
          )}

          <Button
            onClick={(): void => {
              options?.onRestoreRequest?.(backup);
            }}
          >
            Restore
          </Button>

          <Button
            variant="destructive"
            onClick={(): void => {
              options?.onDeleteRequest?.(backup.name);
            }}
          >
            Delete
          </Button>
        </div>
      );
    },
  },
];
