'use client';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineMongoAppSyncStatus,
  DatabaseEngineMongoAppSyncStatuses,
  DatabaseEngineMongoPendingSyncRequest,
  DatabaseEngineMongoSyncInProgress,
} from '@/shared/contracts/database';
import { Button, Card, Tooltip } from '@/shared/ui/primitives.public';

import type { JSX } from 'react';

const MONGO_SYNC_APPLICATIONS: DatabaseEngineManagedMongoApplication[] = [
  'geminitestapp',
  'studiq',
  'cms-builder',
  'products',
];

const APPLICATION_LABELS: Record<DatabaseEngineManagedMongoApplication, string> = {
  geminitestapp: 'GeminiTest App',
  studiq: 'StudiQ',
  'cms-builder': 'CMS Builder',
  products: 'Products',
};

const APPLICATION_TARGET_LABELS: Record<DatabaseEngineManagedMongoApplicationTarget, string> = {
  all: 'All apps',
  ...APPLICATION_LABELS,
};

const resolveSyncEndpoints = (
  direction: 'cloud_to_local' | 'local_to_cloud'
): { source: 'cloud' | 'local'; target: 'cloud' | 'local' } =>
  direction === 'cloud_to_local'
    ? { source: 'cloud', target: 'local' }
    : { source: 'local', target: 'cloud' };

const formatSyncAction = (direction: 'cloud_to_local' | 'local_to_cloud'): string =>
  direction === 'cloud_to_local' ? 'Pulling' : 'Pushing';

const isPendingSyncTarget = (
  pendingSync: DatabaseEngineMongoPendingSyncRequest | null,
  direction: 'cloud_to_local' | 'local_to_cloud',
  application: DatabaseEngineManagedMongoApplicationTarget
): boolean =>
  pendingSync !== null &&
  pendingSync.direction === direction &&
  pendingSync.application === application;

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

