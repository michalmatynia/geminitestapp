'use client';

import { FormSection } from '@/shared/ui/forms-and-actions.public';
import {
  useDatabaseEngineActionsContext,
  useDatabaseEngineStateContext,
} from '../../context/DatabaseEngineContext';
import {
  ManagedDatabaseCard,
  ManagedMongoSummaryCard,
  isPendingSyncTarget,
} from './DatabaseEngineManagedMongoParts';

function useManagedMongoState(): {
  managedMongoDatabases: DatabaseEngineManagedMongoDatabasesResponse | undefined;
  isBackingUpManagedMongo: boolean;
  isMongoSyncBusy: boolean;
  isManualBackupAllowed: boolean;
  isManualSyncAllowed: boolean;
  pendingMongoSourceSync: DatabaseEngineMongoPendingSyncRequest | null;
} {
  const {
    managedMongoDatabases,
    operationControls,
    isBackingUpManagedMongo,
    isSyncingManagedMongo,
    isSyncingMongoSources,
    mongoSourceState,
    pendingMongoSourceSync,
  } = useDatabaseEngineStateContext();

  const isManualBackupAllowed = Boolean(operationControls.allowManualBackupRunNow);
  const isManualSyncAllowed = Boolean(operationControls.allowManualFullSync);

  const isMongoSyncBusy =
    isSyncingManagedMongo ||
    isSyncingMongoSources ||
    pendingMongoSourceSync !== null ||
    mongoSourceState?.syncInProgress !== null;

  return {
    managedMongoDatabases,
    isBackingUpManagedMongo,
    isMongoSyncBusy,
    isManualBackupAllowed,
    isManualSyncAllowed,
    pendingMongoSourceSync,
  };
}

export function DatabaseEngineManagedMongoSection(): JSX.Element {
  const { backupManagedMongo, syncManagedMongo, refetchAll } = useDatabaseEngineActionsContext();
  const state = useManagedMongoState();

  if (state.managedMongoDatabases === undefined) {
    return (
      <FormSection title='Managed Application Databases'>
        <p className='text-sm text-muted-foreground'>Loading managed database status...</p>
      </FormSection>
    );
  }

  const { managedMongoDatabases: db } = state as { managedMongoDatabases: DatabaseEngineManagedMongoDatabasesResponse };

  const backupDisabled = state.isBackingUpManagedMongo || !state.isManualBackupAllowed || Boolean(db.canBackupAllLocal) === false;
  const syncDisabled = state.isMongoSyncBusy || !state.isManualSyncAllowed || Boolean(db.canPushAllToCloud) === false;
  const pullDisabled = state.isMongoSyncBusy || !state.isManualSyncAllowed || Boolean(db.canPullFromCloud) === false;
  
  const isPushingAll = isPendingSyncTarget(state.pendingMongoSourceSync, 'local_to_cloud', 'all');
  const isPullingAll = isPendingSyncTarget(state.pendingMongoSourceSync, 'cloud_to_local', 'all');

  return (
    <FormSection title='Managed Application Databases' className='space-y-0'>
      <div className='space-y-4'>
        <ManagedMongoSummaryCard
          managedMongoDatabases={db}
          backupDisabled={backupDisabled}
          syncDisabled={syncDisabled}
          pullDisabled={pullDisabled}
          isPushingAll={isPushingAll}
          isPullingAll={isPullingAll}
          refetchAll={refetchAll}
          backupManagedMongo={backupManagedMongo}
          syncManagedMongo={syncManagedMongo}
        />

        {db.databases.map((database) => (
          <ManagedDatabaseCard
            key={database.application}
            database={database}
            backupDisabled={
              state.isBackingUpManagedMongo ||
              !state.isManualBackupAllowed ||
              Boolean(db.backupStorage.canWriteBackups) === false
            }
            syncDisabled={state.isMongoSyncBusy || !state.isManualSyncAllowed}
            pendingSync={state.pendingMongoSourceSync}
            backupManagedMongo={backupManagedMongo}
            syncManagedMongo={syncManagedMongo}
          />
        ))}
      </div>
    </FormSection>
  );
}
