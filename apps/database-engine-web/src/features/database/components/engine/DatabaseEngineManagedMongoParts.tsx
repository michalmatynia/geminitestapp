'use client';

import {
  DatabaseIcon,
} from 'lucide-react';
import type { JSX } from 'react';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineManagedMongoCollectionStats,
  DatabaseEngineManagedMongoDatabase,
  DatabaseEngineManagedMongoEndpoint,
  DatabaseEngineMongoPendingSyncRequest,
  MongoSource,
} from '@/shared/contracts/database';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { Card } from '@/shared/ui/primitives.public';

import { ManagedDatabaseCardActions } from './ManagedDatabaseCardActions';
import { ManagedMongoSummaryCard } from './ManagedMongoSummaryCard';

export { ManagedDatabaseCardActions, ManagedMongoSummaryCard };

const SOURCE_LABELS: Record<MongoSource, string> = {
  local: 'Local',
  cloud: 'Cloud',
};

export const isPendingSyncTarget = (
  pendingSync: DatabaseEngineMongoPendingSyncRequest | null,
  direction: 'cloud_to_local' | 'local_to_cloud',
  application: DatabaseEngineManagedMongoApplicationTarget
): boolean =>
  pendingSync !== null &&
  pendingSync.direction === direction &&
  pendingSync.application === application;

export const formatBytes = (bytes: number | null): string => {
  if (bytes === null) return 'n/a';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const getEndpointStatus = (
  endpoint: DatabaseEngineManagedMongoEndpoint
): { status: string; variant: 'active' | 'error' | 'pending' } => {
  if (!endpoint.configured) return { status: 'Not configured', variant: 'pending' };
  if (endpoint.reachable === true) return { status: 'Reachable', variant: 'active' };
  if (endpoint.reachable === false) return { status: 'Unreachable', variant: 'error' };
  return { status: 'Unknown', variant: 'pending' };
};

export function CollectionSizeList({
  collections,
}: {
  collections: DatabaseEngineManagedMongoCollectionStats[];
}): JSX.Element {
  if (collections.length === 0) {
    return <p className='text-xs text-gray-400'>No collection stats available.</p>;
  }

  return (
    <div className='max-h-52 overflow-auto rounded-md border border-white/10'>
      <table className='w-full text-left text-[11px]'>
        <thead className='sticky top-0 bg-gray-950 text-gray-400'>
          <tr>
            <th className='px-2 py-1.5 font-medium'>Collection</th>
            <th className='px-2 py-1.5 text-right font-medium'>Docs</th>
            <th className='px-2 py-1.5 text-right font-medium'>Size</th>
          </tr>
        </thead>
        <tbody>
          {collections.map((collection) => (
            <tr key={collection.name} className='border-t border-white/10 text-gray-300'>
              <td className='max-w-40 truncate px-2 py-1.5 font-mono' title={collection.name}>
                {collection.name}
              </td>
              <td className='px-2 py-1.5 text-right'>
                {collection.documentCount?.toLocaleString() ?? 'n/a'}
              </td>
              <td className='px-2 py-1.5 text-right'>
                {formatBytes(collection.totalSizeBytes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EndpointPanel({
  endpoint,
}: {
  endpoint: DatabaseEngineManagedMongoEndpoint;
}): JSX.Element {
  const status = getEndpointStatus(endpoint);

  return (
    <div className='space-y-3 rounded-md border border-white/10 bg-black/20 p-3'>
      <div className='flex items-start justify-between gap-2'>
        <div className='space-y-1'>
          <h4 className='text-xs font-semibold uppercase text-gray-300'>
            {SOURCE_LABELS[endpoint.source]}
          </h4>
          <p className='text-xs text-gray-400'>{endpoint.dbName ?? 'No database selected'}</p>
        </div>
        <StatusBadge status={status.status} variant={status.variant} size='sm' />
      </div>

      <div className='space-y-1 text-xs text-gray-300'>
        <p className='truncate' title={endpoint.maskedUri ?? ''}>
          {endpoint.maskedUri ?? 'No URI configured'}
        </p>
        <p>Database size: {formatBytes(endpoint.databaseSizeBytes)}</p>
        <p>Collections: {endpoint.collectionCount.toLocaleString()}</p>
        <p>Collection storage: {formatBytes(endpoint.collectionsSizeBytes)}</p>
        {endpoint.healthError !== null && endpoint.healthError !== '' ? <p className='text-rose-200'>{endpoint.healthError}</p> : null}
      </div>

      <CollectionSizeList collections={endpoint.collections} />
    </div>
  );
}

export function ManagedDatabaseCardHeader({
  database,
}: {
  database: DatabaseEngineManagedMongoDatabase;
}): JSX.Element {
  return (
    <div className='space-y-1'>
      <h3 className='flex items-center gap-2 text-sm font-semibold text-white'>
        <DatabaseIcon className='size-4 text-emerald-200' />
        {database.label}
      </h3>
      {database.syncIssue !== null && database.syncIssue !== '' && (
        <p className='text-xs leading-relaxed text-amber-100'>{database.syncIssue}</p>
      )}
      {database.syncDisabled && (
        <p className='text-xs leading-relaxed text-sky-100'>
          Sync disabled
          {database.syncDisabledReason !== null && database.syncDisabledReason !== ''
            ? `: ${database.syncDisabledReason}`
            : '.'}
        </p>
      )}
    </div>
  );
}

export function ManagedDatabaseCard({
  database,
  backupDisabled,
  syncDisabled,
  isTogglingSync,
  pendingSync,
  backupManagedMongo,
  setManagedMongoSyncDisabled,
  syncManagedMongo,
}: {
  database: DatabaseEngineManagedMongoDatabase;
  backupDisabled: boolean;
  syncDisabled: boolean;
  isTogglingSync: boolean;
  pendingSync: DatabaseEngineMongoPendingSyncRequest | null;
  backupManagedMongo: (application: DatabaseEngineManagedMongoApplicationTarget) => Promise<void> | void;
  setManagedMongoSyncDisabled: (
    application: DatabaseEngineManagedMongoApplication,
    disabled: boolean
  ) => Promise<void> | void;
  syncManagedMongo: (
    direction: 'local_to_cloud' | 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => Promise<void> | void;
}): JSX.Element {
  const isPushing = isPendingSyncTarget(pendingSync, 'local_to_cloud', database.application);
  const isPulling = isPendingSyncTarget(pendingSync, 'cloud_to_local', database.application);

  return (
    <Card variant='subtle' padding='md' className='space-y-4 border-white/10'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <ManagedDatabaseCardHeader database={database} />
        <ManagedDatabaseCardActions
          database={database}
          isBackupDisabled={backupDisabled || !database.canBackupLocal}
          isPushDisabled={syncDisabled || !database.canPushToCloud}
          isPullDisabled={syncDisabled || !database.canPullFromCloud}
          isPushing={isPushing}
          isPulling={isPulling}
          isTogglingSync={isTogglingSync}
          backupManagedMongo={backupManagedMongo}
          setManagedMongoSyncDisabled={setManagedMongoSyncDisabled}
          syncManagedMongo={syncManagedMongo}
        />
      </div>

      <div className='grid gap-4 xl:grid-cols-2'>
        <EndpointPanel endpoint={database.local} />
        <EndpointPanel endpoint={database.cloud} />
      </div>
    </Card>
  );
}

