'use client';

import type { DatabaseEngineMongoSourceState } from '@/shared/contracts/database';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { MongoLastTransferCard, MongoSourceEntryCard, MongoSourceOverviewCards } from './DatabaseEngineMongoSourceCards';
import { MongoSyncCard } from './DatabaseEngineMongoSyncCard';

import type { JSX } from 'react';

export function MongoSourceSection({
  mongoSourceState,
  isSyncingMongoSources,
  allowManualFullSync,
  onSync,
}: {
  mongoSourceState: DatabaseEngineMongoSourceState | undefined;
  isSyncingMongoSources: boolean;
  allowManualFullSync: boolean;
  onSync: (direction: 'cloud_to_local' | 'local_to_cloud') => void;
}): JSX.Element {
  if (mongoSourceState === undefined) {
    return (
      <FormSection title='Mongo Source'>
        <p className='text-sm text-muted-foreground'>Loading Mongo source status...</p>
      </FormSection>
    );
  }

  const hasDualSourceConfigured =
    mongoSourceState.local.configured && mongoSourceState.cloud.configured;
  const syncInProgress = mongoSourceState.syncInProgress ?? null;

  return (
    <FormSection title='Mongo Source' className='space-y-0'>
      <div className='space-y-4'>
        <MongoSourceOverviewCards mongoSourceState={mongoSourceState} />
        <div className='grid gap-4 lg:grid-cols-2'>
          <MongoSourceEntryCard entry={mongoSourceState.local} />
          <MongoSourceEntryCard entry={mongoSourceState.cloud} />
        </div>
        <MongoSyncCard
          allowManualFullSync={allowManualFullSync}
          hasDualSourceConfigured={hasDualSourceConfigured}
          canSync={mongoSourceState.canSync}
          syncIssue={mongoSourceState.syncIssue}
          syncInProgress={syncInProgress}
          isSyncingMongoSources={isSyncingMongoSources}
          onSync={onSync}
        />
        <MongoLastTransferCard lastSync={mongoSourceState.lastSync} />
      </div>
    </FormSection>
  );
}
