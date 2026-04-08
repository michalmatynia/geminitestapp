'use client';

import { useRouter } from 'nextjs-toploader/app';

import { AdminDatabasePageLayout } from '@/shared/ui/admin.public';
import { Button, Alert } from '@/shared/ui/primitives.public';
import { FileUploadButton } from '@/shared/ui/forms-and-actions.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { DataTable } from '@/shared/ui/data-display.public';
import type { FileUploadHelpers } from '@/shared/contracts/ui/base';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { useDatabaseColumns } from '../components/DatabaseColumns';
import { DatabaseMobileCards } from '../components/DatabaseMobileCards';
import { LogModal } from '../components/LogModal';
import { RestoreModal } from '../components/RestoreModal';
import {
  DatabaseBackupsProvider,
  useDatabaseBackupsActionsContext,
  useDatabaseBackupsStateContext,
} from '../context/DatabaseBackupsContext';
import { DatabaseProvider } from '../context/DatabaseContext';
import { startTransition } from 'react';

function DatabasesContentInner(): React.JSX.Element {
  const router = useRouter();
  const {
    isLogModalOpen,
    logModalContent,
    isRestoreModalOpen,
    selectedBackupForRestore,
    backupToDelete,
    data,
    isLoading,
    isProd,
  } = useDatabaseBackupsStateContext();
  const {
    setBackupToDelete,
    setIsRestoreModalOpen,
    setSelectedBackupForRestore,
    closeLogModal,
    handleBackup,
    handleUpload,
    handleRestoreConfirm,
    handleConfirmDelete,
    handlePreviewCurrent,
  } = useDatabaseBackupsActionsContext();
  const columns = useDatabaseColumns();

  return (
    <AdminDatabasePageLayout
      title='Databases - MongoDB'
      current='Backups'
      description='MongoDB backups use mongodump/mongorestore archive files and preserve the full document database.'
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
            onFilesSelected={(files: File[], helpers?: FileUploadHelpers) =>
              handleUpload(files, helpers)
            }
            accept='.archive'
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
              startTransition(() => { router.push('/admin/databases/engine?view=operations'); });
            }}
          >
            Database Operations
          </Button>
          <Button
            variant='outline'
            onClick={(): void => {
              startTransition(() => { router.push('/admin/databases/engine'); });
            }}
          >
            Database Engine
          </Button>
        </>
      }
    >
      {isLogModalOpen && <LogModal isOpen={true} item={logModalContent} onClose={closeLogModal} />}

      {isRestoreModalOpen && selectedBackupForRestore && (
        <RestoreModal
          isOpen={true}
          backupName={selectedBackupForRestore}
          onClose={(): void => {
            setIsRestoreModalOpen(false);
            setSelectedBackupForRestore(null);
          }}
          onConfirm={(t: boolean): void => {
            void handleRestoreConfirm(t).catch(() => {});
          }}
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
          Backups are disabled in production. Create or upload backups in a non-production
          environment.
        </Alert>
      )}

      <StandardDataTablePanel
        columns={columns}
        data={data}
        isLoading={isLoading}
        initialSorting={[{ id: 'lastModifiedAt', desc: true }]}
        sortingStorageKey='stardb:database-backups:mongodb:sorting'
        variant='flat'
        showTable={false}
      >
        <div className='md:hidden px-4 pb-4'>
          <DatabaseMobileCards />
        </div>
        <div className='hidden md:block'>
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            initialSorting={[{ id: 'lastModifiedAt', desc: true }]}
            sortingStorageKey='stardb:database-backups:mongodb:sorting'
          />
        </div>
      </StandardDataTablePanel>
    </AdminDatabasePageLayout>
  );
}

function DatabasesContent(): React.JSX.Element {
  return (
    <DatabaseBackupsProvider>
      <DatabasesContentInner />
    </DatabaseBackupsProvider>
  );
}

export default function DatabasesPage(): React.JSX.Element {
  return (
    <DatabaseProvider>
      <DatabasesContent />
    </DatabaseProvider>
  );
}
