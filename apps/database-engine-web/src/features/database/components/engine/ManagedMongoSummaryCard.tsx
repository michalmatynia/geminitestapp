'use client';

import React from 'react';
import {
  CloudUploadIcon,
  DownloadIcon,
  RefreshCwIcon,
} from 'lucide-react';

import type {
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineManagedMongoDatabasesResponse,
} from '@/shared/contracts/database';
import { Button, Card } from '@/shared/ui/primitives.public';
import { formatBytes } from './DatabaseEngineManagedMongoParts';

function ManagedMongoSummaryStats({
  managedMongoDatabases,
}: {
  managedMongoDatabases: DatabaseEngineManagedMongoDatabasesResponse;
}): React.JSX.Element {
  return (
    <div className='space-y-1 text-xs text-gray-300'>
      <p>Backup root: {managedMongoDatabases.backupRoot}</p>
      <p>
        Backup free: {formatBytes(managedMongoDatabases.backupStorage.availableBytes)} /
        required {formatBytes(managedMongoDatabases.backupStorage.requiredFreeBytes)}
      </p>
      <p>Last checked: {managedMongoDatabases.timestamp}</p>
    </div>
  );
}

function ManagedMongoSummaryActions({
  backupDisabled,
  syncDisabled,
  pullDisabled,
  isPushingAll,
  isPullingAll,
  refetchAll,
  backupManagedMongo,
  syncManagedMongo,
}: {
  backupDisabled: boolean;
  syncDisabled: boolean;
  pullDisabled: boolean;
  isPushingAll: boolean;
  isPullingAll: boolean;
  refetchAll: () => void;
  backupManagedMongo: (application: DatabaseEngineManagedMongoApplicationTarget) => Promise<void> | void;
  syncManagedMongo: (
    direction: 'local_to_cloud' | 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => Promise<void> | void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button type='button' variant='outline' size='sm' onClick={refetchAll}>
        <RefreshCwIcon className='size-3.5' />
        Refresh
      </Button>
      <SummaryBackupButton disabled={backupDisabled} onBackup={backupManagedMongo} />
      <SummaryPushAllButton disabled={syncDisabled} loading={isPushingAll} onSync={syncManagedMongo} />
      <SummaryPullAllButton disabled={pullDisabled} loading={isPullingAll} onSync={syncManagedMongo} />
    </div>
  );
}

function SummaryBackupButton({
  disabled,
  onBackup,
}: {
  disabled: boolean;
  onBackup: (application: DatabaseEngineManagedMongoApplicationTarget) => Promise<void> | void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={disabled}
      onClick={() => {
        void onBackup('all');
      }}
    >
      <DownloadIcon className='size-3.5' />
      Backup All
    </Button>
  );
}

function SummaryPushAllButton({
  disabled,
  loading,
  onSync,
}: {
  disabled: boolean;
  loading: boolean;
  onSync: (
    direction: 'local_to_cloud',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => Promise<void> | void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      size='sm'
      disabled={disabled}
      loading={loading}
      loadingText='Pushing all...'
      onClick={() => {
        void onSync('local_to_cloud', 'all');
      }}
    >
      <CloudUploadIcon className='size-3.5' />
      Push All
    </Button>
  );
}

function SummaryPullAllButton({
  disabled,
  loading,
  onSync,
}: {
  disabled: boolean;
  loading: boolean;
  onSync: (
    direction: 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => Promise<void> | void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={disabled}
      loading={loading}
      loadingText='Pulling all...'
      onClick={() => {
        void onSync('cloud_to_local', 'all');
      }}
    >
      <RefreshCwIcon className='size-3.5' />
      Pull All
    </Button>
  );
}

export function ManagedMongoSummaryCard({
  managedMongoDatabases,
  backupDisabled,
  syncDisabled,
  pullDisabled,
  isPushingAll,
  isPullingAll,
  refetchAll,
  backupManagedMongo,
  syncManagedMongo,
}: {
  managedMongoDatabases: DatabaseEngineManagedMongoDatabasesResponse;
  backupDisabled: boolean;
  syncDisabled: boolean;
  pullDisabled: boolean;
  isPushingAll: boolean;
  isPullingAll: boolean;
  refetchAll: () => void;
  backupManagedMongo: (application: DatabaseEngineManagedMongoApplicationTarget) => Promise<void> | void;
  syncManagedMongo: (
    direction: 'local_to_cloud' | 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => Promise<void> | void;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <ManagedMongoSummaryStats managedMongoDatabases={managedMongoDatabases} />
        <ManagedMongoSummaryActions
          backupDisabled={backupDisabled}
          syncDisabled={syncDisabled}
          pullDisabled={pullDisabled}
          isPushingAll={isPushingAll}
          isPullingAll={isPullingAll}
          refetchAll={refetchAll}
          backupManagedMongo={backupManagedMongo}
          syncManagedMongo={syncManagedMongo}
        />
      </div>
      {managedMongoDatabases.issues.length > 0 && (
        <div className='space-y-1 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100'>
          {managedMongoDatabases.issues.map((issue: string) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      )}
    </Card>
  );
}
