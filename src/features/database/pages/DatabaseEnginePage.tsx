'use client';

import { 
  SaveIcon, 
  RefreshCwIcon,
  ShieldCheckIcon
} from 'lucide-react';
import React, { useMemo, Suspense } from 'react';

import type { DatabaseEngineOperationJobDto } from '@/shared/contracts/database';
import type { DatabaseEngineProvider, DatabaseEnginePolicy } from '@/shared/lib/db/database-engine-constants';
import { 
  Button, 
  FormSection, 
  DataTable, 
  SelectSimple, 
  Checkbox, 
  StatusBadge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  SectionHeader,
  Alert
} from '@/shared/ui';

import { DatabaseBackupsPanel } from '../components/DatabaseBackupsPanel';
import { DatabaseOperationsPanel } from '../components/DatabaseOperationsPanel';
import { useDatabaseEngineState, type DatabaseEngineWorkspaceView, type DatabaseCollectionRow } from '../hooks/useDatabaseEngineState';

import type { ColumnDef } from '@tanstack/react-table';


function DatabaseEngineContent(): React.JSX.Element {
  const {
    workspaceView,
    setView,
    policyDraft,
    setPolicyDraft,
    collectionRouteMapDraft,
    setCollectionRouteMapDraft,
    rows,
    validationErrors,
    saveConfiguration,
    isLoading,
    isFetching,
    refetch,
    engineStatus,
    operationJobs,
    redisOverview,
    saving,
  } = useDatabaseEngineState();

  const collectionColumns = useMemo<ColumnDef<DatabaseCollectionRow>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Collection',
      cell: ({ row }) => <span className='font-mono text-emerald-200 font-medium'>{row.original.name}</span>,
    },
    {
      accessorKey: 'mongoDocumentCount',
      header: 'MongoDB',
      cell: ({ row }) => (
        <span className='text-gray-400'>
          {row.original.existsInMongo ? (row.original.mongoDocumentCount ?? 0).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'prismaRowCount',
      header: 'Prisma',
      cell: ({ row }) => (
        <span className='text-gray-400'>
          {row.original.existsInPrisma ? (row.original.prismaRowCount ?? 0).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      id: 'provider',
      header: 'Assigned Provider',
      cell: ({ row }: { row: { original: DatabaseCollectionRow } }) => (
        <SelectSimple
          size='xs'
          value={collectionRouteMapDraft[row.original.name] ?? 'auto'}
          onValueChange={(val) => {
            setCollectionRouteMapDraft((prev: Record<string, DatabaseEngineProvider>) => {
              const next = { ...prev };
              if (val === 'auto') delete next[row.original.name];
              else next[row.original.name] = val as DatabaseEngineProvider;
              return next;
            });
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
  ], [collectionRouteMapDraft, setCollectionRouteMapDraft]);

  const jobColumns = useMemo<ColumnDef<DatabaseEngineOperationJobDto>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Job ID',
      cell: ({ row }) => <span className='font-mono text-[10px] text-gray-400'>{row.original.id.slice(0, 8)}...</span>,
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
      cell: ({ row }) => <span className='text-[10px] text-gray-500'>{new Date(row.original.createdAt).toLocaleString()}</span>,
    },
  ], []);

  if (isLoading) {
    return <div className='p-12 text-center text-sm text-gray-500 animate-pulse'>Initializing database engine console...</div>;
  }

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <SectionHeader
        title='Database Engine'
        description='Control center for data provider routing, synchronization, and fallback policies.'
        actions={
          <div className='flex gap-2'>
            <Button variant='outline' size='xs' className='h-8' onClick={refetch} disabled={isFetching}>
              <RefreshCwIcon className={`size-3.5 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size='xs' className='h-8' onClick={() => { void saveConfiguration(); }} disabled={saving || validationErrors.length > 0}>
              <SaveIcon className='size-3.5 mr-2' />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        }
      />

      <Tabs value={workspaceView} onValueChange={(v) => setView(v as DatabaseEngineWorkspaceView)} className='w-full'>
        <TabsList className='bg-card/40 border border-border/60 p-1 h-10'>
          <TabsTrigger value='engine' className='px-6'>Engine Settings</TabsTrigger>
          <TabsTrigger value='backups' className='px-6'>Backups</TabsTrigger>
          <TabsTrigger value='operations' className='px-6'>Operations Log</TabsTrigger>
        </TabsList>

        <TabsContent value='engine' className='space-y-6 mt-6'>
          <div className='grid gap-6 lg:grid-cols-3'>
            <FormSection title='Engine Policy' className='lg:col-span-2 p-6'>
              <div className='grid gap-4 md:grid-cols-2'>
                <label className='flex items-center gap-3 p-3 rounded-md border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors'>
                  <Checkbox 
                    checked={policyDraft.requireExplicitServiceRouting} 
                    onCheckedChange={(v: boolean | 'indeterminate') => {
                      const isChecked = v === true;
                      setPolicyDraft((p: DatabaseEnginePolicy): DatabaseEnginePolicy => ({ ...p, requireExplicitServiceRouting: isChecked }));
                    }}
                  />
                  <div className='flex flex-col'>
                    <span className='text-sm font-medium text-gray-200'>Strict Service Routing</span>
                    <span className='text-[10px] text-gray-500 uppercase'>Require explicit provider per service</span>
                  </div>
                </label>
                <label className='flex items-center gap-3 p-3 rounded-md border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors'>
                  <Checkbox 
                    checked={policyDraft.requireExplicitCollectionRouting} 
                    onCheckedChange={(v: boolean | 'indeterminate') => {
                      const isChecked = v === true;
                      setPolicyDraft((p: DatabaseEnginePolicy): DatabaseEnginePolicy => ({ ...p, requireExplicitCollectionRouting: isChecked }));
                    }}
                  />
                  <div className='flex flex-col'>
                    <span className='text-sm font-medium text-gray-200'>Strict Collection Routing</span>
                    <span className='text-[10px] text-gray-500 uppercase'>Require explicit provider per collection</span>
                  </div>
                </label>
                <label className='flex items-center gap-3 p-3 rounded-md border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors'>
                  <Checkbox 
                    checked={policyDraft.allowAutomaticFallback} 
                    onCheckedChange={(v: boolean | 'indeterminate') => {
                      const isChecked = v === true;
                      setPolicyDraft((p: DatabaseEnginePolicy): DatabaseEnginePolicy => ({ ...p, allowAutomaticFallback: isChecked }));
                    }}
                  />
                  <div className='flex flex-col'>
                    <span className='text-sm font-medium text-gray-200'>Auto Fallback</span>
                    <span className='text-[10px] text-gray-500 uppercase'>Switch providers on failure</span>
                  </div>
                </label>
                <label className='flex items-center gap-3 p-3 rounded-md border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors'>
                  <Checkbox 
                    checked={policyDraft.strictProviderAvailability} 
                    onCheckedChange={(v: boolean | 'indeterminate') => {
                      const isChecked = v === true;
                      setPolicyDraft((p: DatabaseEnginePolicy): DatabaseEnginePolicy => ({ ...p, strictProviderAvailability: isChecked }));
                    }}
                  />
                  <div className='flex flex-col'>
                    <span className='text-sm font-medium text-gray-200'>Strict Availability</span>
                    <span className='text-[10px] text-gray-500 uppercase'>Throw on unconfigured envs</span>
                  </div>
                </label>
              </div>
            </FormSection>

            <FormSection title='Resource Health' className='p-6'>
              <div className='space-y-3'>
                <div className='flex items-center justify-between p-2 rounded bg-black/20 border border-white/5'>
                  <span className='text-xs text-gray-400'>Prisma (SQL)</span>
                  <StatusBadge status={engineStatus?.providers.prismaConfigured ? 'success' : 'error'} />
                </div>
                <div className='flex items-center justify-between p-2 rounded bg-black/20 border border-white/5'>
                  <span className='text-xs text-gray-400'>MongoDB</span>
                  <StatusBadge status={engineStatus?.providers.mongodbConfigured ? 'success' : 'error'} />
                </div>
                <div className='flex items-center justify-between p-2 rounded bg-black/20 border border-white/5'>
                  <span className='text-xs text-gray-400'>Redis</span>
                  <StatusBadge status={engineStatus?.providers.redisConfigured ? 'success' : 'error'} />
                </div>
              </div>
            </FormSection>
          </div>

          <FormSection title='Collection Routing' className='p-6'>
            <div className='rounded-md border border-border bg-gray-950/20'>
              <DataTable
                columns={collectionColumns}
                data={rows}
                isLoading={isFetching}
              />
            </div>
          </FormSection>

          <div className='grid gap-6 md:grid-cols-2'>
            <FormSection title='Redis Overview' className='p-6'>
              {redisOverview ? (
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='p-3 rounded border border-white/5 bg-black/20'>
                      <span className='block text-[10px] uppercase font-bold text-gray-500'>Memory Usage</span>
                      <span className='text-lg font-mono text-white'>{redisOverview.usedMemory}</span>
                    </div>
                    <div className='p-3 rounded border border-white/5 bg-black/20'>
                      <span className='block text-[10px] uppercase font-bold text-gray-500'>Total Keys</span>
                      <span className='text-lg font-mono text-white'>{redisOverview.dbSize}</span>
                    </div>
                  </div>
                  <div className='max-h-40 overflow-y-auto space-y-1 pr-2'>
                    {redisOverview.namespaces.map(ns => (
                      <div key={ns.namespace} className='flex justify-between text-[11px] p-1.5 rounded bg-white/5 border border-white/5'>
                        <span className='font-mono text-gray-300'>{ns.namespace}</span>
                        <span className='text-sky-400'>{ns.keyCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className='py-12 text-center text-xs text-gray-600 uppercase tracking-widest'>Redis disabled or unreachable</div>
              )}
            </FormSection>

            <FormSection title='Recent Activity' className='p-6'>
              <div className='rounded-md border border-border bg-gray-950/20'>
                <DataTable
                  columns={jobColumns}
                  data={operationJobs.slice(0, 5)}
                  isLoading={isFetching}
                />
              </div>
            </FormSection>
          </div>
        </TabsContent>

        <TabsContent value='backups' className='mt-6'>
          <DatabaseBackupsPanel />
        </TabsContent>

        <TabsContent value='operations' className='mt-6'>
          <DatabaseOperationsPanel />
        </TabsContent>
      </Tabs>

      {validationErrors.length > 0 && (
        <Alert variant='error'>
          <div className='flex items-center gap-2 font-bold mb-2'>
            <ShieldCheckIcon className='size-4' />
            Blocking Configuration Issues
          </div>
          <ul className='list-disc list-inside space-y-1'>
            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </Alert>
      )}
    </div>
  );
}

export default function DatabaseEnginePage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className='p-12 text-center text-sm text-gray-500 animate-pulse'>Loading database engine...</div>}>
      <DatabaseEngineContent />
    </Suspense>
  );
}
