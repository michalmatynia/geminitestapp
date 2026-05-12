'use client';

/* eslint-disable max-lines */

import type { JSX } from 'react';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineMongoPendingSyncRequest,
  DatabaseEngineMongoSyncDirection,
  DatabaseEngineMongoSyncInProgress,
  DatabaseEngineOperationJob,
  DatabaseEngineWorkspaceView,
  MongoSource,
} from '@/shared/contracts/database';
import { AdminDatabasePageLayout } from '@/shared/ui/admin.public';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge, Button, Tabs, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

import { DatabaseBackupsPanel } from '../components/DatabaseBackupsPanel';
import { DatabaseOperationsPanel } from '../components/DatabaseOperationsPanel';
import {
  DatabaseEngineProvider,
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from '../context/DatabaseEngineContext';
import { DatabaseEngineSettingsTab } from '../components/engine/DatabaseEngineSettingsTab';

const DATABASE_ENGINE_VIEWS: Array<{
  value: DatabaseEngineWorkspaceView;
  label: string;
}> = [
  { value: 'engine', label: 'Database Engine' },
  { value: 'backups', label: 'Backups' },
  { value: 'operations', label: 'Operations' },
  { value: 'crud', label: 'CRUD Console' },
  { value: 'preview', label: 'Database Preview' },
  { value: 'redis', label: 'Redis' },
];

const resolveViewLabel = (view: DatabaseEngineWorkspaceView): string =>
  DATABASE_ENGINE_VIEWS.find((item) => item.value === view)?.label ?? 'Database Engine';

const parseManagedMongoApplication = (
  value: string | null
): DatabaseEngineManagedMongoApplication | undefined =>
  value === 'geminitestapp' || value === 'studiq' || value === 'cms-builder' || value === 'products'
    ? value
    : undefined;

const parseMongoSource = (value: string | null): MongoSource | undefined =>
  value === 'local' || value === 'cloud' ? value : undefined;

const MONGO_APPLICATION_LABELS: Record<DatabaseEngineManagedMongoApplicationTarget, string> = {
  all: 'All apps',
  geminitestapp: 'GeminiTest App',
  studiq: 'StudiQ',
  'cms-builder': 'CMS Builder',
  products: 'Ecommerce',
};

const formatMongoSyncDirection = (direction: DatabaseEngineMongoSyncDirection): string =>
  direction === 'local_to_cloud' ? 'Push local to cloud' : 'Pull cloud to local';

const resolveMongoSyncEndpoints = (
  direction: DatabaseEngineMongoSyncDirection
): { source: MongoSource; target: MongoSource } =>
  direction === 'local_to_cloud'
    ? { source: 'local', target: 'cloud' }
    : { source: 'cloud', target: 'local' };

const formatTimestamp = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'unknown';
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : value;
};

type CurrentJobSummary = {
  id: string;
  title: string;
  detail: string;
  status: 'starting' | 'queued' | 'running';
  timestamp: string;
  progress: number | null;
};

const buildMongoSourceJobSummary = (
  syncInProgress: DatabaseEngineMongoSyncInProgress | null | undefined,
  pendingSync: DatabaseEngineMongoPendingSyncRequest | null
): CurrentJobSummary | null => {
  if (syncInProgress !== null && syncInProgress !== undefined) {
    return {
      id: `mongo-source-sync-${syncInProgress.pid}`,
      title: `${formatMongoSyncDirection(syncInProgress.direction)} - ${MONGO_APPLICATION_LABELS[syncInProgress.application]}`,
      detail: `${syncInProgress.source} -> ${syncInProgress.target} · pid ${syncInProgress.pid}`,
      status: 'running',
      timestamp: syncInProgress.acquiredAt,
      progress: null,
    };
  }

  if (pendingSync === null) return null;

  const endpoints = resolveMongoSyncEndpoints(pendingSync.direction);
  return {
    id: 'mongo-source-sync-starting',
    title: `${formatMongoSyncDirection(pendingSync.direction)} - ${MONGO_APPLICATION_LABELS[pendingSync.application]}`,
    detail: `${endpoints.source} -> ${endpoints.target} · request sent`,
    status: 'starting',
    timestamp: pendingSync.startedAt,
    progress: null,
  };
};

