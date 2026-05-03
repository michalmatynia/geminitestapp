'use client';

import type { JSX } from 'react';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { FileUploadButton } from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';
import { useDatabaseBackupsStateContext, useDatabaseBackupsActionsContext } from '../../context/DatabaseBackupsContext';
import { useDatabaseColumns } from '../DatabaseColumns';
import type { FileUploadHelpers } from '@/shared/contracts/ui/base';

export function BackupDataTable(): JSX.Element {
  const { data, isLoading, isProd, backupRunNowAllowed, backupMaintenanceAllowed } =
    useDatabaseBackupsStateContext();
  const { handleBackup, handleUpload, handlePreviewCurrent } = useDatabaseBackupsActionsContext();
  const columns = useDatabaseColumns();
  const isRunBackupDisabled = isProd || !backupRunNowAllowed;
  const isUploadDisabled = isProd || !backupMaintenanceAllowed;

  const runBackupTitle = isRunBackupDisabled
    ? isProd
      ? 'Disabled in production'
      : 'Disabled by Database Engine operation controls'
    : undefined;
  const uploadTitle = isUploadDisabled
    ? isProd
      ? 'Disabled in production'
      : 'Disabled by Database Engine operation controls'
    : undefined;

  return (
    <StandardDataTablePanel
      data={data}
      columns={columns}
      isLoading={isLoading}
      onRefresh={handlePreviewCurrent}
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            disabled={isRunBackupDisabled}
            title={runBackupTitle}
            onClick={() => {
              void handleBackup().catch(() => {});
            }}
          >
            Run Backup
          </Button>
          <FileUploadButton
            accept='.archive'
            disabled={isUploadDisabled}
            title={uploadTitle}
            onFilesSelected={(files: File[], helpers?: FileUploadHelpers) => {
              handleUpload(files, helpers).catch(() => {});
            }}
          >
            Upload
          </FileUploadButton>
        </div>
      }
    />
  );
}
