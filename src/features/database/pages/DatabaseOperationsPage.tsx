'use client';

import { AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';

import type { DatabaseType } from '@/shared/contracts/database';
import {
  AdminDatabasePageLayout,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  FormSection,
  SelectSimple,
  EmptyState,
  Card,
  LoadingState,
} from '@/shared/ui';

import { CrudPanel } from '../components/CrudPanel';
import { SqlQueryConsole } from '../components/SqlQueryConsole';
import { DatabaseProvider, useDatabaseConfig, useDatabaseData } from '../context/DatabaseContext';

function DatabaseOperationsContent(): React.JSX.Element {
  const { dbType, setDbType } = useDatabaseConfig();
  const { tableDetails, isLoading: previewLoading } = useDatabaseData();
  const isProduction = process.env['NODE_ENV'] === 'production';

  return (
    <AdminDatabasePageLayout
      title='Database Operations'
      current='Operations'
      description='Execute SQL queries and manage table data directly.'
      headerActions={
        <div className='flex items-center gap-2'>
          <SelectSimple
            size='sm'
            value={dbType}
            onValueChange={(value: string): void => setDbType(value as DatabaseType)}
            options={[
              { value: 'postgresql', label: 'PostgreSQL' },
              { value: 'mongodb', label: 'MongoDB' },
            ]}
            triggerClassName='h-8 text-xs w-[120px]'
          />
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/databases/engine'>Back to Databases</Link>
          </Button>
        </div>
      }
    >
      {isProduction && (
        <Card variant='warning' padding='md' className='mb-6 flex items-center gap-2 text-xs'>
          <AlertTriangleIcon className='size-4' />
          Database operations are disabled in production environments.
        </Card>
      )}

      <Tabs defaultValue='sql' className='w-full'>
        <TabsList className='mb-4' aria-label='Database workspace tabs'>
          <TabsTrigger value='sql' className='text-xs'>
            SQL Console
          </TabsTrigger>
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
          {previewLoading && <LoadingState message='Loading table metadata...' className='py-12' />}
          {!previewLoading && tableDetails.length === 0 && (
            <EmptyState
              title='No tables found'
              description={
                dbType === 'mongodb'
                  ? 'Table metadata is not available for MongoDB. Use the SQL Console tab for MongoDB operations.'
                  : 'No tables found in the database.'
              }
            />
          )}
          {!previewLoading && tableDetails.length > 0 && <CrudPanel />}
        </TabsContent>
      </Tabs>
    </AdminDatabasePageLayout>
  );
}

export default function DatabaseOperationsPage(): React.JSX.Element {
  return (
    <DatabaseProvider>
      <DatabaseOperationsContent />
    </DatabaseProvider>
  );
}
