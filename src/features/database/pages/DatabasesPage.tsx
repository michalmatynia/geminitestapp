"use client";

import { DataTable, Button, useToast, Input, SectionHeader, SectionPanel, ConfirmDialog } from "@/shared/ui";
import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logClientError } from "@/features/observability";

import { getDatabaseColumns } from "../components/DatabaseColumns";
import { LogModal } from "../components/LogModal";
import { RestoreModal } from "../components/RestoreModal";
import type { DatabaseInfo, DatabaseType } from "../types";
import {
  useDatabaseBackups,
  useCreateBackupMutation,
  useRestoreBackupMutation,
  useUploadBackupMutation,
  useDeleteBackupMutation,
} from "../hooks/useDatabaseQueries";


export default function DatabasesPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<DatabaseType>("postgresql");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalContent, setLogModalContent] = useState("");
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const backupsQuery = useDatabaseBackups(activeTab);
  const data = backupsQuery.data ?? [];

  const createBackup = useCreateBackupMutation();
  const restoreBackup = useRestoreBackupMutation();
  const uploadBackup = useUploadBackupMutation();
  const deleteBackup = useDeleteBackupMutation();

  const openLogModal = useCallback((content: string): void => {
    setLogModalContent(content);
    setIsLogModalOpen(true);
  }, []);

  const closeLogModal = useCallback((): void => {
    setIsLogModalOpen(false);
    setLogModalContent("");
    void queryClient.invalidateQueries({ queryKey: ["database-backups", activeTab] });
  }, [queryClient, activeTab]);


  const handleRestoreRequest = useCallback((backup: DatabaseInfo): void => {
    setSelectedBackupForRestore(backup.name);
    setIsRestoreModalOpen(true);
  }, []);

  const handleRestoreConfirm = async (truncate: boolean): Promise<void> => {
    const backupName = selectedBackupForRestore;
    setIsRestoreModalOpen(false);
    setSelectedBackupForRestore(null);

    if (!backupName) return;

    try {
      const result = await restoreBackup.mutateAsync({
        dbType: activeTab,
        backupName,
        truncateBeforeRestore: truncate,
      });
      const { ok, payload } = result;
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
    } catch (error: unknown) {
      logClientError(error, { context: { source: "DatabasesPage", action: "restoreBackup", backupName, dbType: activeTab } });
      openLogModal(`An error occurred during restoration.\n\n${String(error)}`);
    }
  };

  const handleBackup = async (): Promise<void> => {
    try {
      const result = await createBackup.mutateAsync(activeTab);
      const { ok, payload } = result;
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
    } catch (error: unknown) {
      logClientError(error, { context: { source: "DatabasesPage", action: "createBackup", dbType: activeTab } });
      openLogModal(`An error occurred during backup.\n\n${String(error)}`);
    }
  };

  const handleDeleteRequest = useCallback((backupName: string): void => {
    setBackupToDelete(backupName);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!backupToDelete) return;
    try {
      const result = await deleteBackup.mutateAsync({ dbType: activeTab, backupName: backupToDelete });
      if (result.ok) {
        toast("Backup deleted successfully.", { variant: "success" });
      } else {
        toast("Failed to delete backup.", { variant: "error" });
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: "DatabasesPage", action: "deleteBackup", backupName: backupToDelete, dbType: activeTab } });
      toast("An error occurred during deletion.", { variant: "error" });
    } finally {
      setBackupToDelete(null);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadBackup.mutateAsync({ dbType: activeTab, file });
      if (result.ok) {
        toast("Backup uploaded successfully.", { variant: "success" });
      } else {
        toast("Failed to upload backup.", { variant: "error" });
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: "DatabasesPage", action: "uploadBackup", filename: file.name, dbType: activeTab } });
      toast("An error occurred during upload.", { variant: "error" });
    } finally {
      event.target.value = "";
    }
  };

  const triggerFileUpload = (): void => {
    fileInputRef.current?.click();
  };

  const handlePreview = (backupName: string): void => {
    const url = `/admin/databases/preview?backup=${encodeURIComponent(
      backupName
    )}&type=${activeTab}`;
    window.location.assign(url);
  };

  const handlePreviewCurrent = (): void => {
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
          onClose={(): void => {
            setIsRestoreModalOpen(false);
            setSelectedBackupForRestore(null);
          }}
          onConfirm={(t: boolean): void => { void handleRestoreConfirm(t); }}
        />
      )}

      <ConfirmDialog
        open={!!backupToDelete}
        onOpenChange={(open: boolean) => !open && setBackupToDelete(null)}
        onConfirm={(): void => { void handleConfirmDelete(); }}
        title="Delete Backup"
        description={`Are you sure you want to delete backup "${backupToDelete}"? This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      {/* Tabs */}
      <div className="mb-6 border-b border">
        <div className="flex gap-4">
          <Button
            onClick={(): void => setActiveTab("postgresql")}
            className={`px-4 py-2 font-medium transition ${ 
              activeTab === "postgresql"
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            PostgreSQL
          </Button>
          <Button
            onClick={(): void => setActiveTab("mongodb")}
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
              onClick={(): void => {
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => { void handleUpload(e); }}
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
            onDeleteRequest: (name: string): void => { void handleDeleteRequest(name); },
          })}
          data={data}
          initialSorting={[{ id: "lastModifiedAt", desc: true }]}
          sortingStorageKey={`stardb:database-backups:${activeTab}:sorting`}
        />
      </SectionPanel>
    </div>
  );
}
