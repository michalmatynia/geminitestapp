'use client';

import type { JSX } from 'react';

import type {
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoDatabase,
  MongoSource,
} from '@/shared/contracts/database';

import {
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from '../../context/DatabaseEngineContext';
import {
  buildManagedMongoCrudHref,
  ManagedMongoDatabaseScopeActions,
  ManagedMongoDatabaseScopeHeader,
  ManagedMongoScopePanelActions,
  ManagedMongoScopePanelHeader,
} from './ManagedMongoScopeParts';

export { buildManagedMongoCrudHref };

function getManagedMongoCardClass(isActive: boolean): string {
  const base = 'rounded-md border p-3';
  const activeStyle = 'border-emerald-400/40 bg-emerald-500/10';
  const inactiveStyle = 'border-white/10 bg-black/20';
  return `${base} ${isActive ? activeStyle : inactiveStyle}`;
}

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
    <div className={getManagedMongoCardClass(isActive)}>
      <ManagedMongoDatabaseScopeHeader
        database={database}
        isActive={isActive}
        activeSource={activeSource}
      />

      {database.syncIssue !== null && database.syncIssue !== '' && (
        <p className='mt-2 line-clamp-2 text-xs text-amber-100' title={database.syncIssue}>
          {database.syncIssue}
        </p>
      )}

      <ManagedMongoDatabaseScopeActions
        database={database}
        isLocalActive={isLocalActive}
        isCloudActive={isCloudActive}
        isBackupDisabled={isBackupDisabled}
        isPushDisabled={isPushDisabled}
        isPullDisabled={isPullDisabled}
        backupManagedMongo={backupManagedMongo}
        syncManagedMongo={syncManagedMongo}
      />
    </div>
  );
}

interface ManagedMongoDisabledStates {
  backupDisabled: boolean;
  syncDisabled: boolean;
  pullDisabled: boolean;
  cardBackupDisabled: boolean;
  isManualSyncAllowed: boolean;
  isSyncingManagedMongo: boolean;
}

const isOperationDisabled = (
  isBusy: boolean,
  isAllowed: boolean,
  canPerform: boolean
): boolean => {
  if (isBusy) return true;
  if (!isAllowed) return true;
  return !canPerform;
};

function useManagedMongoDisabledStates(): ManagedMongoDisabledStates {
  const { managedMongoDatabases, operationControls, isBackingUpManagedMongo, isSyncingManagedMongo } =
    useDatabaseEngineStateContext();

  const isManualBackupAllowed = Boolean(operationControls.allowManualBackupRunNow);
  const isManualSyncAllowed = Boolean(operationControls.allowManualFullSync);

  const canBackupAll = managedMongoDatabases?.canBackupAllLocal === true;
  const canPushAll = managedMongoDatabases?.canPushAllToCloud === true;
  const canPullAll = managedMongoDatabases?.canPullAllFromCloud === true;
  const canWriteBackups = managedMongoDatabases?.backupStorage.canWriteBackups === true;

  return {
    backupDisabled: isOperationDisabled(isBackingUpManagedMongo, isManualBackupAllowed, canBackupAll),
    syncDisabled: isOperationDisabled(isSyncingManagedMongo, isManualSyncAllowed, canPushAll),
    pullDisabled: isOperationDisabled(isSyncingManagedMongo, isManualSyncAllowed, canPullAll),
    cardBackupDisabled: isOperationDisabled(isBackingUpManagedMongo, isManualBackupAllowed, canWriteBackups),
    isManualSyncAllowed,
    isSyncingManagedMongo,
  };
}

export function ManagedMongoScopePanel({
  activeApplication,
  activeSource,
}: {
  activeApplication: DatabaseEngineManagedMongoApplication;
  activeSource: MongoSource;
}): JSX.Element {
  const { managedMongoDatabases } = useDatabaseEngineStateContext();
  const { backupManagedMongo, refetchAll, syncManagedMongo } = useDatabaseEngineActionsContext();
  const states = useManagedMongoDisabledStates();

  if (managedMongoDatabases === undefined) {
    return (
      <div className='rounded-md border border-white/10 bg-black/20 p-3 text-sm text-gray-300'>
        Loading managed MongoDB files...
      </div>
    );
  }

  return (
    <div className='space-y-3 rounded-md border border-white/10 bg-card/30 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <ManagedMongoScopePanelHeader backupRoot={managedMongoDatabases.backupRoot} />
        <ManagedMongoScopePanelActions
          backupDisabled={states.backupDisabled}
          syncDisabled={states.syncDisabled}
          pullDisabled={states.pullDisabled}
          refetchAll={refetchAll}
          backupManagedMongo={backupManagedMongo}
          syncManagedMongo={syncManagedMongo}
        />
      </div>

      <div className='grid gap-3 lg:grid-cols-2 xl:grid-cols-4'>
        {managedMongoDatabases.databases.map((database) => (
          <ManagedMongoDatabaseScopeCard
            key={database.application}
            activeApplication={activeApplication}
            activeSource={activeSource}
            backupDisabled={states.cardBackupDisabled}
            database={database}
            syncDisabled={states.isSyncingManagedMongo || !states.isManualSyncAllowed}
          />
        ))}
      </div>
    </div>
  );
}
