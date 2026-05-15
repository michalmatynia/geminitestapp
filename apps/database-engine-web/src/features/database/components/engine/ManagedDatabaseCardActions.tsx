'use client';

import React from 'react';
import Link from 'next/link';
import {
  CloudUploadIcon,
  DownloadIcon,
  PencilIcon,
  PowerIcon,
  RefreshCwIcon,
} from 'lucide-react';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineManagedMongoDatabase,
} from '@/shared/contracts/database';
import { Button } from '@/shared/ui/primitives.public';
import { buildManagedMongoCrudHref } from '../crud/ManagedMongoScopePanel';

function ManagedDatabaseCrudActions({ application }: { application: DatabaseEngineManagedMongoApplication }): React.JSX.Element {
  return (
    <>
      <Button asChild type='button' variant='outline' size='sm'>
        <Link href={buildManagedMongoCrudHref(application, 'local')}>
          <PencilIcon className='size-3.5' />
          Local Tables
        </Link>
      </Button>
      <Button asChild type='button' variant='outline' size='sm'>
        <Link href={buildManagedMongoCrudHref(application, 'cloud')}>
          <PencilIcon className='size-3.5' />
          Cloud Tables
        </Link>
      </Button>
    </>
  );
}

function ManagedDatabaseBackupAction({
  application,
  disabled,
  onBackup,
}: {
  application: DatabaseEngineManagedMongoApplication;
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
        void onBackup(application);
      }}
    >
      <DownloadIcon className='size-3.5' />
      Backup
    </Button>
  );
}

function ManagedDatabaseSyncActions({
  application,
  syncDisabled,
  isPushDisabled,
  isPullDisabled,
  isPushing,
  isPulling,
  isTogglingSync,
  setManagedMongoSyncDisabled,
  syncManagedMongo,
}: {
  application: DatabaseEngineManagedMongoApplication;
  syncDisabled: boolean;
  isPushDisabled: boolean;
  isPullDisabled: boolean;
  isPushing: boolean;
  isPulling: boolean;
  isTogglingSync: boolean;
  setManagedMongoSyncDisabled: (
    application: DatabaseEngineManagedMongoApplication,
    disabled: boolean
  ) => Promise<void> | void;
  syncManagedMongo: (
    direction: 'local_to_cloud' | 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => Promise<void> | void;
}): React.JSX.Element {
  return (
    <>
      <SyncButton
        application={application}
        disabled={isPushDisabled}
        loading={isPushing}
        onSync={syncManagedMongo}
      />
      <ToggleButton
        application={application}
        syncDisabled={syncDisabled}
        isTogglingSync={isTogglingSync}
        onToggle={setManagedMongoSyncDisabled}
      />
      <PullButton
        application={application}
        disabled={isPullDisabled}
        loading={isPulling}
        onSync={syncManagedMongo}
      />
    </>
  );
}

function SyncButton({
  application,
  disabled,
  loading,
  onSync,
}: {
  application: DatabaseEngineManagedMongoApplication;
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
      loadingText='Pushing...'
      onClick={() => {
        void onSync('local_to_cloud', application);
      }}
    >
      <CloudUploadIcon className='size-3.5' />
      Push
    </Button>
  );
}

function ToggleButton({
  application,
  syncDisabled,
  isTogglingSync,
  onToggle,
}: {
  application: DatabaseEngineManagedMongoApplication;
  syncDisabled: boolean;
  isTogglingSync: boolean;
  onToggle: (application: DatabaseEngineManagedMongoApplication, disabled: boolean) => Promise<void> | void;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={isTogglingSync}
      loading={isTogglingSync}
      loadingText={syncDisabled ? 'Enabling...' : 'Disabling...'}
      onClick={() => {
        void onToggle(application, !syncDisabled);
      }}
    >
      <PowerIcon className='size-3.5' />
      {syncDisabled ? 'Enable Sync' : 'Disable Sync'}
    </Button>
  );
}

function PullButton({
  application,
  disabled,
  loading,
  onSync,
}: {
  application: DatabaseEngineManagedMongoApplication;
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
      loadingText='Pulling...'
      onClick={() => {
        void onSync('cloud_to_local', application);
      }}
    >
      <RefreshCwIcon className='size-3.5' />
      Pull
    </Button>
  );
}

export function ManagedDatabaseCardActions({
  database,
  isBackupDisabled,
  isPushDisabled,
  isPullDisabled,
  isPushing,
  isPulling,
  isTogglingSync,
  backupManagedMongo,
  setManagedMongoSyncDisabled,
  syncManagedMongo,
}: {
  database: DatabaseEngineManagedMongoDatabase;
  isBackupDisabled: boolean;
  isPushDisabled: boolean;
  isPullDisabled: boolean;
  isPushing: boolean;
  isPulling: boolean;
  isTogglingSync: boolean;
  backupManagedMongo: (application: DatabaseEngineManagedMongoApplicationTarget) => Promise<void> | void;
  setManagedMongoSyncDisabled: (
    application: DatabaseEngineManagedMongoApplication,
    disabled: boolean
  ) => Promise<void> | void;
  syncManagedMongo: (
    direction: 'local_to_cloud' | 'cloud_to_local',
    application: DatabaseEngineManagedMongoApplicationTarget
  ) => Promise<void> | void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <ManagedDatabaseCrudActions application={database.application} />
      <ManagedDatabaseBackupAction
        application={database.application}
        disabled={isBackupDisabled}
        onBackup={backupManagedMongo}
      />
      <ManagedDatabaseSyncActions
        application={database.application}
        syncDisabled={database.syncDisabled}
        isPushDisabled={isPushDisabled}
        isPullDisabled={isPullDisabled}
        isPushing={isPushing}
        isPulling={isPulling}
        isTogglingSync={isTogglingSync}
        setManagedMongoSyncDisabled={setManagedMongoSyncDisabled}
        syncManagedMongo={syncManagedMongo}
      />
    </div>
  );
}