function EndpointIndicator({
  label,
  configured,
  reachable,
}: {
  label: string;
  configured: boolean;
  reachable: boolean | null;
}): JSX.Element {
  const status = !configured ? 'Missing' : reachable === true ? 'Reachable' : 'Unreachable';
  const colorClass =
    status === 'Reachable'
      ? 'bg-emerald-400/15 text-emerald-200'
      : status === 'Missing'
        ? 'bg-amber-400/15 text-amber-200'
        : 'bg-red-400/15 text-red-200';

  return (
    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${colorClass}`}>
      {label}: {status}
    </span>
  );
}

function AppSyncButtons({
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
    application: DatabaseEngineManagedMongoApplication
  ) => void;
}): JSX.Element {
  const issue = status.issue ?? 'MongoDB source sync is unavailable for this application.';
  const buttonsDisabled = disabled || !status.canSync;
  const isPulling = isPendingSyncTarget(pendingSync, 'cloud_to_local', status.application);
  const isPushing = isPendingSyncTarget(pendingSync, 'local_to_cloud', status.application);

  return (
    <Tooltip content={buttonsDisabled && !status.canSync ? issue : ''} side='left'>
      <div className='flex shrink-0 flex-wrap gap-2'>
        <Button
          type='button'
          size='xs'
          disabled={buttonsDisabled}
          loading={isPulling}
          loadingText='Pulling...'
          aria-label={`Pull ${APPLICATION_LABELS[status.application]} cloud to local`}
          title={status.canSync ? undefined : issue}
          onClick={() => onSync('cloud_to_local', status.application)}
        >
          Pull
        </Button>
        <Button
          type='button'
          size='xs'
          disabled={buttonsDisabled}
          loading={isPushing}
          loadingText='Pushing...'
          aria-label={`Push ${APPLICATION_LABELS[status.application]} local to cloud`}
          title={status.canSync ? undefined : issue}
          onClick={() => onSync('local_to_cloud', status.application)}
        >
          Push
        </Button>
      </div>
    </Tooltip>
  );
}

function AppStatusRow({
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
    application: DatabaseEngineManagedMongoApplication
  ) => void;
}): JSX.Element {
  return (
    <div className='grid gap-3 border-t border-white/10 py-3 first:border-t-0 sm:grid-cols-[minmax(10rem,1fr)_minmax(14rem,1.5fr)_auto] sm:items-start'>
      <div>
        <p className='text-sm font-medium text-white'>{APPLICATION_LABELS[status.application]}</p>
        {status.issue !== null ? (
          <p className='mt-1 text-xs leading-relaxed text-amber-100'>{status.issue}</p>
        ) : null}
      </div>
      <div className='flex flex-wrap gap-2'>
        <EndpointIndicator
          label='Local'
          configured={status.localConfigured}
          reachable={status.localReachable}
        />
        <EndpointIndicator
          label='Cloud'
          configured={status.cloudConfigured}
          reachable={status.cloudReachable}
        />
      </div>
      <AppSyncButtons
        status={status}
        disabled={disabled}
        pendingSync={pendingSync}
        onSync={onSync}
      />
    </div>
  );
}

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
}: {
  allowManualFullSync: boolean;
  hasDualSourceConfigured: boolean;
  canSync: boolean;
  syncIssue: string | null;
  appStatuses: DatabaseEngineMongoAppSyncStatuses;
  syncInProgress: DatabaseEngineMongoSyncInProgress | null;
  isSyncingMongoSources: boolean;
  pendingMongoSourceSync: DatabaseEngineMongoPendingSyncRequest | null;
  onSync: (
    direction: 'cloud_to_local' | 'local_to_cloud',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => void;
}): JSX.Element {
  const appStatusList = MONGO_SYNC_APPLICATIONS.map((application) => appStatuses[application]);
  const allAppsCanSync = appStatusList.every((status) => status.canSync);
  const allAppsUnavailableMessage = resolveUnavailableSyncMessage({
    allowManualFullSync,
    hasDualSourceConfigured,
    canSync: canSync && allAppsCanSync,
    syncIssue,
  });
  const appUnavailableMessage = allowManualFullSync
    ? null
    : 'Manual full sync is disabled by Database Engine controls.';

  const shouldShowSyncingState =
    syncInProgress !== null || pendingMongoSourceSync !== null || isSyncingMongoSources;
  const primaryLabel = shouldShowSyncingState
    ? 'Syncing...'
    : 'Pull Cloud -> Local (backup all apps first)';
  const secondaryLabel = shouldShowSyncingState
    ? 'Syncing...'
    : 'Push Local -> Cloud (backup all apps first)';
  const buttonsDisabled = shouldShowSyncingState || isSyncingMongoSources;
  const pendingEndpoints =
    pendingMongoSourceSync !== null ? resolveSyncEndpoints(pendingMongoSourceSync.direction) : null;
  const syncProgressMessage =
    syncInProgress !== null
      ? `Sync in progress for ${APPLICATION_TARGET_LABELS[syncInProgress.application]}: ${syncInProgress.source} -> ${syncInProgress.target} since ${syncInProgress.acquiredAt}`
      : pendingMongoSourceSync !== null && pendingEndpoints !== null
        ? `${formatSyncAction(pendingMongoSourceSync.direction)} ${APPLICATION_TARGET_LABELS[pendingMongoSourceSync.application]}: ${pendingEndpoints.source} -> ${pendingEndpoints.target}. Started at ${pendingMongoSourceSync.startedAt}.`
        : isSyncingMongoSources
          ? 'MongoDB sync request is running.'
          : allAppsUnavailableMessage;
  const allButtonsDisabled = buttonsDisabled || allAppsUnavailableMessage !== null || !allAppsCanSync;

  return (
    <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
      <h3 className='text-sm font-semibold text-white'>Local / Cloud Sync</h3>
      {syncProgressMessage !== null ? (
        <p className='text-xs leading-relaxed text-gray-300'>{syncProgressMessage}</p>
      ) : null}
      <MongoSyncButtons
        buttonsDisabled={allButtonsDisabled}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
        pendingSync={pendingMongoSourceSync}
        onSync={(direction) => onSync(direction, 'all')}
      />
      <div className='pt-1'>
        {appStatusList.map((status) => (
          <AppStatusRow
            key={status.application}
            status={status}
            disabled={buttonsDisabled || appUnavailableMessage !== null}
            pendingSync={pendingMongoSourceSync}
            onSync={onSync}
          />
        ))}
      </div>
    </Card>
  );
}
