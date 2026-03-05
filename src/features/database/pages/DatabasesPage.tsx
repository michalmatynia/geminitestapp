'use client';

import {
  Button,
  FileUploadButton,
  type FileUploadHelpers,
  PageLayout,
  Alert,
  StandardDataTablePanel,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { getDatabaseColumns } from '../components/DatabaseColumns';
import { LogModal } from '../components/LogModal';
import { RestoreModal } from '../components/RestoreModal';
import {
  DatabaseBackupsProvider,
  useDatabaseBackupsActionsContext,
  useDatabaseBackupsStateContext,
} from '../context/DatabaseBackupsContext';
import { DatabaseProvider } from '../context/DatabaseContext';

import type { DatabaseType } from '@/shared/contracts/database';

function DatabasesContentInner(): React.JSX.Element {
  const {
    activeTab,
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
    setActiveTab,
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
            onFilesSelected={(files: File[], helpers?: FileUploadHelpers) =>
              handleUpload(files, helpers)
            }
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
              window.location.assign('/admin/databases/engine?view=operations');
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
        columns={getDatabaseColumns()}
        data={data}
        isLoading={isLoading}
        initialSorting={[{ id: 'lastModifiedAt', desc: true }]}
        sortingStorageKey={`stardb:database-backups:${activeTab}:sorting`}
        variant='flat'
      />
    </PageLayout>
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
