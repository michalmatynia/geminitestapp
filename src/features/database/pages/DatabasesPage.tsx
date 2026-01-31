"use client";

import { DataTable, Button, useToast, Input, SectionHeader, SectionPanel } from "@/shared/ui";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";






import { getDatabaseColumns } from "../components/DatabaseColumns";
import { LogModal } from "../components/LogModal";
import { RestoreModal } from "../components/RestoreModal";
import type { DatabaseInfo, DatabaseType } from "../types";
import {
  createDatabaseBackup,
  fetchDatabaseBackups,
  restoreDatabaseBackup,
  uploadDatabaseBackup,
  deleteDatabaseBackup,
} from "../api";

export default function DatabasesPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<DatabaseType>("postgresql");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalContent, setLogModalContent] = useState("");
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const backupsQuery = useQuery({
    queryKey: ["database-backups", activeTab],
    queryFn: async (): Promise<DatabaseInfo[]> => fetchDatabaseBackups(activeTab),
  });
  const data = backupsQuery.data ?? [];

  const createBackup = useMutation<{ ok: boolean; payload: DatabaseBackupResponse }, Error, { dbType: DatabaseType }>({
    mutationFn: async ({ dbType }: { dbType: DatabaseType }) => createDatabaseBackup(dbType),
    onSuccess: (_data, variables): void => {
      void queryClient.invalidateQueries({ queryKey: ["database-backups", variables.dbType] });
    },
  });

  const restoreBackup = useMutation<{ ok: boolean; payload: DatabaseRestoreResponse }, Error, { dbType: DatabaseType; backupName: string; truncateBeforeRestore: boolean }>({
    mutationFn: async ({
      dbType,
      backupName,
      truncateBeforeRestore,
    }: {
      dbType: DatabaseType;
      backupName: string;
      truncateBeforeRestore: boolean;
    }) =>
      restoreDatabaseBackup(dbType, {
        backupName,
        truncateBeforeRestore,
      }),
    onSuccess: (
      _data,
      variables
    ): void => {
      void queryClient.invalidateQueries({
        queryKey: ["database-backups", variables.dbType],
      });
    },
  });

  const uploadBackup = useMutation<{ ok: boolean; payload: DatabaseBackupResponse }, Error, { dbType: DatabaseType; file: File }>({
    mutationFn: async ({ dbType, file }: { dbType: DatabaseType; file: File }) =>
      uploadDatabaseBackup(dbType, file),
    onSuccess: (_data, variables): void => {
      void queryClient.invalidateQueries({ queryKey: ["database-backups", variables.dbType] });
    },
  });

  const deleteBackup = useMutation<{ ok: boolean; payload: DatabaseBackupResponse }, Error, { dbType: DatabaseType; backupName: string }>({
    mutationFn: async ({ dbType, backupName }: { dbType: DatabaseType; backupName: string }) =>
      deleteDatabaseBackup(dbType, backupName),
    onSuccess: (_data, variables): void => {
      void queryClient.invalidateQueries({ queryKey: ["database-backups", variables.dbType] });
    },
  });

  const openLogModal = (content: string): void => {
    setLogModalContent(content);
    setIsLogModalOpen(true);
  };

  const closeLogModal = (): void => {
    setIsLogModalOpen(false);
    setLogModalContent("");
    void queryClient.invalidateQueries({ queryKey: ["database-backups", activeTab] });
  };


  const handleRestoreRequest = (backup: DatabaseInfo): void => {
    setSelectedBackupForRestore(backup.name);
    setIsRestoreModalOpen(true);
  };

  const handleRestoreConfirm = async (truncate: boolean): Promise<void> => {
    const backupName = selectedBackupForRestore;
    setIsRestoreModalOpen(false);
    setSelectedBackupForRestore(null);

    if (!backupName) return;

    try {
      const { ok, payload } = await restoreBackup.mutateAsync({
        dbType: activeTab,
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

  const handleBackup = async (): Promise<void> => {
    try {
      const { ok, payload } = (await createBackup.mutateAsync({ dbType: activeTab })) as {
        ok: boolean;
        payload: {
          log?: string;
          warning?: string;
          message?: string;
          error?: string;
        };
      };
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

  const handleDeleteRequest = async (backupName: string): Promise<void> => {
    if (!window.confirm(`Delete backup ${backupName}? This cannot be undone.`)) return;
    try {
      const result = await deleteBackup.mutateAsync({ dbType: activeTab, backupName });
      if (result.ok) {
        toast("Backup deleted successfully.", { variant: "success" });
      } else {
        toast("Failed to delete backup.", { variant: "error" });
      }
    } catch (error) {
      console.error("Error deleting backup:", error);
      toast("An error occurred during deletion.", { variant: "error" });
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
    } catch (error) {
      console.error("Error uploading backup:", error);
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
          onConfirm={(t: boolean) => void handleRestoreConfirm(t)}
        />
      )}

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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => void handleUpload(e)}
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
            onDeleteRequest: (name: string) => { void handleDeleteRequest(name); },
          })}
          data={data}
          initialSorting={[{ id: "lastModifiedAt", desc: true }]}
          sortingStorageKey={`stardb:database-backups:${activeTab}:sorting`}
        />
      </SectionPanel>
    </div>
  );
}
