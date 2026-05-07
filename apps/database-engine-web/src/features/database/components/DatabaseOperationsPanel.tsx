'use client';

import { AlertTriangleIcon, DatabaseIcon } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';
import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseType,
  MongoSource,
} from '@/shared/contracts/database';
import { AdminDatabaseBreadcrumbs } from '@/shared/ui/admin.public';
import { Alert, Badge, Button } from '@/shared/ui/primitives.public';
import { ListPanel } from '@/shared/ui/navigation-and-layout.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';
import {
  DatabaseOperationsTabs,
  type DatabaseOperationsTab,
} from './DatabaseOperationsTabs';
import { DatabaseProvider, useDatabaseConfig, useDatabaseData } from '../context/DatabaseContext';

const DATABASE_OPTIONS: Array<LabeledOptionWithDescriptionDto<DatabaseType>> = [
  {
    value: 'mongodb',
    label: 'MongoDB',
    description: 'Use the command console for MongoDB-backed operations.',
  },
];

const MANAGED_LOCAL_DATABASE_OPTIONS: Array<{
  application: DatabaseEngineManagedMongoApplication;
  label: string;
}> = [
  { application: 'geminitestapp', label: 'GeminiTest App' },
  { application: 'studiq', label: 'StudiQ' },
  { application: 'cms-builder', label: 'CMS Builder' },
  { application: 'products', label: 'Products' },
];

const buildCrudHref = (application: DatabaseEngineManagedMongoApplication): string =>
  `/admin/databases/engine?view=crud&application=${encodeURIComponent(application)}&source=local`;

function DatabaseOperationsPanelContent({
  defaultTab,
  application,
  source,
}: {
  defaultTab: DatabaseOperationsTab;
  application?: DatabaseEngineManagedMongoApplication | undefined;
  source?: MongoSource | undefined;
}): JSX.Element {
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
                {application ? (
                  <Badge variant='outline' className='border-white/10 text-gray-300'>
                    {application} / {source ?? 'local'}
                  </Badge>
                ) : null}
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
        <div className='space-y-3'>
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
          <div className='flex flex-wrap gap-2'>
            {MANAGED_LOCAL_DATABASE_OPTIONS.map((option) => (
              <Button
                key={option.application}
                asChild
                variant={application === option.application ? 'secondary' : 'outline'}
                size='xs'
              >
                <Link href={buildCrudHref(option.application)}>{option.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      }
    >
      <DatabaseOperationsTabs defaultTab={defaultTab} />
    </ListPanel>
  );
}

export function DatabaseOperationsPanel({
  defaultTab = 'sql',
  application,
  source,
}: {
  defaultTab?: DatabaseOperationsTab;
  application?: DatabaseEngineManagedMongoApplication | undefined;
  source?: MongoSource | undefined;
}): JSX.Element {
  return (
    <DatabaseProvider application={application} source={source}>
      <DatabaseOperationsPanelContent
        defaultTab={defaultTab}
        application={application}
        source={source}
      />
    </DatabaseProvider>
  );
}
