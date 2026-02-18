'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

import { logClientError } from '@/features/observability';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  DataTable,
  Button,
  useToast,
  
  FileUploadButton,
  type FileUploadHelpers,
  PageLayout,
  Alert,
  Card,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { getDatabaseColumns } from '../components/DatabaseColumns';
import { LogModal } from '../components/LogModal';
import { RestoreModal } from '../components/RestoreModal';
import { DatabaseProvider, useDatabase } from '../context/DatabaseContext';
import {
  useDatabaseBackups,
  useCreateBackupMutation,
  useRestoreBackupMutation,
  useUploadBackupMutation,
  useDeleteBackupMutation,
} from '../hooks/useDatabaseQueries';

import type { DatabaseInfo, DatabaseType } from '../types';


function DatabasesContent(): React.JSX.Element {
  const dbKeys = QUERY_KEYS.system.databases;
  const { dbType: activeTab, setDbType: setActiveTab } = useDatabase();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalContent, setLogModalContent] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isProd = process.env['NODE_ENV'] === 'production';

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
          `${payload.error ?? 'Failed to restore backup.'}${ 
            meta ? `\n\n${meta}` : '' 
          }\n\n---LOG---\n${log}`
        );
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'DatabasesPage', action: 'restoreBackup', backupName, dbType: activeTab } });
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
          toast(
            payload.message ?? `Database backup job queued (job: ${payload.jobId}).`,
            { variant: 'success' }
          );
          return;
        }

        if (payload.warning) {
          openLogModal(
            `${payload.message ?? 'Backup created'}: ${ 
              payload.warning 
            }\n\n---LOG---\n${log}`
          );
        } else {
          openLogModal(
            `${
              payload.message ?? 'Backup created successfully.'
            }\n\n---LOG---\n${log}`
          );
        }
      } else {
        openLogModal(
          `${payload.error ?? 'Failed to create backup.'}\n\n---LOG---\n${log}`
        );
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'DatabasesPage', action: 'createBackup', dbType: activeTab } });
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
      logClientError(error, { context: { source: 'DatabasesPage', action: 'deleteBackup', backupName: backupToDelete, dbType: activeTab } });
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
      logClientError(error, { context: { source: 'DatabasesPage', action: 'uploadBackup', filename: file.name, dbType: activeTab } });
      toast('An error occurred during upload.', { variant: 'error' });
    }
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
    <PageLayout
      title={`Databases - ${activeTab === 'postgresql' ? 'PostgreSQL' : 'MongoDB'}`}
      description={
        activeTab === 'postgresql'
          ? 'PostgreSQL backups use pg_dump/pg_restore (.dump files). Restores are data-only and preserve your current schema.'
          : 'MongoDB backups use mongodump/mongorestore (.archive files). Full database dumps with BSON format.'
      }
      headerActions={
        <>
          <Button
            disabled={isProd}
            title={isProd ? 'Disabled in production' : undefined}
            onClick={(): void => {
              void handleBackup();
            }}
          >
            Create Backup
          </Button>
          <FileUploadButton
            onFilesSelected={(files: File[], helpers?: FileUploadHelpers) => handleUpload(files, helpers)}
            accept={activeTab === 'postgresql' ? '.dump' : '.archive'}
            disabled={isProd}
            title={isProd ? 'Disabled in production' : undefined}
          >
            Upload Backup
          </FileUploadButton>
          <Button variant='secondary' onClick={handlePreviewCurrent}>
            Preview Current DB
          </Button>
          <Button
            variant='outline'
            onClick={(): void => {
              window.location.assign('/admin/databases/operations');
            }}
          >
            Database Operations
          </Button>
          <Button
            variant='outline'
            onClick={(): void => {
              window.location.assign('/admin/databases/engine');
            }}
          >
            Database Engine
          </Button>
        </>
      }
      tabs={{
        activeTab: activeTab,
        onTabChange: (value: string) => setActiveTab(value as DatabaseType),
        tabsList: [
          { value: 'postgresql', label: 'PostgreSQL' },
          { value: 'mongodb', label: 'MongoDB' },
        ],
      }}
    >
      {isLogModalOpen && (
        <LogModal isOpen={true} content={logModalContent} onClose={closeLogModal} />
      )}

      {isRestoreModalOpen && selectedBackupForRestore && (
        <RestoreModal
          isOpen={true}
          backupName={selectedBackupForRestore}
          onClose={(): void => {
            setIsRestoreModalOpen(false);
            setSelectedBackupForRestore(null);
          }}
          onConfirm={(t: boolean): void => { handleRestoreConfirm(t).catch(() => {}); }}
        />
      )}

      <ConfirmModal
        isOpen={!!backupToDelete}
        onClose={() => setBackupToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Backup'
        message={`Are you sure you want to delete backup "${backupToDelete}"? This cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      {isProd && (
        <Alert variant='warning' className='mb-6'>
          Backups are disabled in production. Create or upload backups in a non-production environment.
        </Alert>
      )}
      <Card variant='glass' padding='lg'>
        <DataTable
          columns={getDatabaseColumns({
            onPreview: handlePreview,
            onRestoreRequest: handleRestoreRequest,
            onDeleteRequest: (name: string): void => { handleDeleteRequest(name); },
          })}
          data={data}
          initialSorting={[{ id: 'lastModifiedAt', desc: true }]}
          sortingStorageKey={`stardb:database-backups:${activeTab}:sorting`}
        />
      </Card>
    </PageLayout>
  );
}

export default function DatabasesPage(): React.JSX.Element {
  return (
    <DatabaseProvider>
      <DatabasesContent />
    </DatabaseProvider>
  );
}
