'use client';

import React from 'react';
import {
  CloudUploadIcon,
  RefreshCwIcon,
} from 'lucide-react';
import type { JSX } from 'react';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineMongoAppSyncStatus,
  DatabaseEngineMongoPendingSyncRequest,
} from '@/shared/contracts/database';
import { Button } from '@/shared/ui/primitives.public';

export const MONGO_SYNC_APPLICATIONS: DatabaseEngineManagedMongoApplication[] = [
  'geminitestapp',
  'studiq',
  'cms-builder',
  'products',
  'arch',
];

export const APPLICATION_LABELS: Record<DatabaseEngineManagedMongoApplication, string> = {
  geminitestapp: 'GeminiTest App',
  studiq: 'StudiQ',
  'cms-builder': 'CMS Builder',
  products: 'Products',
  arch: 'Milkbar Designers',
};

export const APPLICATION_TARGET_LABELS: Record<DatabaseEngineManagedMongoApplicationTarget, string> = {
  all: 'All apps',
  ...APPLICATION_LABELS,
};

export const resolveSyncEndpoints = (
  direction: 'cloud_to_local' | 'local_to_cloud'
): { source: 'cloud' | 'local'; target: 'cloud' | 'local' } =>
  direction === 'cloud_to_local'
    ? { source: 'cloud', target: 'local' }
    : { source: 'local', target: 'cloud' };

export const formatSyncAction = (direction: 'cloud_to_local' | 'local_to_cloud'): string =>
  direction === 'cloud_to_local' ? 'Pulling' : 'Pushing';

export function isPendingSyncTarget(
  pendingSync: DatabaseEngineMongoPendingSyncRequest | null,
  direction: 'cloud_to_local' | 'local_to_cloud',
  application: DatabaseEngineManagedMongoApplicationTarget
): boolean {
  return (
    pendingSync !== null &&
    pendingSync.direction === direction &&
    pendingSync.application === application
  );
}

