'use client';

import { DatabaseIcon, ServerIcon, UploadIcon, EyeIcon, PlusIcon } from 'lucide-react';

import type { DatabaseType } from '@/shared/contracts/database';
import {
  AdminDatabaseBreadcrumbs,
  Badge,
  Button,
  FileUploadButton,
  type FileUploadHelpers,
  Alert,
  SimpleSettingsList,
  StandardDataTablePanel,
  Card,
  ToggleRow,
  FormField,
  Input,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { cn } from '@/shared/utils';

import { getDatabaseColumns } from './DatabaseColumns';
import { LogModal } from './LogModal';
import { RestoreModal } from './RestoreModal';
import {
  DatabaseBackupsProvider,
  useDatabaseBackupsActionsContext,
  useDatabaseBackupsStateContext,
} from '../context/DatabaseBackupsContext';

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

function DatabaseBackupsPanelInner(): React.JSX.Element {
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
    backupRunNowAllowed,
    backupMaintenanceAllowed,
    schedulerEnabled,
    repeatSchedulerTickEnabled,
    schedulerEnabledDraft,
    repeatTickEnabledDraft,
    activeTargetEnabledDraft,
    activeTargetTimeLocalDraft,
    activeTargetTimeLocalDraftValid,
    isBackupScheduleDirty,
    activeTargetKey,
    isBackupScheduleSaving,
    settingsValidationErrors,
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
    handleSchedulerEnabledDraftChange,
    handleRepeatSchedulerTickDraftChange,
    handleActiveTargetEnabledDraftChange,
    handleActiveTargetTimeLocalChange,
    saveDailySchedule,
  } = useDatabaseBackupsActionsContext();

  const selectedDatabase =
    BACKUP_DATABASE_OPTIONS.find((option) => option.value === activeTab) ??
    BACKUP_DATABASE_OPTIONS[0]!;
  const backupCountLabel = `${data.length.toLocaleString()} backup${data.length === 1 ? '' : 's'}`;

  const header = (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h2 className='text-2xl font-bold tracking-tight text-white'>Backup Center</h2>
          <AdminDatabaseBreadcrumbs current='Backups' />
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
  );

  const alerts = (
    <>
      {isProd && (
        <Alert variant='warning'>
          Backups are disabled in production. Create or upload backups in a non-production
          environment.
        </Alert>
      )}

      {(!backupRunNowAllowed || !backupMaintenanceAllowed) && (
        <Alert variant='warning'>
          Some backup actions are disabled by Database Engine manual operation controls.
        </Alert>
      )}

      {settingsValidationErrors.length > 0 && (
        <Alert variant='error'>{settingsValidationErrors[0]}</Alert>
      )}
    </>
  );

  const filters = (
    <div className='space-y-3'>
      <SimpleSettingsList
        items={BACKUP_DATABASE_OPTIONS.map((option) => ({
          id: option.value,
          title: option.label,
          description: option.description,
          icon: (
            <div
              className={cn(
                'rounded-md border p-2',
                activeTab === option.value
                  ? 'border-emerald-400/40 bg-emerald-500/20'
                  : 'border-white/10 bg-white/5'
              )}
            >
              <DatabaseIcon
                className={cn(
                  'size-4',
                  activeTab === option.value ? 'text-emerald-200' : 'text-gray-400'
                )}
              />
            </div>
          ),
          subtitle: `Expected format: ${option.extension}`,
          original: option,
        }))}
        selectedId={activeTab}
        onSelect={(item) => setActiveTab(item.original.value)}
        columns={2}
        padding='md'
      />

      <Card
        variant='subtle-compact'
        padding='sm'
        className='border-border/60 bg-card/20 text-xs text-gray-300'
      >
        Active source: <span className='font-semibold text-white'>{selectedDatabase.label}</span>
      </Card>

      <div className='space-y-2'>
        <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
          Backup Scheduling Options
        </p>
        <ToggleRow
          variant='switch'
          label='Enable Scheduled Backups'
          description='Global scheduler switch for all backup targets.'
          checked={schedulerEnabledDraft}
          disabled={isBackupScheduleSaving || settingsValidationErrors.length > 0}
          onCheckedChange={handleSchedulerEnabledDraftChange}
          className='border-border/60 bg-card/20'
        />
        <ToggleRow
          variant='switch'
          label='Enable schedule for selected source'
          description={`Applies to ${selectedDatabase.label} only.`}
          checked={activeTargetEnabledDraft}
          disabled={
            isBackupScheduleSaving || !schedulerEnabledDraft || settingsValidationErrors.length > 0
          }
          onCheckedChange={handleActiveTargetEnabledDraftChange}
          className='border-border/60 bg-card/20'
        />
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/20'>
          <FormField
            label='Daily Run Time (Server Local)'
            description='Time is entered as server-local time and stored as UTC.'
          >
            <Input
              type='time'
              size='sm'
              value={activeTargetTimeLocalDraft}
              onChange={(event) => {
                handleActiveTargetTimeLocalChange(event.target.value);
              }}
              disabled={
                isBackupScheduleSaving ||
                !schedulerEnabledDraft ||
                !activeTargetEnabledDraft ||
                settingsValidationErrors.length > 0
              }
            />
          </FormField>
        </Card>
        <ToggleRow
          variant='switch'
          label='Enable Repeating Due-Checks'
          description='When disabled, scheduler checks run only on startup catch-up and manual tick.'
          checked={repeatTickEnabledDraft}
          disabled={isBackupScheduleSaving || settingsValidationErrors.length > 0}
          onCheckedChange={handleRepeatSchedulerTickDraftChange}
          className='border-border/60 bg-card/20'
        />
        <Card
          variant='subtle-compact'
          padding='sm'
          className='border-border/60 bg-card/20 text-[11px] text-gray-300'
        >
          If app starts after missed scheduled time, one catch-up run is queued in background.
        </Card>
        {!activeTargetTimeLocalDraftValid && (
          <Alert variant='warning'>Enter a valid time in HH:MM format.</Alert>
        )}
        {!schedulerEnabledDraft && (
          <Alert variant='warning'>Scheduled backups are currently disabled.</Alert>
        )}
        <Card
          variant='subtle-compact'
          padding='sm'
          className='border-border/60 bg-card/20 text-[11px] text-gray-300'
        >
          Changes apply only to the selected source tab ({activeTargetKey}).
        </Card>
        <Button
          size='sm'
          variant='secondary'
          disabled={
            isBackupScheduleSaving ||
            !isBackupScheduleDirty ||
            !activeTargetTimeLocalDraftValid ||
            settingsValidationErrors.length > 0
          }
          onClick={(): void => {
            void saveDailySchedule();
          }}
        >
          {isBackupScheduleSaving ? 'Saving Schedule...' : 'Save Schedule'}
        </Button>
        {(schedulerEnabled !== schedulerEnabledDraft ||
          repeatSchedulerTickEnabled !== repeatTickEnabledDraft) && (
          <Alert variant='info'>Save schedule changes to apply the latest scheduler toggles.</Alert>
        )}
      </div>
    </div>
  );

  const actions = (
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
        onFilesSelected={(files: File[], helpers?: FileUploadHelpers) =>
          handleUpload(files, helpers)
        }
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
  );

  return (
    <div className='space-y-6'>
      <StandardDataTablePanel
        header={header}
        alerts={alerts}
        filters={filters}
        actions={actions}
        columns={getDatabaseColumns()}
        data={data}
        isLoading={isLoading}
        maxHeight='60vh'
        stickyHeader
      />

      {isLogModalOpen && <LogModal isOpen={true} item={logModalContent} onClose={closeLogModal} />}

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

export function DatabaseBackupsPanel(): React.JSX.Element {
  return (
    <DatabaseBackupsProvider>
      <DatabaseBackupsPanelInner />
    </DatabaseBackupsProvider>
  );
}
