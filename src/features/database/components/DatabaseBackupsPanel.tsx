'use client';

import { ServerIcon } from 'lucide-react';
import type { JSX } from 'react';
import { Badge } from '@/shared/ui/primitives.public';
import { AdminDatabaseBreadcrumbs } from '@/shared/ui/admin.public';
import { 
  DatabaseBackupsProvider, 
  useDatabaseBackupsStateContext 
} from '../context/DatabaseBackupsContext';
import { LogModal } from './LogModal';
import { RestoreModal } from './RestoreModal';
import { BackupDataTable } from './backups/BackupDataTable';
import { BackupSchedulerSettings } from './backups/BackupSchedulerSettings';

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

      <LogModal />
      <RestoreModal />
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
