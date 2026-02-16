'use client';

import {
  Button,
  DataTable,
  FileUploadButton,
  type FileUploadHelpers,
  Alert,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { getDatabaseColumns } from './DatabaseColumns';
import { LogModal } from './LogModal';
import { RestoreModal } from './RestoreModal';
import { useDatabaseBackupsState } from '../hooks/useDatabaseBackupsState';

export function DatabaseBackupsPanel(): React.JSX.Element {
  const {
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
    isLoading,
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
  } = useDatabaseBackupsState();

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
            size='sm'
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
            size='sm'
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
          <Button size='sm' variant='secondary' onClick={handlePreviewCurrent}>
            Preview Current DB
          </Button>
        </div>
      </div>

      {isLogModalOpen && <LogModal isOpen={true} content={logModalContent} onClose={closeLogModal} />}

      {isRestoreModalOpen && selectedBackupForRestore && (
        <RestoreModal
          isOpen={true}
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

      <ConfirmModal
        isOpen={Boolean(backupToDelete)}
        onClose={() => setBackupToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Backup'
        message={`Are you sure you want to delete backup "${backupToDelete}"? This cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      {isProd && (
        <Alert variant='warning'>
          Backups are disabled in production. Create or upload backups in a non-production environment.
        </Alert>
      )}
      
      {(!backupRunNowAllowed || !backupMaintenanceAllowed) && (
        <Alert variant='warning'>
          Some backup actions are disabled by Database Engine manual operation controls.
        </Alert>
      )}

      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
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
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
