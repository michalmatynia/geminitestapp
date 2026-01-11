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

async function handleRestore(
  backupName: string,
  truncateBeforeRestore: boolean,
  onRestore: (log: string) => void
) {
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
      const payload = (await res.json()) as {
        message?: string;
        error?: string;
        errorId?: string;
        stage?: string;
        backupName?: string;
        log?: string;
      };
      const log = payload.log ?? "No log available.";
      if (res.ok) {
        onRestore(
          `${
            payload.message ?? "Backup restored successfully."
          }\n\n---LOG---\n${log}`
        );
      } else {
        const meta = [
          payload.errorId ? `Error ID: ${payload.errorId}` : null,
          payload.stage ? `Stage: ${payload.stage}` : null,
          payload.backupName ? `Backup: ${payload.backupName}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        onRestore(
          `${payload.error ?? "Failed to restore backup."}${
            meta ? `\n\n${meta}` : ""
          }\n\n---LOG---\n${log}`
        );
      }
    } catch (error) {
      console.error("Error restoring backup:", error);
      onRestore(`An error occurred during restoration.\n\n${String(error)}`);
    }
  }
}

async function handleDelete(backupName: string, onDelete: () => void) {
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
        onDelete();
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
  onRestore?: (log: string) => void;
  onDelete?: () => void;
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
              onClick={() => {
                options.onPreview?.(backup.name);
              }}
            >
              Preview
            </Button>
          )}
          <Button
            onClick={() => {
              if (options?.onRestore) {
                void handleRestore(
                  backup.name,
                  Boolean(options?.truncateBeforeRestore),
                  options.onRestore
                );
              }
            }}
          >
            Restore
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (options?.onDelete) {
                void handleDelete(backup.name, options.onDelete);
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
