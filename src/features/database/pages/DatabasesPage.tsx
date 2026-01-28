"use client";

import { DataTable, Button, useToast, Input, SectionHeader, SectionPanel } from "@/shared/ui";
import { useEffect, useState, useRef } from "react";






import { getDatabaseColumns } from "../components/DatabaseColumns";
import { LogModal } from "../components/LogModal";
import { RestoreModal } from "../components/RestoreModal";
import type { DatabaseInfo, DatabaseType } from "../types";
import {
  createDatabaseBackup,
  fetchDatabaseBackups,
  restoreDatabaseBackup,
  uploadDatabaseBackup,
} from "../api";

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
    void fetchDatabaseBackups(activeTab).then(setData);
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
      const { ok, payload } = await restoreDatabaseBackup(activeTab, {
        backupName,
        truncateBeforeRestore: truncate,
      });
      const log = payload.log ?? "No log available.";

      if (ok) {
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
      const { ok, payload } = await createDatabaseBackup(activeTab);
      const log = payload.log ?? "No log available.";
      if (ok) {
        if (payload.warning) {
          openLogModal(
            `${payload.message ?? "Backup created"}: ${
              payload.warning
            }\n\n---LOG---\n${log}`
          );
        } else {
          openLogModal(
            `${
              payload.message ?? "Backup created successfully."
            }\n\n---LOG---\n${log}`
          );
        }
      } else {
        openLogModal(
          `${payload.error ?? "Failed to create backup."}\n\n---LOG---\n${log}`
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

    try {
      const result = await uploadDatabaseBackup(activeTab, file);
      if (result.ok) {
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
          onConfirm={(t) => void handleRestoreConfirm(t)}
        />
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border">
        <div className="flex gap-4">
          <Button
            onClick={() => setActiveTab("postgresql")}
            className={`px-4 py-2 font-medium transition ${
              activeTab === "postgresql"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            PostgreSQL
          </Button>
          <Button
            onClick={() => setActiveTab("mongodb")}
            className={`px-4 py-2 font-medium transition ${
              activeTab === "mongodb"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            MongoDB
          </Button>
        </div>
      </div>

      <SectionHeader
        title={`Databases - ${activeTab === "postgresql" ? "PostgreSQL" : "MongoDB"}`}
        description={
          activeTab === "postgresql"
            ? "PostgreSQL backups use pg_dump/pg_restore (.dump files). Restores are data-only and preserve your current schema."
            : "MongoDB backups use mongodump/mongorestore (.archive files). Full database dumps with BSON format."
        }
        actions={
          <>
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
            <Input
              type="file"
              ref={fileInputRef}
              onChange={(e) => void handleUpload(e)}
              className="hidden"
              accept={activeTab === "postgresql" ? ".dump" : ".archive"}
            />
          </>
        }
        className="mb-6"
      />
      <SectionPanel className="p-6">
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
      </SectionPanel>
    </div>
  );
}
