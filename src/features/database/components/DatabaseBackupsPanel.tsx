'use client';

import { ServerIcon } from 'lucide-react';
import type { JSX } from 'react';
import { Badge } from '@/shared/ui/primitives.public';
import { AdminDatabaseBreadcrumbs } from '@/shared/ui/admin.public';
import { ConfirmModal } from '@/shared/ui/templates.public';
import { 
  DatabaseBackupsProvider, 
  useDatabaseBackupsActionsContext,
  useDatabaseBackupsStateContext 
} from '../context/DatabaseBackupsContext';
import { LogModal } from './LogModal';
import { RestoreModal } from './RestoreModal';
import { BackupDataTable } from './backups/BackupDataTable';
import { BackupSchedulerSettings } from './backups/BackupSchedulerSettings';

function DatabaseBackupDialogs(): JSX.Element {
  const {
    backupToDelete,
    isLogModalOpen,
    isRestoreModalOpen,
    logModalContent,
    selectedBackupForRestore,
  } = useDatabaseBackupsStateContext();
  const {
    closeLogModal,
    handleConfirmDelete,
    handleRestoreConfirm,
    setBackupToDelete,
    setIsRestoreModalOpen,
    setSelectedBackupForRestore,
  } = useDatabaseBackupsActionsContext();

  return (
    <>
      {isLogModalOpen ? (
        <LogModal isOpen={true} item={logModalContent} onClose={closeLogModal} />
      ) : null}

      {isRestoreModalOpen && selectedBackupForRestore !== null ? (
        <RestoreModal
          isOpen={true}
          backupName={selectedBackupForRestore}
          onClose={(): void => {
            setIsRestoreModalOpen(false);
            setSelectedBackupForRestore(null);
          }}
          onConfirm={(truncate: boolean): void => {
            handleRestoreConfirm(truncate).catch(() => {});
          }}
        />
      ) : null}

      <ConfirmModal
        isOpen={backupToDelete !== null}
        onClose={(): void => setBackupToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Backup'
        message={`Are you sure you want to delete backup "${backupToDelete ?? ''}"? This cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />
    </>
  );
}

function DatabaseBackupsPanelInner(): JSX.Element {
  const { activeTab } = useDatabaseBackupsStateContext();
  
  return (
    <div className='space-y-6'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h2 className='text-2xl font-bold tracking-tight text-white'>Backup Center</h2>
          <AdminDatabaseBreadcrumbs current='Backups' />
        </div>
        <Badge variant='active' className='gap-1.5'>
          <ServerIcon className='size-3.5' />
          {activeTab}
        </Badge>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
        <div className='lg:col-span-3'>
          <BackupDataTable />
        </div>
        <div className='lg:col-span-1'>
          <BackupSchedulerSettings />
        </div>
      </div>

      <DatabaseBackupDialogs />
    </div>
  );
}

export function DatabaseBackupsPanel(): JSX.Element {
  return (
    <DatabaseBackupsProvider>
      <DatabaseBackupsPanelInner />
    </DatabaseBackupsProvider>
  );
}
