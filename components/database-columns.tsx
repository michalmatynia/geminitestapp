"use client";

import type { ColumnDef, Column } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

export type DatabaseInfo = {
  name: string;
  size: string;
  created: string;
  createdAt: string;
  lastModified: string;
  lastModifiedAt: string;
  lastRestored?: string;
};

type Notify = (message: string, variant?: "success" | "error" | "info") => void;

// ✅ Use TanStack's Column type, and accept that the handler may be undefined.
const renderSortableHeader = <TData, TValue>(
  label: string,
  column: Column<TData, TValue>
) => {
  const direction = column.getIsSorted(); // false | "asc" | "desc"
  const handler = column.getToggleSortingHandler(); // ((event) => void) | undefined

  return (
    <button
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
    </button>
  );
};

async function handleDelete(
  backupName: string,
  onDelete: () => void,
  notify?: Notify
) {
  if (window.confirm(`Delete backup ${backupName}? This cannot be undone.`)) {
    try {
      const res = await fetch("/api/databases/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupName }),
      });

      if (res.ok) {
        notify?.("Backup deleted successfully.", "success");
        onDelete();
      } else {
        notify?.("Failed to delete backup.", "error");
      }
    } catch (error) {
      console.error("Error deleting backup:", error);
      notify?.("An error occurred during deletion.", "error");
    }
  }
}

export const getDatabaseColumns = (options?: {
  onPreview?: (backupName: string) => void;
  onRestoreRequest?: (backup: DatabaseInfo) => void;
  onDelete?: () => void;
  notify?: Notify;
  dbType?: "postgresql" | "mongodb";
}): ColumnDef<DatabaseInfo>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => renderSortableHeader("Name", column),
  },
  {
    accessorKey: "size",
    header: ({ column }) => renderSortableHeader("Size", column),
    sortingFn: (rowA, rowB, columnId) => {
      const toNumber = (value: string) =>
        Number.parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
      return (
        toNumber(rowA.getValue(columnId)) - toNumber(rowB.getValue(columnId))
      );
    },
  },
  {
    id: "createdAt",
    accessorFn: (row) => row.createdAt,
    header: ({ column }) => renderSortableHeader("Created", column),
    cell: ({ row }) => row.original.created,
  },
  {
    id: "lastModifiedAt",
    accessorFn: (row) => row.lastModifiedAt,
    header: ({ column }) => renderSortableHeader("Last Modified", column),
    cell: ({ row }) => row.original.lastModified,
  },
  {
    accessorKey: "lastRestored",
    header: "Last Restored",
    cell: ({ row }) => row.original.lastRestored || "Never",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const backup = row.original;
      return (
        <div className="flex space-x-2">
          {options?.onPreview && (
            <Button
              variant="secondary"
              onClick={() => options.onPreview?.(backup.name)}
            >
              Preview
            </Button>
          )}

          <Button
            onClick={() => {
              options?.onRestoreRequest?.(backup);
            }}
          >
            Restore
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              if (options?.onDelete) {
                void handleDelete(
                  backup.name,
                  options.onDelete,
                  options.notify
                );
              }
            }}
          >
            Delete
          </Button>
        </div>
      );
    },
  },
];
