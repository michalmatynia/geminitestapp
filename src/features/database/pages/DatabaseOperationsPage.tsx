'use client';

import { AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';

import {
  PageLayout,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  FormSection,
  SelectSimple,
} from '@/shared/ui';

import { CrudPanel } from '../components/CrudPanel';
import { SqlQueryConsole } from '../components/SqlQueryConsole';
import { DatabaseProvider, useDatabase } from '../context/DatabaseContext';

import type { DatabaseType } from '../types';

function DatabaseOperationsContent(): React.JSX.Element {
  const { dbType, setDbType, tableDetails, isLoading: previewLoading } = useDatabase();
  const isProduction = process.env['NODE_ENV'] === 'production';

  return (
    <PageLayout
      title='Database Operations'
      description='Execute SQL queries and manage table data directly.'
      headerActions={
        <div className='flex items-center gap-2'>
          <SelectSimple size='sm'
            value={dbType}
            onValueChange={(value: string): void =>
              setDbType(value as DatabaseType)
            }
            options={[
              { value: 'postgresql', label: 'PostgreSQL' },
              { value: 'mongodb', label: 'MongoDB' },
            ]}
            triggerClassName='h-8 text-xs w-[120px]'
          />
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/databases'>Back to Databases</Link>
          </Button>
        </div>
      }
    >
      {isProduction && (
        <div className='mb-6 flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-xs text-yellow-300'>
          <AlertTriangleIcon className='size-4' />
          Database operations are disabled in production environments.
        </div>
      )}

      <Tabs defaultValue='sql' className='w-full'>
        <TabsList className='mb-4'>
          <TabsTrigger value='sql' className='text-xs'>SQL Console</TabsTrigger>
          <TabsTrigger value='crud' className='text-xs'>
            Table Manager {tableDetails.length > 0 && `(${tableDetails.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='sql'>
          <FormSection title='Query Console' className='p-5'>
            <SqlQueryConsole />
          </FormSection>
        </TabsContent>

        <TabsContent value='crud'>
          {previewLoading && (
            <div className='rounded-lg border border-border/60 bg-card/50 p-5'>
              <p className='text-xs text-gray-400'>Loading table metadata...</p>
            </div>
          )}
          {!previewLoading && tableDetails.length === 0 && (
            <div className='rounded-lg border border-border/60 bg-card/50 p-5'>
              <p className='text-xs text-gray-500'>
                {dbType === 'mongodb'
                  ? 'Table metadata is not available for MongoDB. Use the SQL Console tab for MongoDB operations.'
                  : 'No tables found in the database.'}
              </p>
            </div>
          )}
          {!previewLoading && tableDetails.length > 0 && (
            <CrudPanel />
          )}
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

export default function DatabaseOperationsPage(): React.JSX.Element {
  return (
    <DatabaseProvider>
      <DatabaseOperationsContent />
    </DatabaseProvider>
  );
}
