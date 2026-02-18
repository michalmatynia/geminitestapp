'use client';

import {
  DatabaseIcon,
  ServerIcon,
  UploadIcon,
  EyeIcon,
  PlusIcon,
} from 'lucide-react';
import Link from 'next/link';

import {
  Badge,
  Button,
  DataTable,
  FileUploadButton,
  type FileUploadHelpers,
  Alert,
  ListPanel,
  SimpleSettingsList,
  Breadcrumbs,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { cn } from '@/shared/utils';

import { getDatabaseColumns } from './DatabaseColumns';
import { LogModal } from './LogModal';
import { RestoreModal } from './RestoreModal';
import { useDatabaseBackupsState } from '../hooks/useDatabaseBackupsState';

import type { DatabaseType } from '../types';

type BackupDatabaseOption = {
  id: string;
  value: DatabaseType;
  label: string;
  description: string;
  extension: string;
};

const BACKUP_DATABASE_OPTIONS: BackupDatabaseOption[] = [
  {
    id: 'postgresql',
    value: 'postgresql',
    label: 'PostgreSQL',
    description: 'Uses pg_dump/pg_restore data backups.',
    extension: '.dump',
  },
  {
    id: 'mongodb',
    value: 'mongodb',
    label: 'MongoDB',
    description: 'Uses mongodump/mongorestore archive backups.',
    extension: '.archive',
  },
];

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

  const selectedDatabase =
    BACKUP_DATABASE_OPTIONS.find((option) => option.value === activeTab) ??
    BACKUP_DATABASE_OPTIONS[0]!;
  const backupCountLabel = `${data.length.toLocaleString()} backup${data.length === 1 ? '' : 's'}`;

  return (
    <div className='space-y-6'>
      <ListPanel
        title='Backup Center'
        description='Create, upload, preview, restore, and delete backups with clear source selection.'
        header={
          <div className='space-y-3'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='space-y-1'>
                <h2 className='text-2xl font-bold tracking-tight text-white'>Backup Center</h2>
                <nav aria-label='Breadcrumb' className='flex flex-wrap items-center gap-1 text-xs text-gray-400'>
                  <Link href='/admin' className='transition-colors hover:text-gray-200'>
                    Admin
                  </Link>
                  <span>/</span>
                  <Link href='/admin/databases/engine' className='transition-colors hover:text-gray-200'>
                    Databases
                  </Link>
                  <span>/</span>
                  <span className='text-gray-300'>Backups</span>
                </nav>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='active' className='gap-1.5'>
                  <ServerIcon className='size-3.5' />
                  {selectedDatabase.label}
                </Badge>
                <Badge variant='outline' className='border-white/10 text-gray-300'>
                  {backupCountLabel}
                </Badge>
              </div>
            </div>
          </div>
        }
        alerts={
          <>
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
          </>
        }
        filters={
          <div className='space-y-3'>
            <SimpleSettingsList
              items={BACKUP_DATABASE_OPTIONS.map((option) => ({
                id: option.value,
                title: option.label,
                description: option.description,
                icon: (
                  <div className={cn(
                    'rounded-md border p-2',
                    activeTab === option.value ? 'border-emerald-400/40 bg-emerald-500/20' : 'border-white/10 bg-white/5'
                  )}>
                    <DatabaseIcon className={cn('size-4', activeTab === option.value ? 'text-emerald-200' : 'text-gray-400')} />
                  </div>
                ),
                subtitle: `Expected format: ${option.extension}`,
                original: option
              }))}
              selectedId={activeTab}
              onSelect={(item) => setActiveTab(item.original.value)}
              columns={2}
              padding='md'
            />

            <div className='rounded-lg border border-border/60 bg-card/20 px-3 py-2 text-xs text-gray-300'>
              Active source: <span className='font-semibold text-white'>{selectedDatabase.label}</span>
            </div>
          </div>
        }
        actions={
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
              <PlusIcon className='mr-2 size-3.5' />
              Create Backup
            </Button>
            <FileUploadButton
              size='sm'
              variant='outline'
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
              <UploadIcon className='mr-2 size-3.5' />
              Upload Backup
            </FileUploadButton>
            <Button size='sm' variant='secondary' onClick={handlePreviewCurrent}>
              <EyeIcon className='mr-2 size-3.5' />
              Preview Current DB
            </Button>
          </div>
        }
      >
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
      </ListPanel>

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
    </div>
  );
}
