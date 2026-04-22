'use client';

import type { DatabaseEngineMongoSyncInProgress } from '@/shared/contracts/database';
import { Button, Card } from '@/shared/ui/primitives.public';

import type { JSX } from 'react';

const resolveUnavailableSyncMessage = (params: {
  allowManualFullSync: boolean;
  hasDualSourceConfigured: boolean;
  canSync: boolean;
  syncIssue: string | null;
}): string | null => {
  const { allowManualFullSync, hasDualSourceConfigured, canSync, syncIssue } = params;

  if (!allowManualFullSync) {
    return 'Manual full sync is disabled by Database Engine controls.';
  }

  if (!hasDualSourceConfigured) {
    return 'Configure both local and cloud URIs in the effective env and set MONGODB_ACTIVE_SOURCE_DEFAULT in the winning file to use dual-source mode.';
  }

  if (!canSync) {
    return syncIssue !== null && syncIssue !== ''
      ? syncIssue
      : 'MongoDB source sync is unavailable right now.';
  }

  return null;
};

function MongoSyncButtons({
  buttonsDisabled,
  primaryLabel,
  secondaryLabel,
  onSync,
}: {
  buttonsDisabled: boolean;
  primaryLabel: string;
  secondaryLabel: string;
  onSync: (direction: 'cloud_to_local' | 'local_to_cloud') => void;
}): JSX.Element {
  return (
    <div className='flex flex-wrap gap-3'>
      <Button
        type='button'
        disabled={buttonsDisabled}
        onClick={() => onSync('cloud_to_local')}
      >
        {primaryLabel}
      </Button>
      <Button
        type='button'
        disabled={buttonsDisabled}
        onClick={() => onSync('local_to_cloud')}
      >
        {secondaryLabel}
      </Button>
    </div>
  );
}

export function MongoSyncCard({
  allowManualFullSync,
  hasDualSourceConfigured,
  canSync,
  syncIssue,
  syncInProgress,
  isSyncingMongoSources,
  onSync,
}: {
  allowManualFullSync: boolean;
  hasDualSourceConfigured: boolean;
  canSync: boolean;
  syncIssue: string | null;
  syncInProgress: DatabaseEngineMongoSyncInProgress | null;
  isSyncingMongoSources: boolean;
  onSync: (direction: 'cloud_to_local' | 'local_to_cloud') => void;
}): JSX.Element {
  const unavailableMessage = resolveUnavailableSyncMessage({
    allowManualFullSync,
    hasDualSourceConfigured,
    canSync,
    syncIssue,
  });

  const shouldShowSyncingState = syncInProgress !== null;
  const shouldShowButtons = unavailableMessage === null;
  const primaryLabel = shouldShowSyncingState
    ? 'Syncing...'
    : 'Pull Cloud -> Local (backup both first)';
  const secondaryLabel = shouldShowSyncingState
    ? 'Syncing...'
    : 'Push Local -> Cloud (backup both first)';
  const buttonsDisabled = shouldShowSyncingState || isSyncingMongoSources;
  const syncProgressMessage = shouldShowSyncingState
    ? `Sync in progress: ${syncInProgress.source} -> ${syncInProgress.target} since ${syncInProgress.acquiredAt}`
    : unavailableMessage;

  return (
    <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
      <h3 className='text-sm font-semibold text-white'>Local / Cloud Sync</h3>
      {syncProgressMessage !== null ? (
        <p className='text-xs leading-relaxed text-gray-300'>{syncProgressMessage}</p>
      ) : null}
      {shouldShowButtons ? (
        <MongoSyncButtons
          buttonsDisabled={buttonsDisabled}
          primaryLabel={primaryLabel}
          secondaryLabel={secondaryLabel}
          onSync={onSync}
        />
      ) : null}
    </Card>
  );
}
