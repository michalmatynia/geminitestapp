'use client';

import { SaveIcon, SlidersHorizontalIcon, ArchiveIcon, ClipboardListIcon } from 'lucide-react';
import React, { useMemo, Suspense } from 'react';

import type {
  DatabaseEngineOperationJob,
  DatabaseEngineWorkspaceView,
} from '@/shared/contracts/database';
import {
  Button,
  FormSection,
  StandardDataTablePanel,
  SelectSimple,
  StatusBadge,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  MetadataItem,
  LoadingState,
  ToggleRow,
  PageLayout,
  DocumentationList,
} from '@/shared/ui';

import { DatabaseBackupsPanel } from '../components/DatabaseBackupsPanel';
import { DatabaseOperationsPanel } from '../components/DatabaseOperationsPanel';
import {
  DatabaseEngineProvider,
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from '../context/DatabaseEngineContext';
import { type DatabaseCollectionRow } from '../hooks/useDatabaseEngineState';

import type { ColumnDef } from '@tanstack/react-table';

function DatabaseEngineSettingsTab(): React.JSX.Element {
  const {
    policy,
    collectionRouteMap,
    rows,
    isLoading,
    engineStatus,
    operationsJobs,
    redisOverview,
  } = useDatabaseEngineStateContext();
  const { updatePolicy, updateCollectionRoute } = useDatabaseEngineActionsContext();

  const collectionColumns = useMemo<ColumnDef<DatabaseCollectionRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Collection',
        cell: ({ row }) => (
          <span className='font-mono text-emerald-200 font-medium'>{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'mongoDocumentCount',
        header: 'MongoDB',
        cell: ({ row }) => (
          <span className='text-gray-400'>
            {row.original.existsInMongo
              ? (row.original.mongoDocumentCount ?? 0).toLocaleString()
              : '—'}
          </span>
        ),
      },
      {
        accessorKey: 'prismaRowCount',
        header: 'Prisma',
        cell: ({ row }) => (
          <span className='text-gray-400'>
            {row.original.existsInPrisma
              ? (row.original.prismaRowCount ?? 0).toLocaleString()
              : '—'}
          </span>
        ),
      },
      {
        id: 'provider',
        header: 'Assigned Provider',
        cell: ({ row }: { row: { original: DatabaseCollectionRow } }) => (
          <SelectSimple
            size='xs'
            value={collectionRouteMap[row.original.name] ?? 'auto'}
            onValueChange={(val) => {
              updateCollectionRoute(row.original.name, val);
            }}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'mongodb', label: 'MongoDB' },
              { value: 'prisma', label: 'Prisma' },
              { value: 'redis', label: 'Redis' },
            ]}
            className='h-7 w-28 text-[10px]'
          />
        ),
      },
    ],
    [collectionRouteMap, updateCollectionRoute]
  );

  const jobColumns = useMemo<ColumnDef<DatabaseEngineOperationJob>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Job ID',
        cell: ({ row }) => (
          <span className='font-mono text-[10px] text-gray-400'>
            {row.original.id.slice(0, 8)}...
          </span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className='text-[10px] text-gray-500'>
            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : '—'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className='space-y-6'>
      <div className='grid gap-6 lg:grid-cols-3'>
        <FormSection title='Engine Policy' className='lg:col-span-2 p-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <ToggleRow
              label='Strict Service Routing'
              description='Require explicit provider per service'
              checked={policy.requireExplicitServiceRouting}
              onCheckedChange={(checked) => {
                updatePolicy({ requireExplicitServiceRouting: checked });
              }}
              className='bg-white/5 border-white/5'
            />
            <ToggleRow
              label='Strict Collection Routing'
              description='Require explicit provider per collection'
              checked={policy.requireExplicitCollectionRouting}
              onCheckedChange={(checked) => {
                updatePolicy({ requireExplicitCollectionRouting: checked });
              }}
              className='bg-white/5 border-white/5'
            />
            <ToggleRow
              label='Auto Fallback'
              description='Switch providers on failure'
              checked={policy.allowAutomaticFallback}
              onCheckedChange={(checked) => {
                updatePolicy({ allowAutomaticFallback: checked });
              }}
              className='bg-white/5 border-white/5'
            />
            <ToggleRow
              label='Strict Availability'
              description='Throw on unconfigured envs'
              checked={policy.strictProviderAvailability}
              onCheckedChange={(checked) => {
                updatePolicy({ strictProviderAvailability: checked });
              }}
              className='bg-white/5 border-white/5'
            />
          </div>
        </FormSection>

        <FormSection title='Resource Health' className='p-6'>
          <div className='space-y-3'>
            <MetadataItem
              variant='minimal'
              label='Prisma (SQL)'
              value={
                <StatusBadge
                  status={engineStatus?.providers.prismaConfigured ? 'success' : 'error'}
                />
              }
              className='flex items-center justify-between'
            />
            <MetadataItem
              variant='minimal'
              label='MongoDB'
              value={
                <StatusBadge
                  status={engineStatus?.providers.mongodbConfigured ? 'success' : 'error'}
                />
              }
              className='flex items-center justify-between'
            />
            <MetadataItem
              variant='minimal'
              label='Redis'
              value={
                <StatusBadge
                  status={engineStatus?.providers.redisConfigured ? 'success' : 'error'}
                />
              }
              className='flex items-center justify-between'
            />
          </div>
        </FormSection>
      </div>

      <StandardDataTablePanel
        title='Collection Routing'
        columns={collectionColumns}
        data={rows}
        isLoading={isLoading}
        variant='flat'
      />

      <div className='grid gap-6 md:grid-cols-2'>
        <FormSection title='Redis Overview' className='p-6'>
          {redisOverview ? (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <MetadataItem label='Memory Usage' value={redisOverview.usedMemory} mono />
                <MetadataItem label='Total Keys' value={redisOverview.dbSize} mono />
              </div>
              <div className='max-h-40 overflow-y-auto space-y-1 pr-2'>
                {redisOverview.namespaces.map((ns) => (
                  <div
                    key={ns.namespace}
                    className='flex justify-between text-[11px] p-1.5 rounded bg-white/5 border border-white/5'
                  >
                    <span className='font-mono text-gray-300'>{ns.namespace}</span>
                    <span className='text-sky-400'>{ns.keyCount}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className='py-12 text-center text-xs text-gray-600 uppercase tracking-widest'>
              Redis disabled or unreachable
            </div>
          )}
        </FormSection>

        <StandardDataTablePanel
          title='Recent Activity'
          columns={jobColumns}
          data={(operationsJobs?.jobs ?? []).slice(0, 5)}
          isLoading={isLoading}
          variant='flat'
        />
      </div>
    </div>
  );
}

function DatabaseEngineContent(): React.JSX.Element {
  const { activeView, validationErrors, isLoading, isSaving } = useDatabaseEngineStateContext();
  const { setActiveView, saveSettings, refetchAll } = useDatabaseEngineActionsContext();

  const activeViewLabel =
    activeView === 'engine'
      ? 'Engine Settings'
      : activeView === 'backups'
        ? 'Backups'
        : 'Operations Log';

  return (
    <PageLayout
      title='Database Engine'
      description='Control center for data provider routing, synchronization, and fallback policies.'
      refresh={{
        onRefresh: refetchAll,
        isRefreshing: isLoading,
      }}
      headerActions={
        <div className='flex gap-2'>
          <Badge
            variant='processing'
            className='hidden h-8 items-center px-3 text-[11px] uppercase tracking-wide md:inline-flex'
          >
            {activeViewLabel}
          </Badge>
          <Button
            size='xs'
            className='h-8'
            onClick={() => {
              void saveSettings();
            }}
            disabled={isSaving || validationErrors.length > 0}
          >
            <SaveIcon className='size-3.5 mr-2' />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      }
    >
      <Tabs
        value={activeView}
        onValueChange={(v) => setActiveView(v as DatabaseEngineWorkspaceView)}
        className='w-full'
      >
        <TabsList
          className='grid h-auto w-full grid-cols-1 gap-2 border border-border/60 bg-card/30 p-2 md:grid-cols-3'
          aria-label='Database engine workspace tabs'
        >
          <TabsTrigger value='engine' className='h-12 justify-start gap-2 px-3 text-left'>
            <SlidersHorizontalIcon className='size-4' />
            <span className='text-xs font-semibold uppercase tracking-wide'>Engine Settings</span>
          </TabsTrigger>
          <TabsTrigger value='backups' className='h-12 justify-start gap-2 px-3 text-left'>
            <ArchiveIcon className='size-4' />
            <span className='text-xs font-semibold uppercase tracking-wide'>Backups</span>
          </TabsTrigger>
          <TabsTrigger value='operations' className='h-12 justify-start gap-2 px-3 text-left'>
            <ClipboardListIcon className='size-4' />
            <span className='text-xs font-semibold uppercase tracking-wide'>Operations Log</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='engine' className='mt-6'>
          <DatabaseEngineSettingsTab />
        </TabsContent>

        <TabsContent value='backups' className='mt-6'>
          <DatabaseBackupsPanel />
        </TabsContent>

        <TabsContent value='operations' className='mt-6'>
          <DatabaseOperationsPanel />
        </TabsContent>
      </Tabs>

      {validationErrors.length > 0 && (
        <div className='mt-6'>
          <DocumentationList
            title='Blocking Configuration Issues'
            items={validationErrors}
            className='border-red-500/20 bg-red-500/5'
          />
        </div>
      )}
    </PageLayout>
  );
}

export function DatabaseEnginePage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingState message='Loading database engine...' />}>
      <DatabaseEngineProvider>
        <DatabaseEngineContent />
      </DatabaseEngineProvider>
    </Suspense>
  );
}

export default DatabaseEnginePage;
