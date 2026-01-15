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

export default function DatabasesPage() {
  const [activeTab, setActiveTab] = useState<DatabaseType>("postgresql");
  const [data, setData] = useState<DatabaseInfo[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [truncateBeforeRestore, setTruncateBeforeRestore] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalContent, setLogModalContent] = useState("");
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
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              className="size-4 accent-emerald-500"
              checked={truncateBeforeRestore}
              onChange={(event) =>
                setTruncateBeforeRestore(event.target.checked)
              }
            />
            Truncate data before restore
          </label>
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
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <DataTable
          columns={getDatabaseColumns({
            truncateBeforeRestore,
            onPreview: handlePreview,
            onRestore: (log: string) => openLogModal(log),
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
