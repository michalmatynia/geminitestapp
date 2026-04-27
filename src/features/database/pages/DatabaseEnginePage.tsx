'use client';

import type { JSX } from 'react';

import type { DatabaseEngineWorkspaceView } from '@/shared/contracts/database';
import { AdminDatabasePageLayout } from '@/shared/ui/admin.public';
import Link from 'next/link';
import { Button, Tabs, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
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

function DatabaseEngineActiveView({
  activeView,
}: {
  activeView: DatabaseEngineWorkspaceView;
}): JSX.Element {
  switch (activeView) {
    case 'backups':
      return <DatabaseBackupsPanel />;
    case 'operations':
    case 'crud':
      return <DatabaseOperationsPanel />;
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
        <DatabaseEngineValidationErrors errors={validationErrors} />
        <DatabaseEngineActiveView activeView={activeView} />
      </div>
    </AdminDatabasePageLayout>
  );
}

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
      <p>Keys count: {redisOverview.keysCount ?? redisOverview.keyCount}</p>
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
