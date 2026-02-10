'use client';

import { AlertTriangleIcon } from 'lucide-react';

import { SectionPanel, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { CrudPanel } from './CrudPanel';
import { SqlQueryConsole } from './SqlQueryConsole';
import { DatabaseProvider, useDatabase } from '../context/DatabaseContext';

import type { DatabaseType } from '../types';

function DatabaseOperationsPanelContent(): React.JSX.Element {
  const { dbType, setDbType, tableDetails, isLoading: previewLoading } = useDatabase();
  const isProduction = process.env['NODE_ENV'] === 'production';

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <select
          value={dbType}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>): void =>
            setDbType(event.target.value as DatabaseType)
          }
          className='h-8 rounded-md border border-border bg-card px-2 text-xs text-gray-200'
        >
          <option value='postgresql'>PostgreSQL</option>
          <option value='mongodb'>MongoDB</option>
        </select>
      </div>

      {isProduction && (
        <SectionPanel className='p-4'>
          <div className='flex items-center gap-2 text-xs text-yellow-300'>
            <AlertTriangleIcon className='size-4' />
            Database operations are disabled in production environments.
          </div>
        </SectionPanel>
      )}

      <Tabs defaultValue='sql' className='w-full'>
        <TabsList className='mb-4'>
          <TabsTrigger value='sql' className='text-xs'>
            SQL Console
          </TabsTrigger>
          <TabsTrigger value='crud' className='text-xs'>
            Table Manager {tableDetails.length > 0 && `(${tableDetails.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='sql'>
          <SectionPanel className='p-5'>
            <SqlQueryConsole />
          </SectionPanel>
        </TabsContent>

        <TabsContent value='crud'>
          {previewLoading && (
            <SectionPanel className='p-5'>
              <p className='text-xs text-gray-400'>Loading table metadata...</p>
            </SectionPanel>
          )}
          {!previewLoading && tableDetails.length === 0 && (
            <SectionPanel className='p-5'>
              <p className='text-xs text-gray-500'>
                {dbType === 'mongodb'
                  ? 'Table metadata is not available for MongoDB. Use the SQL Console tab for MongoDB operations.'
                  : 'No tables found in the database.'}
              </p>
            </SectionPanel>
          )}
          {!previewLoading && tableDetails.length > 0 && <CrudPanel />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DatabaseOperationsPanel(): React.JSX.Element {
  return (
    <DatabaseProvider>
      <DatabaseOperationsPanelContent />
    </DatabaseProvider>
  );
}
