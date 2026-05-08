'use client';

import Link from 'next/link';
import { CloudUploadIcon, DatabaseIcon, DownloadIcon, PencilIcon, RefreshCwIcon } from 'lucide-react';
import type { JSX } from 'react';

import type {
  DatabaseEngineManagedMongoCollectionStats,
  DatabaseEngineManagedMongoDatabase,
  DatabaseEngineManagedMongoEndpoint,
  MongoSource,
} from '@/shared/contracts/database';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Button, Card } from '@/shared/ui/primitives.public';

import {
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from '../../context/DatabaseEngineContext';
import { buildManagedMongoCrudHref } from '../crud/ManagedMongoScopePanel';

const SOURCE_LABELS: Record<MongoSource, string> = {
  local: 'Local',
  cloud: 'Cloud',
};

const formatBytes = (bytes: number | null): string => {
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

function CollectionSizeList({
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

function EndpointPanel({
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
        {endpoint.healthError ? <p className='text-rose-200'>{endpoint.healthError}</p> : null}
      </div>

      <CollectionSizeList collections={endpoint.collections} />
    </div>
  );
}

function ManagedDatabaseCard({
  database,
  backupDisabled,
  syncDisabled,
}: {
  database: DatabaseEngineManagedMongoDatabase;
  backupDisabled: boolean;
  syncDisabled: boolean;
}): JSX.Element {
  const { backupManagedMongo, syncManagedMongo } = useDatabaseEngineActionsContext();
  const isBackupDisabled = backupDisabled || !database.canBackupLocal;
  const isPushDisabled = syncDisabled || !database.canPushToCloud;
  const isPullDisabled = syncDisabled || !database.canPullFromCloud;

  return (
    <Card variant='subtle' padding='md' className='space-y-4 border-white/10'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h3 className='flex items-center gap-2 text-sm font-semibold text-white'>
            <DatabaseIcon className='size-4 text-emerald-200' />
            {database.label}
          </h3>
          {database.syncIssue ? (
            <p className='text-xs leading-relaxed text-amber-100'>{database.syncIssue}</p>
          ) : null}
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild type='button' variant='outline' size='sm'>
            <Link href={buildManagedMongoCrudHref(database.application, 'local')}>
              <PencilIcon className='size-3.5' />
              Local Tables
            </Link>
          </Button>
          <Button asChild type='button' variant='outline' size='sm'>
            <Link href={buildManagedMongoCrudHref(database.application, 'cloud')}>
              <PencilIcon className='size-3.5' />
              Cloud Tables
            </Link>
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={isBackupDisabled}
            onClick={() => {
              void backupManagedMongo(database.application);
            }}
          >
            <DownloadIcon className='size-3.5' />
            Backup
          </Button>
          <Button
            type='button'
            size='sm'
            disabled={isPushDisabled}
            onClick={() => {
              void syncManagedMongo('local_to_cloud', database.application);
            }}
          >
            <CloudUploadIcon className='size-3.5' />
            Push
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={isPullDisabled}
            onClick={() => {
              void syncManagedMongo('cloud_to_local', database.application);
            }}
          >
            <RefreshCwIcon className='size-3.5' />
            Pull
          </Button>
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-2'>
        <EndpointPanel endpoint={database.local} />
        <EndpointPanel endpoint={database.cloud} />
      </div>
    </Card>
  );
}

export function DatabaseEngineManagedMongoSection(): JSX.Element {
  const {
    managedMongoDatabases,
    operationControls,
    isBackingUpManagedMongo,
    isSyncingManagedMongo,
  } = useDatabaseEngineStateContext();
  const { backupManagedMongo, syncManagedMongo, refetchAll } = useDatabaseEngineActionsContext();

  if (managedMongoDatabases === undefined) {
    return (
      <FormSection title='Managed Application Databases'>
        <p className='text-sm text-muted-foreground'>Loading managed database status...</p>
      </FormSection>
    );
  }

  const backupDisabled =
    isBackingUpManagedMongo ||
    !operationControls.allowManualBackupRunNow ||
    !managedMongoDatabases.canBackupAllLocal;
  const backupStorageDisabled = !managedMongoDatabases.backupStorage.canWriteBackups;
  const syncDisabled =
    isSyncingManagedMongo ||
    !operationControls.allowManualFullSync ||
    !managedMongoDatabases.canPushAllToCloud;
  const pullDisabled =
    isSyncingManagedMongo ||
    !operationControls.allowManualFullSync ||
    !managedMongoDatabases.canPullAllFromCloud;

  return (
    <FormSection title='Managed Application Databases' className='space-y-0'>
      <div className='space-y-4'>
        <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='space-y-1 text-xs text-gray-300'>
              <p>Backup root: {managedMongoDatabases.backupRoot}</p>
              <p>
                Backup free: {formatBytes(managedMongoDatabases.backupStorage.availableBytes)} /
                required {formatBytes(managedMongoDatabases.backupStorage.requiredFreeBytes)}
              </p>
              <p>Last checked: {managedMongoDatabases.timestamp}</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button type='button' variant='outline' size='sm' onClick={refetchAll}>
                <RefreshCwIcon className='size-3.5' />
                Refresh
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={backupDisabled}
                onClick={() => {
                  void backupManagedMongo('all');
                }}
              >
                <DownloadIcon className='size-3.5' />
                Backup All
              </Button>
              <Button
                type='button'
                size='sm'
                disabled={syncDisabled}
                onClick={() => {
                  void syncManagedMongo('local_to_cloud', 'all');
                }}
              >
                <CloudUploadIcon className='size-3.5' />
                Push All
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={pullDisabled}
                onClick={() => {
                  void syncManagedMongo('cloud_to_local', 'all');
                }}
              >
                <RefreshCwIcon className='size-3.5' />
                Pull All
              </Button>
            </div>
          </div>
          {managedMongoDatabases.issues.length > 0 ? (
            <div className='space-y-1 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100'>
              {managedMongoDatabases.issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          ) : null}
        </Card>

        {managedMongoDatabases.databases.map((database) => (
          <ManagedDatabaseCard
            key={database.application}
            database={database}
            backupDisabled={
              isBackingUpManagedMongo ||
              !operationControls.allowManualBackupRunNow ||
              backupStorageDisabled
            }
            syncDisabled={isSyncingManagedMongo || !operationControls.allowManualFullSync}
          />
        ))}
      </div>
    </FormSection>
  );
}
