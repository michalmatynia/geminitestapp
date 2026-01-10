"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

export type DatabaseInfo = {
  name: string;
  size: string;
  created: string;
  lastModified: string;
  lastRestored?: string;
};

async function handleRestore(backupName: string) {
  if (window.confirm(`Restore backup ${backupName}? This will overwrite current data.`)) {
    try {
      const res = await fetch("/api/databases/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backupName }),
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

export const columns: ColumnDef<DatabaseInfo>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "size",
    header: "Size",
  },
  {
    accessorKey: "created",
    header: "Created",
  },
  {
    accessorKey: "lastModified",
    header: "Last Modified",
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
          <Button
            onClick={() => {
              void handleRestore(backup.name);
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
