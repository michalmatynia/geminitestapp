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

async function handleRestore(dbName: string) {
  if (window.confirm(`Are you sure you want to restore ${dbName}?`)) {
    try {
      const res = await fetch("/api/databases/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dbName }),
      });
      if (res.ok) {
        alert("Database restored successfully.");
        window.location.reload();
      } else {
        alert("Failed to restore database.");
      }
    } catch (error) {
      console.error("Error restoring database:", error);
      alert("An error occurred during restoration.");
    }
  }
}

async function handleDelete(dbName: string) {
  if (window.confirm(`Are you sure you want to delete ${dbName}? This action cannot be undone.`)) {
    try {
      const res = await fetch("/api/databases/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dbName }),
      });
      if (res.ok) {
        alert("Database backup deleted successfully.");
        window.location.reload();
      } else {
        alert("Failed to delete database backup.");
      }
    } catch (error) {
      console.error("Error deleting database backup:", error);
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
      const db = row.original;
      return (
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              void handleRestore(db.name);
            }}
          >
            Restore
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              void handleDelete(db.name);
            }}
          >
            Delete
          </Button>
        </div>
      );
    },
  },
];
