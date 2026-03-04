'use client';

import React from 'react';
import { LoadingState, Card } from '@/shared/ui';
import {
  AdminAiPathsValidationProvider,
  useAdminAiPathsValidationContext,
} from '../context/AdminAiPathsValidationContext';
import { ValidationHeader } from '../components/validation/ValidationHeader';
import { ValidationEnginePanel } from '../components/validation/ValidationEnginePanel';
import { DocsConnectionsPanel } from '../components/validation/DocsConnectionsPanel';
import { CentralDocsSyncPanel } from '../components/validation/CentralDocsSyncPanel';
import { EntityCollectionMapPanel } from '../components/validation/EntityCollectionMapPanel';
import { ValidationRulesEditor } from '../components/validation/ValidationRulesEditor';

function AdminAiPathsValidationPageInner(): React.JSX.Element {
  const { settingsQuery, settingsParseError, selectedPathConfig } =
    useAdminAiPathsValidationContext();

  if (settingsQuery.isLoading) {
    return <LoadingState message='Loading AI-Paths validator...' className='py-12' />;
  }

  return (
    <div className='mx-auto w-full max-w-none space-y-6 pb-10'>
      <ValidationHeader />

      {settingsParseError ? (
        <Card
          variant='subtle'
          padding='lg'
          className='border-red-500/30 bg-red-500/10 text-sm text-red-200'
        >
          {settingsParseError.message}
        </Card>
      ) : null}

      {!selectedPathConfig ? (
        <Card
          variant='subtle'
          padding='lg'
          className='border-border/60 bg-card/40 text-sm text-gray-400'
        >
          {settingsParseError
            ? 'The selected AI Path settings could not be loaded because the persisted payload is invalid.'
            : 'No AI Path config found for the selected path.'}
        </Card>
      ) : (
        <div className='grid gap-6 xl:grid-cols-12'>
          <div className='space-y-6 xl:col-span-7'>
            <ValidationEnginePanel />
            <DocsConnectionsPanel />
            <CentralDocsSyncPanel />
            <EntityCollectionMapPanel />
          </div>

          <ValidationRulesEditor />
        </div>
      )}
    </div>
  );
}

export function AdminAiPathsValidationPage(): React.JSX.Element {
  return (
    <AdminAiPathsValidationProvider>
      <AdminAiPathsValidationPageInner />
    </AdminAiPathsValidationProvider>
  );
}
