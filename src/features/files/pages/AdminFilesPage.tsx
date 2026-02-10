'use client';

import FileManager from '@/features/files/components/FileManager';
import { PageLayout } from '@/shared/ui';

export function AdminFilesPage(): React.JSX.Element {
  return (
    <PageLayout
      title='File Manager'
      description='Manage your uploads, backups, and shared assets.'
    >
      <FileManager mode='view' />
    </PageLayout>
  );
}
