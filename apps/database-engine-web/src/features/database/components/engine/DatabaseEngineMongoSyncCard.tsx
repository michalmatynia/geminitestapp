'use client';

import React from 'react';
import type {
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineMongoAppSyncStatuses,
  DatabaseEngineMongoPendingSyncRequest,
  DatabaseEngineMongoSyncInProgress,
} from '@/shared/contracts/database';
import { Card } from '@/shared/ui/primitives.public';

import type { JSX } from 'react';
import { 
  AppStatusList,
  MongoSyncButtons, 
  MONGO_SYNC_APPLICATIONS,
  APPLICATION_TARGET_LABELS,
  resolveSyncEndpoints,
  formatSyncAction,
  resolveUnavailableSyncMessage,
  resolveSyncConfig
} from './MongoSyncAppStatus';

function SyncProgressMessage({
  syncInProgress,
  pendingMongoSourceSync,
  isSyncingMongoSources,
  allAppsUnavailableMessage,
}: {
  syncInProgress: DatabaseEngineMongoSyncInProgress | null;
  pendingMongoSourceSync: DatabaseEngineMongoPendingSyncRequest | null;
  isSyncingMongoSources: boolean;
  allAppsUnavailableMessage: string | null;
}): JSX.Element | null {
  const message = ((): string | null => {
    if (syncInProgress !== null) {
      return `Sync in progress for ${APPLICATION_TARGET_LABELS[syncInProgress.application]}: ${syncInProgress.source} -> ${syncInProgress.target} since ${syncInProgress.acquiredAt}`;
    }
    if (pendingMongoSourceSync !== null) {
      const endpoints = resolveSyncEndpoints(pendingMongoSourceSync.direction);
      return `${formatSyncAction(pendingMongoSourceSync.direction)} ${APPLICATION_TARGET_LABELS[pendingMongoSourceSync.application]}: ${endpoints.source} -> ${endpoints.target}. Started at ${pendingMongoSourceSync.startedAt}.`;
    }
    if (isSyncingMongoSources) return 'MongoDB sync request is running.';
    return allAppsUnavailableMessage;
  })();

  if (message === null) return null;
  return <p className='text-xs leading-relaxed text-gray-300'>{message}</p>;
}

interface MongoSyncCardProps {
  allowManualFullSync: boolean;
  hasDualSourceConfigured: boolean;
  canSync: boolean;
  syncIssue: string | null;
  appStatuses: DatabaseEngineMongoAppSyncStatuses;
  syncInProgress: DatabaseEngineMongoSyncInProgress | null;
  isSyncingMongoSources: boolean;
  pendingMongoSourceSync: DatabaseEngineMongoPendingSyncRequest | null;
  onSync: (
    dir: 'cloud_to_local' | 'local_to_cloud',
    app: DatabaseEngineManagedMongoApplicationTarget
  ) => void;
}

/**
 * MongoSyncCard: Primary interface for triggering and monitoring database synchronization.
 * It provides users with visibility into current sync status and control over push/pull operations
 * for all managed MongoDB applications.
 */
export function MongoSyncCard({
  allowManualFullSync,
  hasDualSourceConfigured,
  canSync,
  syncIssue,
  appStatuses,
  syncInProgress,
  isSyncingMongoSources,
  pendingMongoSourceSync,
  onSync,
}: MongoSyncCardProps): JSX.Element {
  // Determine if all apps can participate in a manual sync based on individual status.
  const appStatusList = MONGO_SYNC_APPLICATIONS.map((application) => appStatuses[application]);
  const allAppsCanSync = appStatusList.every((status) => status.canSync);
  
  // Resolve potential blocking issues that prevent manual sync execution.
  const allAppsUnavailableMessage = resolveUnavailableSyncMessage({
    allowManualFullSync,
    hasDualSourceConfigured,
    canSync: canSync && allAppsCanSync,
    syncIssue,
  });

  // Calculate button states and primary UI labels based on sync activity status.
  const config = resolveSyncConfig(
    syncInProgress !== null || pendingMongoSourceSync !== null || isSyncingMongoSources,
    allAppsUnavailableMessage,
    allAppsCanSync,
    isSyncingMongoSources
  );

  return (
    <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
      <h3 className='text-sm font-semibold text-white'>Local / Cloud Sync</h3>
      {/* SyncProgressMessage conditionally displays the current activity or sync errors. */}
      <SyncProgressMessage
        syncInProgress={syncInProgress}
        pendingMongoSourceSync={pendingMongoSourceSync}
        isSyncingMongoSources={isSyncingMongoSources}
        allAppsUnavailableMessage={allAppsUnavailableMessage}
      />
      {/* MongoSyncButtons allow batch operations: Pull All apps or Push All apps. */}
      <MongoSyncButtons
        buttonsDisabled={config.allButtonsDisabled}
        primaryLabel={config.primaryLabel}
        secondaryLabel={config.secondaryLabel}
        pendingSync={pendingMongoSourceSync}
        onSync={(direction) => onSync(direction, 'all')}
      />
      {/* AppStatusList enumerates individual app sync statuses and their local/cloud endpoints. */}
      <AppStatusList
        appStatusList={appStatusList}
        buttonsDisabled={config.buttonsDisabled}
        allowManualFullSync={allowManualFullSync}
        pendingMongoSourceSync={pendingMongoSourceSync}
        onSync={onSync}
      />
    </Card>
  );
}
