'use client';

import { startTransition } from 'react';
import { useRouter } from 'nextjs-toploader/app';

import { AdminDatabasePageLayout } from '@/shared/ui/admin.public';
import { Alert, Button } from '@/shared/ui/primitives.public';
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

type DatabaseBackupsState = ReturnType<typeof useDatabaseBackupsStateContext>;
type DatabaseBackupsActions = ReturnType<typeof useDatabaseBackupsActionsContext>;
type DatabaseColumnDefs = ReturnType<typeof useDatabaseColumns>;

type DatabaseHeaderActionsProps = {
  isProd: boolean;
  handleBackup: () => Promise<void>;
  handleBackupAll: () => Promise<void>;
  isBackingUpAll: boolean;
  handleUpload: (files: File[], helpers?: FileUploadHelpers) => Promise<void>;
  handlePreviewCurrent: () => void;
  router: ReturnType<typeof useRouter>;
};

type DatabaseRestoreSectionProps = {
  isRestoreModalOpen: boolean;
  selectedBackupForRestore: string | null;
  setIsRestoreModalOpen: (v: boolean) => void;
  setSelectedBackupForRestore: (v: string | null) => void;
  handleRestoreConfirm: (t: boolean) => Promise<void>;
};

type DatabasesContentLayoutProps = {
  isProd: boolean;
  router: ReturnType<typeof useRouter>;
  columns: DatabaseColumnDefs;
  state: DatabaseBackupsState;
  actions: DatabaseBackupsActions;
};

const DatabaseHeaderActions = ({
  isProd,
  handleBackup,
  handleBackupAll,
  isBackingUpAll,
  handleUpload,
  handlePreviewCurrent,
  router,
}: DatabaseHeaderActionsProps): React.JSX.Element => (
  <>
    <Button
      disabled={isProd}
      title={isProd ? 'Disabled in production' : undefined}
      onClick={() => {
        handleBackup().catch(() => {});
      }}
    >
      Create Backup
    </Button>
    <Button
      disabled={isProd || isBackingUpAll}
      loading={isBackingUpAll}
      title={isProd ? 'Disabled in production' : undefined}
      onClick={() => {
        handleBackupAll().catch(() => {});
      }}
    >
      Backup All
    </Button>
    <FileUploadButton
      id='database-backup-upload'
      onFilesSelected={(files: File[], helpers?: FileUploadHelpers) => {
        handleUpload(files, helpers).catch(() => {});
      }}
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
      onClick={() => {
        startTransition(() => {
          router.push('/admin/databases/operations');
        });
      }}
    >
      Database Operations
    </Button>
    <Button
      variant='outline'
      onClick={() => {
        startTransition(() => {
          router.push('/admin/databases/engine');
        });
      }}
    >
      Database Engine
    </Button>
  </>
);

const DatabaseRestoreSection = ({
  isRestoreModalOpen,
  selectedBackupForRestore,
  setIsRestoreModalOpen,
  setSelectedBackupForRestore,
  handleRestoreConfirm,
}: DatabaseRestoreSectionProps): React.JSX.Element | null => {
  if (!isRestoreModalOpen || selectedBackupForRestore === null) return null;

  return (
    <RestoreModal
      isOpen={true}
      backupName={selectedBackupForRestore}
      onClose={(): void => {
        setIsRestoreModalOpen(false);
        setSelectedBackupForRestore(null);
      }}
      onConfirm={(t: boolean): void => {
        handleRestoreConfirm(t).catch(() => {});
      }}
    />
  );
};

const DatabasesProductionWarning = (): React.JSX.Element => (
  <Alert variant='warning' className='mb-6'>
    Backups are disabled in production. Create or upload backups in a non-production environment.
  </Alert>
);

const DatabasesModalStack = ({
  state,
  actions,
}: {
  state: DatabaseBackupsState;
  actions: DatabaseBackupsActions;
}): React.JSX.Element => (
  <>
    {state.isLogModalOpen && <LogModal isOpen={true} item={state.logModalContent} onClose={actions.closeLogModal} />}
    <DatabaseRestoreSection
      isRestoreModalOpen={state.isRestoreModalOpen}
      selectedBackupForRestore={state.selectedBackupForRestore}
      setIsRestoreModalOpen={actions.setIsRestoreModalOpen}
      setSelectedBackupForRestore={actions.setSelectedBackupForRestore}
      handleRestoreConfirm={actions.handleRestoreConfirm}
    />
    <ConfirmModal
      isOpen={state.backupToDelete !== null}
      onClose={() => actions.setBackupToDelete(null)}
      onConfirm={actions.handleConfirmDelete}
      title='Delete Backup'
      message={`Are you sure you want to delete backup "${state.backupToDelete ?? ''}"? This cannot be undone.`}
      confirmText='Delete'
      isDangerous
    />
  </>
);

const DatabasesContentTable = ({
  columns,
  state,
}: {
  columns: DatabaseColumnDefs;
  state: DatabaseBackupsState;
}): React.JSX.Element => (
  <StandardDataTablePanel
    columns={columns}
    data={state.data}
    isLoading={state.isLoading}
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
        data={state.data}
        isLoading={state.isLoading}
        initialSorting={[{ id: 'lastModifiedAt', desc: true }]}
        sortingStorageKey='stardb:database-backups:mongodb:sorting'
      />
    </div>
  </StandardDataTablePanel>
);

const DatabasesContentLayout = ({
  isProd,
  router,
  columns,
  state,
  actions,
}: DatabasesContentLayoutProps): React.JSX.Element => (
  <AdminDatabasePageLayout
    title='Databases - MongoDB'
    current='Backups'
    description='MongoDB backups use mongodump/mongorestore archives in a neutral backup folder, split into geminitestapp, StudiQ, CMS Builder, ecommerce, and architecture website subfolders.'
    headerActions={
      <DatabaseHeaderActions
        isProd={isProd}
        handleBackup={actions.handleBackup}
        handleBackupAll={actions.handleBackupAll}
        isBackingUpAll={state.isBackingUpAll}
        handleUpload={actions.handleUpload}
        handlePreviewCurrent={actions.handlePreviewCurrent}
        router={router}
      />
    }
  >
    <DatabasesModalStack state={state} actions={actions} />
    {isProd && <DatabasesProductionWarning />}
    <DatabasesContentTable columns={columns} state={state} />
  </AdminDatabasePageLayout>
);

function DatabasesContentInner(): React.JSX.Element {
  const router = useRouter();
  const state = useDatabaseBackupsStateContext();
  const actions = useDatabaseBackupsActionsContext();
  const columns = useDatabaseColumns();

  return (
    <DatabasesContentLayout isProd={state.isProd} router={router} columns={columns} state={state} actions={actions} />
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
