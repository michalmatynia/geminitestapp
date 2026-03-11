'use client';

import { AlertTriangleIcon, DatabaseIcon, Table2Icon, TerminalSquareIcon } from 'lucide-react';

import type { DatabaseType } from '@/shared/contracts/database';
import {
  AdminDatabaseBreadcrumbs,
  Alert,
  Badge,
  EmptyState,
  FormSection,
  ListPanel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  SimpleSettingsList,
  LoadingState,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { CrudPanel } from './CrudPanel';
import { SqlQueryConsole } from './SqlQueryConsole';
import { DatabaseProvider, useDatabaseConfig, useDatabaseData } from '../context/DatabaseContext';

const DATABASE_OPTIONS: Array<{
  value: DatabaseType;
  label: string;
  description: string;
}> = [
  {
    value: 'postgresql',
    label: 'PostgreSQL',
    description: 'Use SQL Console and table-level CRUD operations.',
  },
  {
    value: 'mongodb',
    label: 'MongoDB',
    description: 'Use SQL Console for MongoDB-compatible operations.',
  },
];

function DatabaseOperationsPanelContent(): React.JSX.Element {
  const { dbType, setDbType } = useDatabaseConfig();
  const { tableDetails, isLoading: previewLoading } = useDatabaseData();
  const isProduction = process.env['NODE_ENV'] === 'production';
  const selectedDatabase =
    DATABASE_OPTIONS.find((option) => option.value === dbType) ?? DATABASE_OPTIONS[0]!;

  return (
    <ListPanel
      header={
        <div className='space-y-3'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <h2 className='text-2xl font-bold tracking-tight text-white'>Operations Console</h2>
              <AdminDatabaseBreadcrumbs current='Operations' />
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='active' className='gap-1.5'>
                <DatabaseIcon className='size-3.5' />
                {selectedDatabase.label}
              </Badge>
              <Badge variant='outline' className='border-white/10 text-gray-300'>
                {tableDetails.length.toLocaleString()} table{tableDetails.length === 1 ? '' : 's'}
              </Badge>
            </div>
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
              <div
                className={cn(
                  'rounded-md border p-2',
                  dbType === option.value
                    ? 'border-emerald-400/40 bg-emerald-500/20'
                    : 'border-white/10 bg-white/5'
                )}
              >
                <DatabaseIcon
                  className={cn(
                    'size-4',
                    dbType === option.value ? 'text-emerald-200' : 'text-gray-400'
                  )}
                />
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
      <Tabs defaultValue='sql' className='w-full'>
        <TabsList
          className='mb-4 border border-border/60 bg-card/30'
          aria-label='Database operations tabs'
        >
          <TabsTrigger value='sql' className='gap-2 text-xs'>
            <TerminalSquareIcon className='size-3.5' />
            SQL Console
          </TabsTrigger>
          <TabsTrigger value='crud' className='gap-2 text-xs'>
            <Table2Icon className='size-3.5' />
            Table Manager {tableDetails.length > 0 && `(${tableDetails.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='sql'>
          <FormSection title='Query Console' className='p-5'>
            <SqlQueryConsole />
          </FormSection>
        </TabsContent>

        <TabsContent value='crud'>
          {previewLoading ? (
            <LoadingState
              message='Loading table metadata...'
              className='py-12 border border-border/60 bg-card/50 rounded-lg'
            />
          ) : tableDetails.length === 0 ? (
            <EmptyState
              title='No tables found'
              description={
                dbType === 'mongodb'
                  ? 'Table metadata is not available for MongoDB. Use the SQL Console tab for MongoDB operations.'
                  : 'No tables found in the database.'
              }
              icon={<Table2Icon className='size-12 opacity-20' />}
            />
          ) : (
            <CrudPanel />
          )}
        </TabsContent>
      </Tabs>
    </ListPanel>
  );
}

export function DatabaseOperationsPanel(): React.JSX.Element {
  return (
    <DatabaseProvider>
      <DatabaseOperationsPanelContent />
    </DatabaseProvider>
  );
}
