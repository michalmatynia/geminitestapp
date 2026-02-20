'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { logClientError } from '@/features/observability';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import {
  DATABASE_ENGINE_OPERATION_CONTROLS_KEY,
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
} from '@/shared/lib/db/database-engine-constants';
import { normalizeDatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-operation-controls';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast, type FileUploadHelpers } from '@/shared/ui';

import {
  useCreateBackupMutation,
  useDatabaseBackups,
  useDeleteBackupMutation,
  useRestoreBackupMutation,
  useUploadBackupMutation,
} from '../hooks/useDatabaseQueries';

import type { DatabaseInfo, DatabaseType } from '@/shared/contracts/database';

export function useDatabaseBackupsState() {
  const dbKeys = QUERY_KEYS.system.databases;
  const [activeTab, setActiveTab] = useState<DatabaseType>('postgresql');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalContent, setLogModalContent] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isProd = process.env['NODE_ENV'] === 'production';
  const settingsQuery = useSettingsMap({ scope: 'all' });

  const backupsQuery = useDatabaseBackups(activeTab);
  const data = useMemo(() => backupsQuery.data ?? [], [backupsQuery.data]);

  const createBackup = useCreateBackupMutation();
  const restoreBackup = useRestoreBackupMutation();
  const uploadBackup = useUploadBackupMutation();
  const deleteBackup = useDeleteBackupMutation();

  const operationControls = useMemo(() => {
    const raw = settingsQuery.data?.get(DATABASE_ENGINE_OPERATION_CONTROLS_KEY);
    return normalizeDatabaseEngineOperationControls(
      raw ?? DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
    );
  }, [settingsQuery.data]);

  const backupRunNowAllowed = operationControls.allowManualBackupRunNow;
  const backupMaintenanceAllowed = operationControls.allowManualBackupMaintenance;

  const openLogModal = useCallback((content: string): void => {
    setLogModalContent(content);
    setIsLogModalOpen(true);
  }, []);

  const closeLogModal = useCallback((): void => {
    setIsLogModalOpen(false);
    setLogModalContent('');
    void queryClient.invalidateQueries({ queryKey: dbKeys.backups(activeTab) });
  }, [queryClient, dbKeys, activeTab]);

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
      const log = payload.log ?? 'No log available.';

      if (ok) {
        openLogModal(
          `${payload.message ?? 'Backup restored successfully.'}

---LOG---
${log}`
        );
      } else {
        const meta = [
          payload.errorId ? `Error ID: ${payload.errorId}` : null,
          payload.stage ? `Stage: ${payload.stage}` : null,
          payload.backupName ? `Backup: ${payload.backupName}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        openLogModal(
          `${payload.error ?? 'Failed to restore backup.'}${meta ? `

${meta}` : ''}

---LOG---
${log}`
        );
      }
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'DatabaseBackupsPanel', action: 'restoreBackup', backupName, dbType: activeTab },
      });
      openLogModal(`An error occurred during restoration.

${String(error)}`);
    }
  };

  const handleBackup = async (): Promise<void> => {
    try {
      const result = await createBackup.mutateAsync(activeTab);
      const { ok, payload } = result;
      const log = payload.log ?? 'No log available.';
      if (ok) {
        if (payload.jobId) {
          toast(payload.message ?? `Database backup job queued (job: ${payload.jobId}).`, {
            variant: 'success',
          });
          return;
        }

        if (payload.warning) {
          openLogModal(`${payload.message ?? 'Backup created'}: ${payload.warning}

---LOG---
${log}`);
        } else {
          openLogModal(`${payload.message ?? 'Backup created successfully.'}

---LOG---
${log}`);
        }
      } else {
        openLogModal(`${payload.error ?? 'Failed to create backup.'}

---LOG---
${log}`);
      }
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'DatabaseBackupsPanel', action: 'createBackup', dbType: activeTab },
      });
      openLogModal(`An error occurred during backup.

${String(error)}`);
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
        toast('Backup deleted successfully.', { variant: 'success' });
      } else {
        toast('Failed to delete backup.', { variant: 'error' });
      }
    } catch (error: unknown) {
      logClientError(error, {
        context: {
          source: 'DatabaseBackupsPanel',
          action: 'deleteBackup',
          backupName: backupToDelete,
          dbType: activeTab,
        },
      });
      toast('An error occurred during deletion.', { variant: 'error' });
    } finally {
      setBackupToDelete(null);
    }
  };

  const handleUpload = async (files: File[], helpers?: FileUploadHelpers): Promise<void> => {
    const file = files[0];
    if (!file) return;

    try {
      const result = await uploadBackup.mutateAsync({
        dbType: activeTab,
        file,
        onProgress: (loaded: number, total?: number) => helpers?.reportProgress(loaded, total),
      });
      if (result.ok) {
        toast('Backup uploaded successfully.', { variant: 'success' });
      } else {
        toast('Failed to upload backup.', { variant: 'error' });
      }
    } catch (error: unknown) {
      logClientError(error, {
        context: {
          source: 'DatabaseBackupsPanel',
          action: 'uploadBackup',
          filename: file.name,
          dbType: activeTab,
        },
      });
      toast('An error occurred during upload.', { variant: 'error' });
    }
  };

  const handlePreview = (backupName: string): void => {
    const url = `/admin/databases/preview?backup=${encodeURIComponent(backupName)}&type=${activeTab}`;
    window.location.assign(url);
  };

  const handlePreviewCurrent = (): void => {
    window.location.assign(`/admin/databases/preview?mode=current&type=${activeTab}`);
  };

  return {
    activeTab,
    setActiveTab,
    isLogModalOpen,
    logModalContent,
    isRestoreModalOpen,
    selectedBackupForRestore,
    backupToDelete,
    setBackupToDelete,
    setIsRestoreModalOpen,
    setSelectedBackupForRestore,
    data,
    isLoading: backupsQuery.isFetching,
    isProd,
    backupRunNowAllowed,
    backupMaintenanceAllowed,
    closeLogModal,
    handleBackup,
    handleUpload,
    handleRestoreRequest,
    handleRestoreConfirm,
    handleDeleteRequest,
    handleConfirmDelete,
    handlePreview,
    handlePreviewCurrent,
  };
}
