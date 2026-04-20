'use client';

import type { JSX } from 'react';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { useDatabaseBackupsStateContext, useDatabaseBackupsActionsContext } from '../../context/DatabaseBackupsContext';
import { useDatabaseColumns } from '../DatabaseColumns';

export function BackupDataTable(): JSX.Element {
  const { data, isLoading } = useDatabaseBackupsStateContext();
  const { handleBackup, handleUpload, handlePreviewCurrent } = useDatabaseBackupsActionsContext();
  const columns = useDatabaseColumns();

  return (
    <StandardDataTablePanel
      data={data}
      columns={columns}
      isLoading={isLoading}
      onRefresh={handlePreviewCurrent}
      toolbarActions={[
        { label: 'Run Backup', onClick: handleBackup },
        { label: 'Upload', onClick: handleUpload },
      ]}
    />
  );
}
