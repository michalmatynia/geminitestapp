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

const getEndpointStatusLabel = (
  endpoint: DatabaseEngineManagedMongoDatabase['local']
): string => {
  if (!endpoint.configured) return 'not configured';
  if (endpoint.reachable === true) return 'ready';
  if (endpoint.reachable === false) return 'unreachable';
  return 'unknown';
};

export const buildManagedMongoCrudHref = (
  application: DatabaseEngineManagedMongoApplication,
  source: MongoSource = 'local'
): string =>
  `/admin/databases/engine?view=crud&application=${encodeURIComponent(
    application
  )}&source=${source}`;

export function ManagedMongoDatabaseScopeHeader({
  database,
  isActive,
  activeSource,
}: {
  database: DatabaseEngineManagedMongoDatabase;
  isActive: boolean;
  activeSource: MongoSource;
}): JSX.Element {
  return (
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
  );
}

function ManagedMongoActionButtons({
  database,
  isBackupDisabled,
  isPushDisabled,
  isPullDisabled,
  backupManagedMongo,
  syncManagedMongo,
}: {
  database: DatabaseEngineManagedMongoDatabase;
  isBackupDisabled: boolean;
  isPushDisabled: boolean;
  isPullDisabled: boolean;
  backupManagedMongo: (application: DatabaseEngineManagedMongoApplication) => Promise<void> | void;
  syncManagedMongo: (
    direction: 'local_to_cloud' | 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplication | 'all'
  ) => Promise<void> | void;
}): JSX.Element {
  return (
    <>
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
    </>
  );
}

export function ManagedMongoDatabaseScopeActions({
  database,
  isLocalActive,
  isCloudActive,
  isBackupDisabled,
  isPushDisabled,
  isPullDisabled,
  backupManagedMongo,
  syncManagedMongo,
}: {
  database: DatabaseEngineManagedMongoDatabase;
  isLocalActive: boolean;
  isCloudActive: boolean;
  isBackupDisabled: boolean;
  isPushDisabled: boolean;
  isPullDisabled: boolean;
  backupManagedMongo: (application: DatabaseEngineManagedMongoApplication) => Promise<void> | void;
  syncManagedMongo: (
    direction: 'local_to_cloud' | 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplication | 'all'
  ) => Promise<void> | void;
}): JSX.Element {
  return (
    <div className='mt-3 flex flex-wrap gap-2'>
      <Button asChild variant={isLocalActive ? 'secondary' : 'outline'} size='xs'>
        <Link href={buildManagedMongoCrudHref(database.application, 'local')}>Local Tables</Link>
      </Button>
      <Button asChild variant={isCloudActive ? 'secondary' : 'outline'} size='xs'>
        <Link href={buildManagedMongoCrudHref(database.application, 'cloud')}>Cloud Tables</Link>
      </Button>
      <ManagedMongoActionButtons
        database={database}
        isBackupDisabled={isBackupDisabled}
        isPushDisabled={isPushDisabled}
        isPullDisabled={isPullDisabled}
        backupManagedMongo={backupManagedMongo}
        syncManagedMongo={syncManagedMongo}
      />
    </div>
  );
}

export function ManagedMongoScopePanelHeader({
  backupRoot,
}: {
  backupRoot: string;
}): JSX.Element {
  return (
    <div className='space-y-1'>
      <h2 className='text-sm font-semibold text-white'>Managed MongoDB Files</h2>
      <p className='text-xs text-gray-400'>
        Backup root: {backupRoot}
      </p>
    </div>
  );
}

function ManagedMongoBulkActionButtons({
  backupDisabled,
  syncDisabled,
  pullDisabled,
  backupManagedMongo,
  syncManagedMongo,
}: {
  backupDisabled: boolean;
  syncDisabled: boolean;
  pullDisabled: boolean;
  backupManagedMongo: (application: DatabaseEngineManagedMongoApplication | 'all') => Promise<void> | void;
  syncManagedMongo: (
    direction: 'local_to_cloud' | 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplication | 'all'
  ) => Promise<void> | void;
}): JSX.Element {
  return (
    <>
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
    </>
  );
}

export function ManagedMongoScopePanelActions({
  backupDisabled,
  syncDisabled,
  pullDisabled,
  refetchAll,
  backupManagedMongo,
  syncManagedMongo,
}: {
  backupDisabled: boolean;
  syncDisabled: boolean;
  pullDisabled: boolean;
  refetchAll: () => void;
  backupManagedMongo: (application: DatabaseEngineManagedMongoApplication | 'all') => Promise<void> | void;
  syncManagedMongo: (
    direction: 'local_to_cloud' | 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplication | 'all'
  ) => Promise<void> | void;
}): JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button type='button' variant='outline' size='xs' onClick={refetchAll}>
        <RefreshCwIcon className='size-3.5' />
        Refresh
      </Button>
      <ManagedMongoBulkActionButtons
        backupDisabled={backupDisabled}
        syncDisabled={syncDisabled}
        pullDisabled={pullDisabled}
        backupManagedMongo={backupManagedMongo}
        syncManagedMongo={syncManagedMongo}
      />
    </div>
  );
}
