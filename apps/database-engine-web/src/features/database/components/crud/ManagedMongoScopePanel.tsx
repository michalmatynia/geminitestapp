'use client';

import { CloudUploadIcon, DownloadIcon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoDatabase,
  MongoSource,
} from '@/shared/contracts/database';
import { Badge, Button } from '@/shared/ui/primitives.public';

import {
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from '../../context/DatabaseEngineContext';

const SOURCE_LABELS: Record<MongoSource, string> = {
  local: 'Local',
  cloud: 'Cloud',
};

export const buildManagedMongoCrudHref = (
  application: DatabaseEngineManagedMongoApplication,
  source: MongoSource = 'local'
): string =>
  `/admin/databases/engine?view=crud&application=${encodeURIComponent(
    application
  )}&source=${source}`;

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

const getEndpointStatusLabel = (
  endpoint: DatabaseEngineManagedMongoDatabase['local']
): string => {
  if (!endpoint.configured) return 'not configured';
  if (endpoint.reachable === true) return 'ready';
  if (endpoint.reachable === false) return 'unreachable';
  return 'unknown';
};

function ManagedMongoDatabaseScopeCard({
  activeApplication,
  activeSource,
  backupDisabled,
  database,
  syncDisabled,
}: {
  activeApplication: DatabaseEngineManagedMongoApplication;
  activeSource: MongoSource;
  backupDisabled: boolean;
  database: DatabaseEngineManagedMongoDatabase;
  syncDisabled: boolean;
}): JSX.Element {
  const { backupManagedMongo, syncManagedMongo } = useDatabaseEngineActionsContext();
  const isActive = database.application === activeApplication;
  const isLocalActive = isActive && activeSource === 'local';
  const isCloudActive = isActive && activeSource === 'cloud';
  const isBackupDisabled = backupDisabled || !database.canBackupLocal;
  const isPushDisabled = syncDisabled || !database.canPushToCloud;
  const isPullDisabled = syncDisabled || !database.canPullFromCloud;

  return (
    <div
      className={`rounded-md border p-3 ${
        isActive
          ? 'border-emerald-400/40 bg-emerald-500/10'
          : 'border-white/10 bg-black/20'
      }`}
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 space-y-1'>
          <h3 className='truncate text-sm font-semibold text-white'>{database.label}</h3>
          <p className='text-xs text-gray-400'>
            Local {getEndpointStatusLabel(database.local)} - Cloud{' '}
            {getEndpointStatusLabel(database.cloud)}
          </p>
          <p className='text-xs text-gray-400'>
            Local {database.local.collectionCount.toLocaleString()} collections -{' '}
            {formatBytes(database.local.databaseSizeBytes)}
          </p>
          <p className='text-xs text-gray-400'>
            Cloud {database.cloud.collectionCount.toLocaleString()} collections -{' '}
            {formatBytes(database.cloud.databaseSizeBytes)}
          </p>
        </div>
        <Badge variant={isActive ? 'active' : 'outline'} className='border-white/10 text-xs'>
          {isActive ? `Open ${SOURCE_LABELS[activeSource]}` : 'Available'}
        </Badge>
      </div>

      {database.syncIssue !== null && database.syncIssue !== '' ? (
        <p className='mt-2 line-clamp-2 text-xs text-amber-100' title={database.syncIssue}>
          {database.syncIssue}
        </p>
      ) : null}

      <div className='mt-3 flex flex-wrap gap-2'>
        <Button asChild variant={isLocalActive ? 'secondary' : 'outline'} size='xs'>
          <Link href={buildManagedMongoCrudHref(database.application, 'local')}>Local Tables</Link>
        </Button>
        <Button asChild variant={isCloudActive ? 'secondary' : 'outline'} size='xs'>
          <Link href={buildManagedMongoCrudHref(database.application, 'cloud')}>Cloud Tables</Link>
        </Button>
        <Button
          type='button'
          variant='outline'
          size='xs'
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
          size='xs'
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
          size='xs'
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
  );
}

export function ManagedMongoScopePanel({
  activeApplication,
  activeSource,
}: {
  activeApplication: DatabaseEngineManagedMongoApplication;
  activeSource: MongoSource;
}): JSX.Element {
  const {
    managedMongoDatabases,
    operationControls,
    isBackingUpManagedMongo,
    isSyncingManagedMongo,
  } = useDatabaseEngineStateContext();
  const { backupManagedMongo, refetchAll, syncManagedMongo } = useDatabaseEngineActionsContext();

  if (managedMongoDatabases === undefined) {
    return (
      <div className='rounded-md border border-white/10 bg-black/20 p-3 text-sm text-gray-300'>
        Loading managed MongoDB files...
      </div>
    );
  }

  const backupDisabled =
    isBackingUpManagedMongo ||
    !operationControls.allowManualBackupRunNow ||
    !managedMongoDatabases.canBackupAllLocal;
  const syncDisabled =
    isSyncingManagedMongo ||
    !operationControls.allowManualFullSync ||
    !managedMongoDatabases.canPushAllToCloud;
  const pullDisabled =
    isSyncingManagedMongo ||
    !operationControls.allowManualFullSync ||
    !managedMongoDatabases.canPullAllFromCloud;
  const cardBackupDisabled =
    isBackingUpManagedMongo ||
    !operationControls.allowManualBackupRunNow ||
    !managedMongoDatabases.backupStorage.canWriteBackups;
  const cardSyncDisabled = isSyncingManagedMongo || !operationControls.allowManualFullSync;

  return (
    <div className='space-y-3 rounded-md border border-white/10 bg-card/30 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='space-y-1'>
          <h2 className='text-sm font-semibold text-white'>Managed MongoDB Files</h2>
          <p className='text-xs text-gray-400'>
            Backup root: {managedMongoDatabases.backupRoot}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' size='xs' onClick={refetchAll}>
            <RefreshCwIcon className='size-3.5' />
            Refresh
          </Button>
          <Button
            type='button'
            variant='outline'
            size='xs'
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
            size='xs'
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
            size='xs'
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

      <div className='grid gap-3 lg:grid-cols-2 xl:grid-cols-4'>
        {managedMongoDatabases.databases.map((database) => (
          <ManagedMongoDatabaseScopeCard
            key={database.application}
            activeApplication={activeApplication}
            activeSource={activeSource}
            backupDisabled={cardBackupDisabled}
            database={database}
            syncDisabled={cardSyncDisabled}
          />
        ))}
      </div>
    </div>
  );
}
