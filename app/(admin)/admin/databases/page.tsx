"use client";

import { useEffect, useState, useRef } from "react";
import { DataTable } from "@/components/data-table";
import { getDatabaseColumns, DatabaseInfo } from "@/components/database-columns";
import { Button } from "@/components/ui/button";

async function getBackups(): Promise<DatabaseInfo[]> {
  const res = await fetch("/api/databases/backups");
  if (!res.ok) {
    throw new Error("Failed to fetch backups");
  }
  return res.json() as Promise<DatabaseInfo[]>;
}

export default function DatabasesPage() {
  const [data, setData] = useState<DatabaseInfo[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [truncateBeforeRestore, setTruncateBeforeRestore] = useState(false);

  useEffect(() => {
    void getBackups().then(setData);
  }, [refreshTrigger]);

  const handleBackup = async () => {
    try {
      const res = await fetch("/api/databases/backup", {
        method: "POST",
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        warning?: string;
      };
      if (res.ok) {
        if (data.warning) {
          alert(`${data.message ?? "Backup created"}: ${data.warning}`);
        } else {
          alert(data.message ?? "Backup created successfully.");
        }
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert(data.error ?? "Failed to create backup.");
      }
    } catch (error) {
      console.error("Error creating backup:", error);
      alert("An error occurred during backup.");
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/databases/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert("Backup uploaded successfully.");
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert("Failed to upload backup.");
      }
    } catch (error) {
      console.error("Error uploading backup:", error);
      alert("An error occurred during upload.");
    } finally {
      event.target.value = "";
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePreview = (backupName: string) => {
    const url = `/admin/databases/preview?backup=${encodeURIComponent(
      backupName
    )}`;
    window.location.assign(url);
  };

  const handlePreviewCurrent = () => {
    window.location.assign("/admin/databases/preview?mode=current");
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-2">
        <p className="text-sm text-gray-400">
          PostgreSQL backups use pg_dump/pg_restore (.dump files). Restores are
          data-only and preserve your current schema.
        </p>
      </div>
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Databases</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              className="size-4 accent-emerald-500"
              checked={truncateBeforeRestore}
              onChange={(event) => setTruncateBeforeRestore(event.target.checked)}
            />
            Truncate data before restore
          </label>
          <Button onClick={() => { void handleBackup(); }}>Create Backup</Button>
          <Button onClick={triggerFileUpload}>Upload Backup</Button>
          <Button variant="secondary" onClick={handlePreviewCurrent}>
            Preview Current DB
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".dump"
          />
        </div>
      </div>
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <DataTable
          columns={getDatabaseColumns({
            truncateBeforeRestore,
            onPreview: handlePreview,
          })}
          data={data}
          initialSorting={[{ id: "lastModifiedAt", desc: true }]}
          sortingStorageKey="stardb:database-backups:sorting"
        />
      </div>
    </div>
  );
}
