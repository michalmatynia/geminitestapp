'use client';

import { AlertTriangleIcon, DatabaseIcon } from 'lucide-react';
import type { JSX } from 'react';
import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { DatabaseType } from '@/shared/contracts/database';
import { AdminDatabaseBreadcrumbs } from '@/shared/ui/admin.public';
import { Alert, Badge } from '@/shared/ui/primitives.public';
import { ListPanel } from '@/shared/ui/navigation-and-layout.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';
import { DatabaseOperationsTabs } from './DatabaseOperationsTabs';
import { DatabaseProvider, useDatabaseConfig, useDatabaseData } from '../context/DatabaseContext';

const DATABASE_OPTIONS: Array<LabeledOptionWithDescriptionDto<DatabaseType>> = [
  {
    value: 'mongodb',
    label: 'MongoDB',
    description: 'Use the command console for MongoDB-backed operations.',
  },
];

function DatabaseOperationsPanelContent(): JSX.Element {
  const { dbType, setDbType } = useDatabaseConfig();
  const { tableDetails } = useDatabaseData();
  const isProduction = process.env['NODE_ENV'] === 'production';
  const selectedDatabase = DATABASE_OPTIONS[0];

  return (
    <ListPanel
      header={
        <div className='space-y-3'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <h2 className='text-2xl font-bold tracking-tight text-white'>Operations Console</h2>
              <AdminDatabaseBreadcrumbs current='Operations' />
            </div>
            {selectedDatabase && (
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='active' className='gap-1.5'>
                  <DatabaseIcon className='size-3.5' />
                  {selectedDatabase.label}
                </Badge>
                <Badge variant='outline' className='border-white/10 text-gray-300'>
                  {tableDetails.length.toLocaleString()} table{tableDetails.length === 1 ? '' : 's'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      }
      alerts={
        isProduction ? (
          <Alert variant='warning' className='flex items-center gap-2'>
            <AlertTriangleIcon className='size-4' />
            Database operations are disabled in production environments.
          </Alert>
        ) : null
      }
      filters={
        <SimpleSettingsList
          items={DATABASE_OPTIONS.map((option) => ({
            id: option.value,
            title: option.label,
            description: option.description,
            icon: (
              <div className='rounded-md border border-emerald-400/40 bg-emerald-500/20 p-2'>
                <DatabaseIcon className='size-4 text-emerald-200' />
              </div>
            ),
            original: option,
          }))}
          selectedId={dbType}
          onSelect={(item) => setDbType(item.original.value)}
          columns={2}
          padding='md'
        />
      }
    >
      <DatabaseOperationsTabs />
    </ListPanel>
  );
}

export function DatabaseOperationsPanel(): JSX.Element {
  return (
    <DatabaseProvider>
      <DatabaseOperationsPanelContent />
    </DatabaseProvider>
  );
}
