'use client';

import { AlertTriangleIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  AdminPageLayout,
  Button,
  SectionPanel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';

import { CrudPanel } from '../components/CrudPanel';
import { SqlQueryConsole } from '../components/SqlQueryConsole';
import { useDatabasePreview } from '../hooks/useDatabaseQueries';

import type { DatabaseTableDetail, DatabaseType } from '../types';

export default function DatabaseOperationsPage(): React.JSX.Element {
  const [dbType, setDbType] = useState<DatabaseType>('postgresql');
  const isProduction = process.env.NODE_ENV === 'production';

  // Fetch current DB metadata for the CRUD panel (table list + columns)
  const { data: previewPayload, isLoading: previewLoading } = useDatabasePreview({
    mode: 'current',
    type: dbType,
    page: 1,
    pageSize: 1,
    enabled: true,
  });

  const tableDetails: DatabaseTableDetail[] = useMemo(
    () => previewPayload?.tableDetails ?? [],
    [previewPayload?.tableDetails]
  );

  return (
    <AdminPageLayout
      title="Database Operations"
      description="Execute SQL queries and manage table data directly."
      mainActions={
        <div className="flex items-center gap-2">
          <select
            value={dbType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>): void =>
              setDbType(e.target.value as DatabaseType)
            }
            className="h-8 rounded-md border border-border bg-card px-2 text-xs text-gray-200"
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mongodb">MongoDB</option>
          </select>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/databases">Back to Databases</Link>
          </Button>
        </div>
      }
    >
      {isProduction && (
        <SectionPanel className="mb-6 p-4">
          <div className="flex items-center gap-2 text-xs text-yellow-300">
            <AlertTriangleIcon className="size-4" />
            Database operations are disabled in production environments.
          </div>
        </SectionPanel>
      )}

      <Tabs defaultValue="sql" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sql" className="text-xs">SQL Console</TabsTrigger>
          <TabsTrigger value="crud" className="text-xs">
            Table Manager {tableDetails.length > 0 && `(${tableDetails.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sql">
          <SectionPanel className="p-5">
            <SqlQueryConsole defaultDbType={dbType} />
          </SectionPanel>
        </TabsContent>

        <TabsContent value="crud">
          {previewLoading && (
            <SectionPanel className="p-5">
              <p className="text-xs text-gray-400">Loading table metadata...</p>
            </SectionPanel>
          )}
          {!previewLoading && tableDetails.length === 0 && (
            <SectionPanel className="p-5">
              <p className="text-xs text-gray-500">
                {dbType === 'mongodb'
                  ? 'Table metadata is not available for MongoDB. Use the SQL Console tab for MongoDB operations.'
                  : 'No tables found in the database.'}
              </p>
            </SectionPanel>
          )}
          {!previewLoading && tableDetails.length > 0 && (
            <CrudPanel tableDetails={tableDetails} dbType={dbType} />
          )}
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