export function EndpointIndicator({
  label,
  configured,
  reachable,
}: {
  label: string;
  configured: boolean;
  reachable: boolean | null;
}): JSX.Element {
  const getStatus = (): string => {
    if (!configured) return 'Missing';
    if (reachable === true) return 'Reachable';
    return 'Unreachable';
  };

  const status = getStatus();
  const colorMap: Record<string, string> = {
    Reachable: 'bg-emerald-400/15 text-emerald-200',
    Missing: 'bg-amber-400/15 text-amber-200',
    Unreachable: 'bg-red-400/15 text-red-200',
  };
  const colorClass = colorMap[status] ?? colorMap['Unreachable'];

  return (
    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${colorClass}`}>
      {label}: {status}
    </span>
  );
}

export function AppSyncButtons({
  application,
  disabled,
  pendingSync,
  onSync,
}: {
  application: DatabaseEngineManagedMongoApplicationTarget;
  disabled: boolean;
  pendingSync: DatabaseEngineMongoPendingSyncRequest | null;
  onSync: (
    direction: 'cloud_to_local' | 'local_to_cloud',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => void;
}): JSX.Element {
  const isPendingPush = isPendingSyncTarget(pendingSync, 'local_to_cloud', application);
  const isPendingPull = isPendingSyncTarget(pendingSync, 'cloud_to_local', application);
  const applicationLabel = APPLICATION_TARGET_LABELS[application];
  const pushLabel = `Push ${applicationLabel} local to cloud`;
  const pullLabel = `Pull ${applicationLabel} cloud to local`;

  return (
    <div className='flex gap-1'>
      <Button
        variant='ghost'
        size='xs'
        className='h-7 px-1.5'
        title={pushLabel}
        aria-label={pushLabel}
        disabled={disabled}
        loading={isPendingPush}
        onClick={() => onSync('local_to_cloud', application)}
      >
        <CloudUploadIcon className='size-3' />
      </Button>
      <Button
        variant='ghost'
        size='xs'
        className='h-7 px-1.5'
        title={pullLabel}
        aria-label={pullLabel}
        disabled={disabled}
        loading={isPendingPull}
        onClick={() => onSync('cloud_to_local', application)}
      >
        <RefreshCwIcon className='size-3' />
      </Button>
    </div>
  );
}

export function AppStatusRow({
  status,
  disabled,
  pendingSync,
  onSync,
}: {
  status: DatabaseEngineMongoAppSyncStatus;
  disabled: boolean;
  pendingSync: DatabaseEngineMongoPendingSyncRequest | null;
  onSync: (
    direction: 'cloud_to_local' | 'local_to_cloud',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => void;
}): JSX.Element {
  return (
    <div className='flex items-center justify-between border-t border-white/5 py-1.5 first:border-t-0'>
      <div className='flex items-center gap-2 overflow-hidden'>
        <span className='truncate text-xs font-medium text-gray-200'>
          {APPLICATION_LABELS[status.application]}
        </span>
        <div className='flex gap-1.5'>
          <EndpointIndicator
            label='L'
            configured={status.localConfigured}
            reachable={status.localReachable}
          />
          <EndpointIndicator
            label='C'
            configured={status.cloudConfigured}
            reachable={status.cloudReachable}
          />
        </div>
      </div>
      <AppSyncButtons
        application={status.application}
        disabled={disabled || !status.canSync}
        pendingSync={pendingSync}
        onSync={onSync}
      />
    </div>
  );
}

export function AppStatusList({
  appStatusList,
  buttonsDisabled,
  allowManualFullSync,
  pendingMongoSourceSync,
  onSync,
}: {
  appStatusList: DatabaseEngineMongoAppSyncStatus[];
  buttonsDisabled: boolean;
  allowManualFullSync: boolean;
  pendingMongoSourceSync: DatabaseEngineMongoPendingSyncRequest | null;
  onSync: (
    direction: 'cloud_to_local' | 'local_to_cloud',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => void;
}): JSX.Element {
  return (
    <div className='pt-1'>
      {appStatusList.map((status) => (
        <AppStatusRow
          key={status.application}
          status={status}
          disabled={buttonsDisabled || !allowManualFullSync}
          pendingSync={pendingMongoSourceSync}
          onSync={onSync}
        />
      ))}
    </div>
  );
}

export function MongoSyncButtons({
  buttonsDisabled,
  primaryLabel,
  secondaryLabel,
  pendingSync,
  onSync,
}: {
  buttonsDisabled: boolean;
  primaryLabel: string;
  secondaryLabel: string;
  pendingSync: DatabaseEngineMongoPendingSyncRequest | null;
  onSync: (direction: 'cloud_to_local' | 'local_to_cloud') => void;
}): JSX.Element {
  const isPullingAll = isPendingSyncTarget(pendingSync, 'cloud_to_local', 'all');
  const isPushingAll = isPendingSyncTarget(pendingSync, 'local_to_cloud', 'all');

  return (
    <div className='flex flex-wrap gap-3'>
      <Button
        type='button'
        disabled={buttonsDisabled}
        loading={isPullingAll}
        loadingText='Pulling all apps...'
        onClick={() => onSync('cloud_to_local')}
      >
        {primaryLabel}
      </Button>
      <Button
        type='button'
        disabled={buttonsDisabled}
        loading={isPushingAll}
        loadingText='Pushing all apps...'
        onClick={() => onSync('local_to_cloud')}
      >
        {secondaryLabel}
      </Button>
    </div>
  );
}

export const resolveUnavailableSyncMessage = (params: {
  allowManualFullSync: boolean;
  hasDualSourceConfigured: boolean;
  canSync: boolean;
  syncIssue: string | null;
}): string | null => {
  const { allowManualFullSync, hasDualSourceConfigured, canSync, syncIssue } = params;
  if (!allowManualFullSync) return 'Manual full sync is disabled by Database Engine controls.';
  if (!hasDualSourceConfigured) {
    return 'Configure both local and cloud URIs in the effective env and set MONGODB_ACTIVE_SOURCE_DEFAULT in the winning file to use dual-source mode.';
  }
  if (!canSync) return syncIssue !== null && syncIssue !== '' ? syncIssue : 'MongoDB source sync is unavailable.';
  return null;
};

export interface SyncConfig {
  primaryLabel: string;
  secondaryLabel: string;
  buttonsDisabled: boolean;
  allButtonsDisabled: boolean;
}

export function resolveSyncConfig(
  shouldShowSyncingState: boolean,
  allAppsUnavailableMessage: string | null,
  allAppsCanSync: boolean,
  isSyncingMongoSources: boolean
): SyncConfig {
  const primaryLabel = shouldShowSyncingState ? 'Syncing...' : 'Pull Cloud -> Local (backup all apps first)';
  const secondaryLabel = shouldShowSyncingState ? 'Syncing...' : 'Push Local -> Cloud (backup all apps first)';
  const buttonsDisabled = shouldShowSyncingState || isSyncingMongoSources;
  const allButtonsDisabled = buttonsDisabled || allAppsUnavailableMessage !== null || !allAppsCanSync;

  return { primaryLabel, secondaryLabel, buttonsDisabled, allButtonsDisabled };
}
