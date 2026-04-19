'use client';

import { SaveIcon, SlidersHorizontalIcon, ArchiveIcon, ClipboardListIcon } from 'lucide-react';
import React, { Suspense } from 'react';
import type { JSX } from 'react';
import type { DatabaseEngineWorkspaceView } from '@/shared/contracts/database';
import { AdminDatabasePageLayout } from '@/shared/ui/admin.public';
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { DocumentationList, LoadingState } from '@/shared/ui/navigation-and-layout.public';
import { DatabaseBackupsPanel } from '../components/DatabaseBackupsPanel';
import { DatabaseOperationsPanel } from '../components/DatabaseOperationsPanel';
import { DatabaseEngineSettingsTab } from '../components/engine/DatabaseEngineSettingsTab';
import {
  DatabaseEngineProvider,
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from '../context/DatabaseEngineContext';

function ActiveViewBadge({ activeView }: { activeView: DatabaseEngineWorkspaceView }): JSX.Element {
  const labels: Record<DatabaseEngineWorkspaceView, string> = {
    engine: 'Engine Settings',
    backups: 'Backups',
    operations: 'Operations Log',
  };
  return (
    <Badge variant='processing' className='hidden h-8 items-center px-3 text-[11px] uppercase tracking-wide md:inline-flex'>
      {labels[activeView]}
    </Badge>
  );
}

function SaveButton({ isSaving, hasErrors }: { isSaving: boolean; hasErrors: boolean }): JSX.Element {
  const { saveSettings } = useDatabaseEngineActionsContext();
  
  const handleSave = (): void => {
    saveSettings().catch(() => {});
  };

  return (
    <Button
      size='xs'
      className='h-8'
      onClick={handleSave}
      disabled={isSaving || hasErrors}
    >
      <SaveIcon className='size-3.5 mr-2' />
      {isSaving ? 'Saving...' : 'Save Configuration'}
    </Button>
  );
}

function DatabaseEngineContent(): JSX.Element {
  const { activeView, validationErrors, isLoading, isSaving } = useDatabaseEngineStateContext();
  const { setActiveView, refetchAll } = useDatabaseEngineActionsContext();

  return (
    <AdminDatabasePageLayout
      title='Database Engine'
      current='Engine'
      description='Control center for data provider routing, synchronization, and fallback policies.'
      refresh={{ onRefresh: refetchAll, isRefreshing: isLoading }}
      headerActions={
        <div className='flex gap-2'>
          <ActiveViewBadge activeView={activeView} />
          <SaveButton isSaving={isSaving} hasErrors={validationErrors.length > 0} />
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

export function DatabaseEnginePage(): JSX.Element {
  return (
    <Suspense fallback={<LoadingState message='Loading database engine...' />}>
      <DatabaseEngineProvider>
        <DatabaseEngineContent />
      </DatabaseEngineProvider>
    </Suspense>
  );
}

export default DatabaseEnginePage;
