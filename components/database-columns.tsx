"use client";

import { ColumnDef } from "@tanstack/react-table";
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

const renderSortableHeader = (
  label: string,
  column: {
    getIsSorted: () => false | "asc" | "desc";
    getToggleSortingHandler: () => () => void;
  }
) => {
  const direction = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="inline-flex items-center gap-1 text-left text-sm font-medium text-foreground"
    >
      {label}
      <span className="text-xs text-muted-foreground">
        {direction === "asc" ? "▲" : direction === "desc" ? "▼" : "↕"}
      </span>
    </button>
  );
};

async function handleRestore(backupName: string, truncateBeforeRestore: boolean) {
  if (
    window.confirm(
      `Restore backup ${backupName}? This restores data only and preserves the current schema.`
    )
  ) {
    if (
      truncateBeforeRestore &&
      !window.confirm(
        "Truncate is enabled. This will delete all existing data before restoring. Continue?"
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/databases/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backupName, truncateBeforeRestore }),
      });
      if (res.ok) {
        alert("Backup restored successfully.");
        window.location.reload();
      } else {
        alert("Failed to restore backup.");
      }
    } catch (error) {
      console.error("Error restoring backup:", error);
      alert("An error occurred during restoration.");
    }
  }
}

async function handleDelete(backupName: string) {
  if (window.confirm(`Delete backup ${backupName}? This cannot be undone.`)) {
    try {
      const res = await fetch("/api/databases/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backupName }),
      });
      if (res.ok) {
        alert("Backup deleted successfully.");
        window.location.reload();
      } else {
        alert("Failed to delete backup.");
      }
    } catch (error) {
      console.error("Error deleting backup:", error);
      alert("An error occurred during deletion.");
    }
  }
}

export const getDatabaseColumns = (options?: {
  truncateBeforeRestore?: boolean;
  onPreview?: (backupName: string) => void;
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
      return toNumber(rowA.getValue(columnId)) - toNumber(rowB.getValue(columnId));
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
              onClick={() => {
                options.onPreview?.(backup.name);
              }}
            >
              Preview
            </Button>
          )}
          <Button
            onClick={() => {
              void handleRestore(backup.name, Boolean(options?.truncateBeforeRestore));
            }}
          >
            Restore
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              void handleDelete(backup.name);
            }}
          >
            Delete
          </Button>
        </div>
      );
    },
  },
];
