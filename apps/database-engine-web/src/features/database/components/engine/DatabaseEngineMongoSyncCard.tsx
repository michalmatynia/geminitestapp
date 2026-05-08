'use client';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineMongoAppSyncStatus,
  DatabaseEngineMongoAppSyncStatuses,
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
  onSync,
}: {
  status: DatabaseEngineMongoAppSyncStatus;
  disabled: boolean;
  onSync: (
    direction: 'cloud_to_local' | 'local_to_cloud',
    application: DatabaseEngineManagedMongoApplication
  ) => void;
}): JSX.Element {
  const issue = status.issue ?? 'MongoDB source sync is unavailable for this application.';
  const buttonsDisabled = disabled || !status.canSync;

  return (
    <Tooltip content={buttonsDisabled && !status.canSync ? issue : ''} side='left'>
      <div className='flex shrink-0 flex-wrap gap-2'>
        <Button
          type='button'
          size='xs'
          disabled={buttonsDisabled}
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
  onSync,
}: {
  status: DatabaseEngineMongoAppSyncStatus;
  disabled: boolean;
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
      <AppSyncButtons status={status} disabled={disabled} onSync={onSync} />
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
  onSync,
}: {
  allowManualFullSync: boolean;
  hasDualSourceConfigured: boolean;
  canSync: boolean;
  syncIssue: string | null;
  appStatuses: DatabaseEngineMongoAppSyncStatuses;
  syncInProgress: DatabaseEngineMongoSyncInProgress | null;
  isSyncingMongoSources: boolean;
  onSync: (
    direction: 'cloud_to_local' | 'local_to_cloud',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => void;
}): JSX.Element {
  const appStatusList = MONGO_SYNC_APPLICATIONS.map((application) => appStatuses[application]);
  const allAppsCanSync = appStatusList.every((status) => status.canSync);
  const unavailableMessage = resolveUnavailableSyncMessage({
    allowManualFullSync,
    hasDualSourceConfigured,
    canSync: canSync && allAppsCanSync,
    syncIssue,
  });

  const shouldShowSyncingState = syncInProgress !== null;
  const primaryLabel = shouldShowSyncingState
    ? 'Syncing...'
    : 'Pull Cloud -> Local (backup all apps first)';
  const secondaryLabel = shouldShowSyncingState
    ? 'Syncing...'
    : 'Push Local -> Cloud (backup all apps first)';
  const buttonsDisabled = shouldShowSyncingState || isSyncingMongoSources;
  const syncProgressMessage = shouldShowSyncingState
    ? `Sync in progress: ${syncInProgress.source} -> ${syncInProgress.target} since ${syncInProgress.acquiredAt}`
    : unavailableMessage;
  const allButtonsDisabled = buttonsDisabled || unavailableMessage !== null || !allAppsCanSync;

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
        onSync={(direction) => onSync(direction, 'all')}
      />
      <div className='pt-1'>
        {appStatusList.map((status) => (
          <AppStatusRow
            key={status.application}
            status={status}
            disabled={buttonsDisabled || unavailableMessage !== null}
            onSync={onSync}
          />
        ))}
      </div>
    </Card>
  );
}
