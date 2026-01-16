"use client";

import { useEffect, useState, useRef } from "react";
import { DataTable } from "@/components/data-table";
import { getDatabaseColumns, DatabaseInfo } from "@/components/database-columns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type DatabaseType = "postgresql" | "mongodb";

async function getBackups(dbType: DatabaseType): Promise<DatabaseInfo[]> {
  const res = await fetch(`/api/databases/backups?type=${dbType}`);
  if (!res.ok) {
    throw new Error("Failed to fetch backups");
  }
  return res.json() as Promise<DatabaseInfo[]>;
}

const LogModal = ({
  content,
  onClose,
}: {
  content: string;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="rounded-lg bg-gray-900 p-6 shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Operation Log</h2>
      <SyntaxHighlighter language="bash" style={atomDark}>
        {content}
      </SyntaxHighlighter>
      <div className="mt-6 text-right">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  </div>
);

const RestoreModal = ({
  backupName,
  onClose,
  onConfirm,
}: {
  backupName: string;
  onClose: () => void;
  onConfirm: (truncate: boolean) => void;
}) => {
  const [truncate, setTruncate] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="rounded-lg bg-gray-900 p-6 shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Restore Database</h2>
        <p className="mb-4 text-gray-300">
          Are you sure you want to restore backup <strong>{backupName}</strong>?
        </p>
        <label className="flex items-center gap-2 mb-6 cursor-pointer">
          <input
            type="checkbox"
            className="size-4 accent-emerald-500"
            checked={truncate}
            onChange={(e) => setTruncate(e.target.checked)}
          />
          <span className="text-sm text-gray-300">
            Truncate (delete) existing data before restore
          </span>
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(truncate)}
            className="bg-red-600 hover:bg-red-700"
          >
            Restore
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function DatabasesPage() {
  const [activeTab, setActiveTab] = useState<DatabaseType>("postgresql");
  const [data, setData] = useState<DatabaseInfo[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalContent, setLogModalContent] = useState("");
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const { toast } = useToast();

  const openLogModal = (content: string) => {
    setLogModalContent(content);
    setIsLogModalOpen(true);
  };

  const closeLogModal = () => {
    setIsLogModalOpen(false);
    setLogModalContent("");
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    void getBackups(activeTab).then(setData);
  }, [refreshTrigger, activeTab]);

  const handleRestoreRequest = (backup: DatabaseInfo) => {
    setSelectedBackupForRestore(backup.name);
    setIsRestoreModalOpen(true);
  };

  const handleRestoreConfirm = async (truncate: boolean) => {
    const backupName = selectedBackupForRestore;
    setIsRestoreModalOpen(false);
    setSelectedBackupForRestore(null);

    if (!backupName) return;

    try {
      const res = await fetch("/api/databases/restore?type=" + activeTab, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupName, truncateBeforeRestore: truncate }),
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
        openLogModal(
          `${payload.message ?? "Backup restored successfully."}\n\n---LOG---\n${log}`
        );
      } else {
        const meta = [
          payload.errorId ? `Error ID: ${payload.errorId}` : null,
          payload.stage ? `Stage: ${payload.stage}` : null,
          payload.backupName ? `Backup: ${payload.backupName}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        openLogModal(
          `${payload.error ?? "Failed to restore backup."}${
            meta ? `\n\n${meta}` : ""
          }\n\n---LOG---\n${log}`
        );
      }
    } catch (error) {
      console.error("Error restoring backup:", error);
      openLogModal(`An error occurred during restoration.\n\n${String(error)}`);
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch(`/api/databases/backup?type=${activeTab}`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        warning?: string;
        log?: string;
      };
      const log = data.log ?? "No log available.";
      if (res.ok) {
        if (data.warning) {
          openLogModal(
            `${data.message ?? "Backup created"}: ${
              data.warning
            }\n\n---LOG---\n${log}`
          );
        } else {
          openLogModal(
            `${
              data.message ?? "Backup created successfully."
            }\n\n---LOG---\n${log}`
          );
        }
      } else {
        openLogModal(
          `${data.error ?? "Failed to create backup."}\n\n---LOG---\n${log}`
        );
      }
    } catch (error) {
      console.error("Error creating backup:", error);
      openLogModal(`An error occurred during backup.\n\n${String(error)}`);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", activeTab);

    try {
      const res = await fetch("/api/databases/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast("Backup uploaded successfully.", { variant: "success" });
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast("Failed to upload backup.", { variant: "error" });
      }
    } catch (error) {
      console.error("Error uploading backup:", error);
      toast("An error occurred during upload.", { variant: "error" });
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
    )}&type=${activeTab}`;
    window.location.assign(url);
  };

  const handlePreviewCurrent = () => {
    window.location.assign(`/admin/databases/preview?mode=current&type=${activeTab}`);
  };

  return (
    <div className="container mx-auto py-10">
      {isLogModalOpen && (
        <LogModal content={logModalContent} onClose={closeLogModal} />
      )}

      {isRestoreModalOpen && selectedBackupForRestore && (
        <RestoreModal
          backupName={selectedBackupForRestore}
          onClose={() => {
            setIsRestoreModalOpen(false);
            setSelectedBackupForRestore(null);
          }}
          onConfirm={handleRestoreConfirm}
        />
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("postgresql")}
            className={`px-4 py-2 font-medium transition ${
              activeTab === "postgresql"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            PostgreSQL
          </button>
          <button
            onClick={() => setActiveTab("mongodb")}
            className={`px-4 py-2 font-medium transition ${
              activeTab === "mongodb"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            MongoDB
          </button>
        </div>
      </div>

      <div className="mb-2">
        <p className="text-sm text-gray-400">
          {activeTab === "postgresql"
            ? "PostgreSQL backups use pg_dump/pg_restore (.dump files). Restores are data-only and preserve your current schema."
            : "MongoDB backups use mongodump/mongorestore (.archive files). Full database dumps with BSON format."}
        </p>
      </div>
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Databases - {activeTab === "postgresql" ? "PostgreSQL" : "MongoDB"}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              void handleBackup();
            }}
          >
            Create Backup
          </Button>
          <Button onClick={triggerFileUpload}>Upload Backup</Button>
          <Button variant="secondary" onClick={handlePreviewCurrent}>
            Preview Current DB
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept={activeTab === "postgresql" ? ".dump" : ".archive"}
          />
        </div>
      </div>
      <div className="rounded-lg bg-gray-900 p-6 shadow-lg">
        <DataTable
          columns={getDatabaseColumns({
            onPreview: handlePreview,
            onRestoreRequest: handleRestoreRequest,
            onDelete: () => setRefreshTrigger((prev) => prev + 1),
            notify: (message, variant) =>
              toast(message, { variant: variant ?? "info" }),
            dbType: activeTab,
          })}
          data={data}
          initialSorting={[{ id: "lastModifiedAt", desc: true }]}
          sortingStorageKey={`stardb:database-backups:${activeTab}:sorting`}
        />
      </div>
    </div>
  );
}
