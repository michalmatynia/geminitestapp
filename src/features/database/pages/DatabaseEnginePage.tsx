'use client';

import {
  SaveIcon,
  SlidersHorizontalIcon,
  ArchiveIcon,
  ClipboardListIcon,
  CloudIcon,
  HardDriveIcon,
} from 'lucide-react';
import React, { useMemo, Suspense } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  DatabaseEngineOperationJob,
  DatabaseEngineWorkspaceView,
} from '@/shared/contracts/database';
import type { DatabaseEngineProvider as DatabaseEngineProviderValue } from '@/shared/lib/db/database-engine-constants';
import { AdminDatabasePageLayout } from '@/shared/ui/admin.public';
import { Badge, Button, Card, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { DataTable, DocumentationList, StatusBadge } from '@/shared/ui/data-display.public';
import { FormSection, SelectSimple, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { LoadingState, MetadataItem, UI_GRID_RELAXED_CLASSNAME, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';

import { DatabaseBackupsPanel } from '../components/DatabaseBackupsPanel';
import { DatabaseOperationsPanel } from '../components/DatabaseOperationsPanel';
import {
  DatabaseEngineProvider,
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from '../context/DatabaseEngineContext';
import { type DatabaseCollectionRow } from '../hooks/useDatabaseEngineState';

import type { ColumnDef } from '@tanstack/react-table';

const COLLECTION_PROVIDER_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'redis', label: 'Redis' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'auto' | DatabaseEngineProviderValue>>;

function DatabaseEngineSettingsTab(): React.JSX.Element {
  const {
    policy,
    operationControls,
    collectionRouteMap,
    rows,
    isLoading,
    engineStatus,
    mongoSourceState,
    operationsJobs,
    redisOverview,
    isSyncingMongoSources,
  } = useDatabaseEngineStateContext();
  const {
    updatePolicy,
    updateCollectionRoute,
    updateOperationControls,
    syncMongoSources,
  } = useDatabaseEngineActionsContext();
  const activeMongoSource = mongoSourceState?.activeSource ?? null;
  const lastMongoSync = mongoSourceState?.lastSync ?? null;
  const mongoSources = mongoSourceState
    ? [mongoSourceState.local, mongoSourceState.cloud]
    : [];
  const manualFullSyncEnabled = operationControls.allowManualFullSync;
  const nextMongoSource =
    activeMongoSource === 'local'
      ? 'cloud'
      : activeMongoSource === 'cloud'
        ? 'local'
        : null;
  const activeMongoSourceLabel =
    activeMongoSource === 'local'
      ? 'Local Database'
      : activeMongoSource === 'cloud'
        ? 'Cloud Database'
        : 'No active MongoDB source';
  const localMongoUriExample = mongoSourceState?.local.maskedUri ?? 'mongodb://localhost:27017/app_local';
  const localMongoDbExample = mongoSourceState?.local.dbName ?? 'app_local';
  const cloudMongoUriExample =
    mongoSourceState?.cloud.maskedUri ?? 'mongodb+srv://cluster.example/app_cloud';
  const cloudMongoDbExample = mongoSourceState?.cloud.dbName ?? 'app_cloud';
  const mongoSourceTip =
    nextMongoSource !== null
      ? `To switch, add or update MONGODB_ACTIVE_SOURCE_DEFAULT=${nextMongoSource} in .env and restart the server.`
      : 'Add MONGODB_ACTIVE_SOURCE_DEFAULT=local or MONGODB_ACTIVE_SOURCE_DEFAULT=cloud to .env, then restart the server.';

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
        id: 'provider',
        header: 'Assigned Provider',
        cell: ({ row }: { row: { original: DatabaseCollectionRow } }) => (
          <SelectSimple
            size='xs'
            value={collectionRouteMap[row.original.name] ?? 'auto'}
            onValueChange={(val) => {
              updateCollectionRoute(row.original.name, val);
            }}
            options={COLLECTION_PROVIDER_OPTIONS}
            className='h-7 w-28 text-[10px]'
           ariaLabel='Select option' title='Select option'/>
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
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
        <FormSection title='Mongo Source' className='lg:col-span-2 p-6'>
          <div className='space-y-4'>
            <Card className='border-border/60 bg-card/35 p-4'>
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    {activeMongoSource === 'cloud' ? (
                      <CloudIcon className='size-4 text-sky-200' />
                    ) : (
                      <HardDriveIcon className='size-4 text-sky-200' />
                    )}
                    <p className='text-xs uppercase tracking-[0.24em] text-muted-foreground'>
                      Current Database
                    </p>
                  </div>
                  <p className='text-lg font-semibold text-white'>{activeMongoSourceLabel}</p>
                  <p className='text-sm text-muted-foreground'>{mongoSourceTip}</p>
                </div>
                <StatusBadge
                  status={
                    activeMongoSource
                      ? `Connected to ${activeMongoSourceLabel}`
                      : 'No MongoDB source configured'
                  }
                  variant={activeMongoSource ? 'active' : 'error'}
                  size='sm'
                />
              </div>
            </Card>

            <Card className='border-border/60 bg-card/25 p-4'>
              <div className='space-y-3'>
                <div>
                  <p className='text-xs uppercase tracking-[0.24em] text-muted-foreground'>
                    .env Example
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Keep both targets in `.env`, then change only
                    {' '}`MONGODB_ACTIVE_SOURCE_DEFAULT` and restart.
                  </p>
                </div>
                <pre className='overflow-x-auto rounded-md border border-white/10 bg-black/20 p-3 font-mono text-xs text-gray-200'>
{`MONGODB_LOCAL_URI=${localMongoUriExample}
MONGODB_LOCAL_DB=${localMongoDbExample}
MONGODB_CLOUD_URI=${cloudMongoUriExample}
MONGODB_CLOUD_DB=${cloudMongoDbExample}
MONGODB_ACTIVE_SOURCE_DEFAULT=${activeMongoSource ?? 'local'}

# To switch:
MONGODB_ACTIVE_SOURCE_DEFAULT=${nextMongoSource ?? 'cloud'}`}
                </pre>
              </div>
            </Card>

            <div className='flex flex-wrap items-center gap-2'>
              <StatusBadge
                status={
                  activeMongoSource
                    ? `Active source: ${activeMongoSource}`
                    : 'No MongoDB source configured'
                }
                variant={activeMongoSource ? 'active' : 'error'}
                size='sm'
                className='font-medium capitalize'
              />
              <Badge variant='outline' className='border-white/10 text-gray-300'>
                Controlled by `.env`: MONGODB_ACTIVE_SOURCE_DEFAULT
              </Badge>
              <Badge variant='outline' className='border-white/10 text-gray-300'>
                Restart required after `.env` changes
              </Badge>
              {!mongoSourceState?.canSwitch ? (
                <Badge variant='outline' className='border-amber-400/30 text-amber-200'>
                  Configure both local and cloud URIs and set MONGODB_ACTIVE_SOURCE_DEFAULT in
                  `.env` to use dual-source mode.
                </Badge>
              ) : null}
              {!manualFullSyncEnabled ? (
                <Badge variant='outline' className='border-amber-400/30 text-amber-200'>
                  Manual full sync is disabled by Database Engine controls.
                </Badge>
              ) : null}
              {mongoSourceState?.syncIssue ? (
                <Badge variant='outline' className='border-amber-400/30 text-amber-200'>
                  {mongoSourceState.syncIssue}
                </Badge>
              ) : null}
              {mongoSourceState?.canSync && manualFullSyncEnabled ? (
                <>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8'
                    disabled={isSyncingMongoSources}
                    onClick={() => {
                      void syncMongoSources('cloud_to_local');
                    }}
                  >
                    {isSyncingMongoSources ? 'Syncing...' : 'Pull Cloud -> Local'}
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8'
                    disabled={isSyncingMongoSources}
                    onClick={() => {
                      void syncMongoSources('local_to_cloud');
                    }}
                  >
                    {isSyncingMongoSources ? 'Syncing...' : 'Push Local -> Cloud'}
                  </Button>
                </>
              ) : null}
            </div>

            <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
              <Card className='space-y-3 border-border/60 bg-card/25 p-4 md:col-span-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <StatusBadge
                    status={
                      lastMongoSync
                        ? `Last sync: ${lastMongoSync.source} -> ${lastMongoSync.target}`
                        : 'No sync recorded yet'
                    }
                    variant={lastMongoSync ? 'success' : 'neutral'}
                    size='sm'
                  />
                  {lastMongoSync ? (
                    <Badge variant='outline' className='border-white/10 text-gray-300'>
                      Synced at: {lastMongoSync.syncedAt}
                    </Badge>
                  ) : null}
                </div>
                {lastMongoSync ? (
                  <div className='space-y-1 text-xs text-muted-foreground'>
                    <p>Direction: {lastMongoSync.direction}</p>
                    <p>Archive: {lastMongoSync.archivePath ?? 'Not retained'}</p>
                    <p>Log: {lastMongoSync.logPath ?? 'Not available'}</p>
                  </div>
                ) : (
                  <p className='text-xs text-muted-foreground'>
                    Run a cloud/local sync to persist the latest archive and log reference here.
                  </p>
                )}
              </Card>

              {mongoSources.map((entry) => {
                const isLocal = entry.source === 'local';
                const connectionStatus = !entry.configured
                  ? 'Missing'
                  : entry.reachable === false
                    ? 'Unreachable'
                    : entry.isActive
                      ? 'Active'
                      : entry.reachable === true
                        ? 'Reachable'
                        : 'Available';
                const connectionVariant = !entry.configured
                  ? 'error'
                  : entry.reachable === false
                    ? 'error'
                    : entry.isActive
                      ? 'active'
                      : entry.reachable === true
                        ? 'success'
                        : 'neutral';
                return (
                  <Card
                    key={entry.source}
                    className='space-y-3 border-border/60 bg-card/35 p-4'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='space-y-1'>
                        <div className='flex items-center gap-2'>
                          {isLocal ? (
                            <HardDriveIcon className='size-4 text-sky-200' />
                          ) : (
                            <CloudIcon className='size-4 text-sky-200' />
                          )}
                          <h3 className='text-sm font-semibold capitalize text-white'>
                            {entry.source} MongoDB
                          </h3>
                        </div>
                        <p className='text-xs text-muted-foreground'>
                          {entry.configured
                            ? entry.maskedUri || 'Configured MongoDB target'
                            : 'Not configured'}
                        </p>
                      </div>
                      <StatusBadge
                        status={connectionStatus}
                        variant={connectionVariant}
                        size='sm'
                      />
                    </div>

                    <div className='space-y-1 text-xs text-muted-foreground'>
                      <p>Database: {entry.dbName ?? 'Not configured'}</p>
                      <p>
                        {entry.usesLegacyEnv
                          ? 'Using legacy MONGODB_URI fallback.'
                          : 'Using dedicated source env.'}
                      </p>
                      {entry.reachable === true ? <p>Connection: Reachable</p> : null}
                      {entry.reachable === false ? (
                        <p>
                          Connection error:{' '}
                          {entry.healthError ?? 'Unable to reach MongoDB target.'}
                        </p>
                      ) : null}
                    </div>

                    <div className='rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground'>
                      {entry.isActive
                        ? 'This target is active for the current server process.'
                        : `To activate this target, add or update MONGODB_ACTIVE_SOURCE_DEFAULT=${entry.source} in .env and restart the server.`}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </FormSection>

        <FormSection title='Manual Operation Controls' className='p-6'>
          <div className='space-y-4'>
            <p className='text-xs text-muted-foreground'>
              These gates control which admin-triggered database operations are allowed from the
              UI and API.
            </p>
            <div className='space-y-3'>
              <ToggleRow
                id='database-engine-allow-manual-full-sync'
                label='Manual Full Sync'
                description='Allow full MongoDB source copy jobs between local and cloud.'
                checked={operationControls.allowManualFullSync}
                onCheckedChange={(checked) => {
                  updateOperationControls({ allowManualFullSync: checked });
                }}
                className='bg-white/5 border-white/5'
              />
              <ToggleRow
                id='database-engine-allow-manual-collection-sync'
                label='Manual Collection Sync'
                description='Allow collection-level copy and sync operations.'
                checked={operationControls.allowManualCollectionSync}
                onCheckedChange={(checked) => {
                  updateOperationControls({ allowManualCollectionSync: checked });
                }}
                className='bg-white/5 border-white/5'
              />
              <ToggleRow
                id='database-engine-allow-manual-backfill'
                label='Manual Backfill'
                description='Allow one-off settings and metadata backfill jobs.'
                checked={operationControls.allowManualBackfill}
                onCheckedChange={(checked) => {
                  updateOperationControls({ allowManualBackfill: checked });
                }}
                className='bg-white/5 border-white/5'
              />
              <ToggleRow
                id='database-engine-allow-manual-backup-run-now'
                label='Manual Backup Run Now'
                description='Allow administrators to trigger backups immediately.'
                checked={operationControls.allowManualBackupRunNow}
                onCheckedChange={(checked) => {
                  updateOperationControls({ allowManualBackupRunNow: checked });
                }}
                className='bg-white/5 border-white/5'
              />
              <ToggleRow
                id='database-engine-allow-manual-backup-maintenance'
                label='Manual Backup Maintenance'
                description='Allow restore, upload, and delete actions in Backup Center.'
                checked={operationControls.allowManualBackupMaintenance}
                onCheckedChange={(checked) => {
                  updateOperationControls({ allowManualBackupMaintenance: checked });
                }}
                className='bg-white/5 border-white/5'
              />
              <ToggleRow
                id='database-engine-allow-backup-scheduler-tick'
                label='Backup Scheduler Tick'
                description='Allow manual scheduler ticks and due-check operations.'
                checked={operationControls.allowBackupSchedulerTick}
                onCheckedChange={(checked) => {
                  updateOperationControls({ allowBackupSchedulerTick: checked });
                }}
                className='bg-white/5 border-white/5'
              />
              <ToggleRow
                id='database-engine-allow-operation-job-cancellation'
                label='Operation Job Cancellation'
                description='Allow administrators to cancel running database jobs.'
                checked={operationControls.allowOperationJobCancellation}
                onCheckedChange={(checked) => {
                  updateOperationControls({ allowOperationJobCancellation: checked });
                }}
                className='bg-white/5 border-white/5'
              />
            </div>
          </div>
        </FormSection>

        <FormSection title='Engine Policy' className='lg:col-span-2 p-6'>
          <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
            <ToggleRow
              id='database-engine-require-explicit-service-routing'
              label='Strict Service Routing'
              description='Require explicit provider per service'
              checked={policy.requireExplicitServiceRouting}
              onCheckedChange={(checked) => {
                updatePolicy({ requireExplicitServiceRouting: checked });
              }}
              className='bg-white/5 border-white/5'
            />
            <ToggleRow
              id='database-engine-require-explicit-collection-routing'
              label='Strict Collection Routing'
              description='Require explicit provider per collection'
              checked={policy.requireExplicitCollectionRouting}
              onCheckedChange={(checked) => {
                updatePolicy({ requireExplicitCollectionRouting: checked });
              }}
              className='bg-white/5 border-white/5'
            />
            <ToggleRow
              id='database-engine-allow-automatic-fallback'
              label='Auto Fallback'
              description='Switch providers on failure'
              checked={policy.allowAutomaticFallback}
              onCheckedChange={(checked) => {
                updatePolicy({ allowAutomaticFallback: checked });
              }}
              className='bg-white/5 border-white/5'
            />
            <ToggleRow
              id='database-engine-strict-provider-availability'
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
              label='Mongo Source'
              value={
                <StatusBadge
                  status={activeMongoSource ? activeMongoSource : 'missing'}
                  variant={activeMongoSource ? 'active' : 'error'}
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
        showTable={false}
      >
        <div className='md:hidden space-y-3 px-4 pb-4'>
          {rows.map((row) => (
            <Card key={row.name} className='bg-card/40 p-3 space-y-2'>
              <div className='flex justify-between items-center'>
                <span className='font-mono text-emerald-200 text-xs font-medium'>{row.name}</span>
                <Badge variant='outline' className='text-[10px] uppercase'>MongoDB</Badge>
              </div>
              <div className='flex justify-between items-center text-[11px]'>
                <span className='text-gray-500'>Assigned Provider</span>
                <SelectSimple
                  size='xs'
                  value={collectionRouteMap[row.name] ?? 'auto'}
                  onValueChange={(val) => {
                    updateCollectionRoute(row.name, val);
                  }}
                  options={COLLECTION_PROVIDER_OPTIONS}
                  className='h-6 w-24 text-[10px]'
                 ariaLabel='Select option' title='Select option'/>
              </div>
            </Card>
          ))}
        </div>
        <div className='hidden md:block'>
          <DataTable
            columns={collectionColumns}
            data={rows}
            isLoading={isLoading}
          />
        </div>
      </StandardDataTablePanel>

      <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
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
          showTable={false}
        >
          <div className='md:hidden space-y-2 px-4 pb-4'>
            {(operationsJobs?.jobs ?? []).slice(0, 5).map((job) => (
              <Card key={job.id} className='bg-card/40 p-3 space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='font-mono text-[10px] text-gray-400'>
                    {job.id.slice(0, 8)}...
                  </span>
                  <StatusBadge status={job.status} />
                </div>
                <div className='flex justify-between items-center text-[11px]'>
                  <span className='text-gray-300'>{job.type}</span>
                  <span className='text-gray-500'>
                    {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
          <div className='hidden md:block'>
            <DataTable
              columns={jobColumns}
              data={(operationsJobs?.jobs ?? []).slice(0, 5)}
              isLoading={isLoading}
            />
          </div>
        </StandardDataTablePanel>
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
    <AdminDatabasePageLayout
      title='Database Engine'
      current='Engine'
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
    </AdminDatabasePageLayout>
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
