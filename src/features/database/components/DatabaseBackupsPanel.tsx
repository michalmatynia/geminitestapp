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
import {
  Button,
  ConfirmDialog,
  DataTable,
  FileUploadButton,
  SectionPanel,
  type FileUploadHelpers,
  useToast,
} from '@/shared/ui';

import { getDatabaseColumns } from './DatabaseColumns';
import { LogModal } from './LogModal';
import { RestoreModal } from './RestoreModal';
import {
  useCreateBackupMutation,
  useDatabaseBackups,
  useDeleteBackupMutation,
  useRestoreBackupMutation,
  useUploadBackupMutation,
} from '../hooks/useDatabaseQueries';

import type { DatabaseInfo, DatabaseType } from '../types';

export function DatabaseBackupsPanel(): React.JSX.Element {
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
  const data = backupsQuery.data ?? [];

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
          `${payload.message ?? 'Backup restored successfully.'}\n\n---LOG---\n${log}`
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
          `${payload.error ?? 'Failed to restore backup.'}${meta ? `\n\n${meta}` : ''}\n\n---LOG---\n${log}`
        );
      }
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'DatabaseBackupsPanel', action: 'restoreBackup', backupName, dbType: activeTab },
      });
      openLogModal(`An error occurred during restoration.\n\n${String(error)}`);
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
          openLogModal(`${payload.message ?? 'Backup created'}: ${payload.warning}\n\n---LOG---\n${log}`);
        } else {
          openLogModal(`${payload.message ?? 'Backup created successfully.'}\n\n---LOG---\n${log}`);
        }
      } else {
        openLogModal(`${payload.error ?? 'Failed to create backup.'}\n\n---LOG---\n${log}`);
      }
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'DatabaseBackupsPanel', action: 'createBackup', dbType: activeTab },
      });
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

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Button
            variant={activeTab === 'postgresql' ? 'default' : 'outline'}
            size='sm'
            onClick={(): void => setActiveTab('postgresql')}
          >
            PostgreSQL
          </Button>
          <Button
            variant={activeTab === 'mongodb' ? 'default' : 'outline'}
            size='sm'
            onClick={(): void => setActiveTab('mongodb')}
          >
            MongoDB
          </Button>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button
            disabled={isProd || !backupRunNowAllowed}
            title={
              isProd
                ? 'Disabled in production'
                : !backupRunNowAllowed
                  ? 'Disabled by Database Engine operation controls'
                  : undefined
            }
            onClick={(): void => {
              void handleBackup();
            }}
          >
            Create Backup
          </Button>
          <FileUploadButton
            onFilesSelected={(files: File[], helpers?: FileUploadHelpers) => handleUpload(files, helpers)}
            accept={activeTab === 'postgresql' ? '.dump' : '.archive'}
            disabled={isProd || !backupMaintenanceAllowed}
            title={
              isProd
                ? 'Disabled in production'
                : !backupMaintenanceAllowed
                  ? 'Disabled by Database Engine operation controls'
                  : undefined
            }
          >
            Upload Backup
          </FileUploadButton>
          <Button variant='secondary' onClick={handlePreviewCurrent}>
            Preview Current DB
          </Button>
        </div>
      </div>

      {isLogModalOpen && <LogModal content={logModalContent} onClose={closeLogModal} />}

      {isRestoreModalOpen && selectedBackupForRestore && (
        <RestoreModal
          backupName={selectedBackupForRestore}
          onClose={(): void => {
            setIsRestoreModalOpen(false);
            setSelectedBackupForRestore(null);
          }}
          onConfirm={(truncate: boolean): void => {
            void handleRestoreConfirm(truncate);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(backupToDelete)}
        onOpenChange={(open: boolean) => !open && setBackupToDelete(null)}
        onConfirm={(): void => {
          void handleConfirmDelete();
        }}
        title='Delete Backup'
        description={`Are you sure you want to delete backup "${backupToDelete}"? This cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
      />

      {isProd ? (
        <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100'>
          Backups are disabled in production. Create or upload backups in a non-production environment.
        </div>
      ) : null}
      {!backupRunNowAllowed || !backupMaintenanceAllowed ? (
        <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100'>
          Some backup actions are disabled by Database Engine manual operation controls.
        </div>
      ) : null}

      <SectionPanel className='p-6'>
        <DataTable
          columns={getDatabaseColumns({
            onPreview: handlePreview,
            onRestoreRequest: handleRestoreRequest,
            onDeleteRequest: (name: string): void => {
              handleDeleteRequest(name);
            },
            disableRestore: !backupMaintenanceAllowed,
            disableDelete: !backupMaintenanceAllowed,
            restoreDisabledReason: 'Disabled by Database Engine operation controls',
            deleteDisabledReason: 'Disabled by Database Engine operation controls',
          })}
          data={data}
          initialSorting={[{ id: 'lastModifiedAt', desc: true }]}
          sortingStorageKey={`stardb:database-backups:${activeTab}:sorting`}
          isLoading={backupsQuery.isFetching}
        />
      </SectionPanel>
    </div>
  );
}
