'use client';

import type { JSX } from 'react';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { FileUploadButton } from '@/shared/ui/forms-and-actions.public';
import { Button } from '@/shared/ui/primitives.public';
import { useDatabaseBackupsStateContext, useDatabaseBackupsActionsContext } from '../../context/DatabaseBackupsContext';
import { useDatabaseColumns } from '../DatabaseColumns';
import type { FileUploadHelpers } from '@/shared/contracts/ui/base';
import type { DatabaseInfo } from '@/shared/contracts/database';

export function BackupDataTable(): JSX.Element {
  const { data, isLoading, isProd, backupRunNowAllowed, backupMaintenanceAllowed } =
    useDatabaseBackupsStateContext();
  const { handleBackup, handleUpload } = useDatabaseBackupsActionsContext();
  const columns = useDatabaseColumns();
  const isRunBackupDisabled = isProd || !backupRunNowAllowed;
  const isUploadDisabled = isProd || !backupMaintenanceAllowed;

  const getDisabledTitle = (isDisabled: boolean): string | undefined => {
    if (!isDisabled) {
      return undefined;
    }

    if (isProd) {
      return 'Disabled in production';
    }

    return 'Disabled by Database Engine operation controls';
  };

  const runBackupTitle = getDisabledTitle(isRunBackupDisabled);
  const uploadTitle = getDisabledTitle(isUploadDisabled);

  return (
    <StandardDataTablePanel<DatabaseInfo>
      data={data}
      columns={columns}
      isLoading={isLoading}
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            disabled={isRunBackupDisabled}
            title={runBackupTitle}
            onClick={() => {
              void handleBackup().catch(() => {});
            }}
          >
            Backup All MongoDB Files
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