/* eslint-disable complexity */
const buildOperationJobSummaries = (jobs: DatabaseEngineOperationJob[] = []): CurrentJobSummary[] =>
  jobs
    .filter(
      (
        job
      ): job is DatabaseEngineOperationJob & {
        status: 'queued' | 'running';
      } => job.status === 'queued' || job.status === 'running'
    )
    .slice(0, 5)
    .map((job) => ({
      id: job.id,
      title: `${job.type}${job.dbType === '' || job.dbType === null || job.dbType === undefined ? '' : ` · ${job.dbType}`}`,
      detail: job.source ?? job.direction ?? 'database operation',
      status: job.status,
      timestamp: job.startedAt ?? job.createdAt ?? job.updatedAt ?? 'unknown',
    progress: typeof job.progress === 'number' ? job.progress : null,
  }));
/* eslint-enable complexity */

function DatabaseEngineHeaderActions({
  canSave,
  isSaving,
  onRefresh,
  onSave,
}: {
  canSave: boolean;
  isSaving: boolean;
  onRefresh: () => void;
  onSave: () => void;
}): JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button type='button' variant='outline' onClick={onRefresh}>
        Refresh
      </Button>
      <Button type='button' onClick={onSave} disabled={!canSave}>
        {isSaving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}

function DatabaseEngineViewTabs({
  activeView,
  onViewChange,
}: {
  activeView: DatabaseEngineWorkspaceView;
  onViewChange: (view: DatabaseEngineWorkspaceView) => void;
}): JSX.Element {
  return (
    <Tabs
      value={activeView}
      onValueChange={(value) => onViewChange(value as DatabaseEngineWorkspaceView)}
    >
      <TabsList aria-label='Database workspace views'>
        {DATABASE_ENGINE_VIEWS.map((view) => (
          <TabsTrigger key={view.value} value={view.value}>
            {view.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function DatabaseEngineValidationErrors({ errors }: { errors: string[] }): JSX.Element | null {
  if (errors.length === 0) return null;

  return (
    <div className='rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100'>
      {errors.map((error) => (
        <p key={error}>{error}</p>
      ))}
    </div>
  );
}

// eslint-disable-next-line complexity
function DatabaseEngineCurrentJobsPanel(): JSX.Element {
  const {
    mongoSourceState,
    operationsJobs,
    pendingMongoSourceSync,
  } = useDatabaseEngineStateContext();

  const mongoJob = buildMongoSourceJobSummary(
    mongoSourceState?.syncInProgress ?? null,
    pendingMongoSourceSync
  );
  const operationJobs = buildOperationJobSummaries(operationsJobs?.jobs ?? []);
  const jobs = mongoJob === null ? operationJobs : [mongoJob, ...operationJobs];

  return (
    <section
      aria-label='Current database jobs'
      aria-live='polite'
      className='rounded-md border border-white/10 bg-card/20 p-3'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold text-white'>Current Jobs</h2>
          <p className='text-xs text-gray-400'>
            {jobs.length === 0
              ? 'No running database jobs.'
              : `${jobs.length} active database job${jobs.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <Badge variant={jobs.length > 0 ? 'processing' : 'outline'} className='text-xs'>
          {jobs.length} active
        </Badge>
      </div>

      {jobs.length > 0 ? (
        <div className='mt-3 grid gap-2 lg:grid-cols-2'>
          {jobs.map((job) => (
            <div key={job.id} className='rounded-md border border-white/10 bg-black/20 p-3'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium text-white' title={job.title}>
                    {job.title}
                  </p>
                  <p className='mt-1 text-xs text-gray-400'>{job.detail}</p>
                </div>
                <Badge
                  variant={job.status === 'running' ? 'processing' : 'pending'}
                  className='text-xs capitalize'
                >
                  {job.status}
                </Badge>
              </div>
              <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400'>
                <span>Started: {formatTimestamp(job.timestamp)}</span>
                {job.progress !== null ? <span>Progress: {job.progress}%</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DatabaseEngineActiveView({
  activeView,
}: {
  activeView: DatabaseEngineWorkspaceView;
}): JSX.Element {
  const searchParams = useSearchParams();
  const application = parseManagedMongoApplication(searchParams.get('application'));
  const source = parseMongoSource(searchParams.get('source')) ?? (application !== undefined ? 'local' : undefined);

  switch (activeView) {
    case 'backups':
      return <DatabaseBackupsPanel />;
    case 'operations':
      return <DatabaseOperationsPanel defaultTab='sql' application={application} source={source} />;
    case 'crud':
      return <DatabaseOperationsPanel defaultTab='crud' application={application} source={source} />;
    case 'preview':
      return (
        <div className='space-y-3'>
          <p>
            Use the dedicated preview workspace to inspect schema and table data for current or backed-up
            databases.
          </p>
          <Button asChild variant='outline'>
            <Link href='/admin/databases/preview'>Open Database Preview</Link>
          </Button>
        </div>
      );
    case 'redis':
      return <DatabaseEngineRedisPanel />;
    default:
      return <DatabaseEngineSettingsTab />;
  }
}

function DatabaseEngineWorkspace(): JSX.Element {
  const {
    activeView,
    isDirty,
    isLoading,
    isSaving,
    validationErrors,
  } = useDatabaseEngineStateContext();
  const {
    refetchAll,
    saveSettings,
    setActiveView,
  } = useDatabaseEngineActionsContext();

  if (isLoading) {
    return <LoadingState message='Loading engine settings...' />;
  }

  const canSave = isDirty && !isSaving && validationErrors.length === 0;

  return (
    <AdminDatabasePageLayout
      title='Database Engine'
      current={resolveViewLabel(activeView)}
      description='Manage MongoDB source sync, backup operations, and database maintenance controls.'
      headerActions={
        <DatabaseEngineHeaderActions
          canSave={canSave}
          isSaving={isSaving}
          onRefresh={refetchAll}
          onSave={() => {
            void saveSettings();
          }}
        />
      }
    >
      <div className='space-y-6'>
        <DatabaseEngineViewTabs activeView={activeView} onViewChange={setActiveView} />
        <DatabaseEngineCurrentJobsPanel />
        <DatabaseEngineValidationErrors errors={validationErrors} />
        <DatabaseEngineActiveView activeView={activeView} />
      </div>
    </AdminDatabasePageLayout>
  );
}

// eslint-disable-next-line complexity
function DatabaseEngineRedisPanel(): JSX.Element {
  const { redisOverview } = useDatabaseEngineStateContext();
  if (!redisOverview) {
    return <p>No Redis telemetry available for this environment yet.</p>;
  }

  return (
    <div className='space-y-2 text-sm text-gray-200'>
      <p>Connected: {redisOverview.connected ? 'Yes' : 'No'}</p>
      <p>URL configured: {redisOverview.urlConfigured ? 'Yes' : 'No'}</p>
      <p>Enabled: {redisOverview.enabled ? 'Yes' : 'No'}</p>
      <p>Keys count: {redisOverview.keysCount ?? redisOverview.dbSize}</p>
      <p>Database size: {redisOverview.dbSize}</p>
      <p>Used memory: {redisOverview.memoryUsed ?? redisOverview.usedMemory ?? 'n/a'}</p>
      <p>Uptime: {redisOverview.uptime ?? 'n/a'}</p>
      <p>Clients: {redisOverview.clients ?? 'n/a'}</p>
    </div>
  );
}

export function DatabaseEnginePage(): JSX.Element {
  return (
    <DatabaseEngineProvider>
      <DatabaseEngineWorkspace />
    </DatabaseEngineProvider>
  );
}

export default DatabaseEnginePage;
