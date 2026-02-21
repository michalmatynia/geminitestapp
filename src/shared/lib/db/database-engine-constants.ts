import type {
  DatabaseEngineProviderDto,
  DatabaseEnginePrimaryProviderDto,
  DatabaseEngineServiceDto,
  DatabaseEnginePolicyDto,
  DatabaseEngineOperationControlsDto,
  DatabaseEngineBackupScheduleDto,
  DatabaseEngineBackupTargetScheduleDto,
} from '@/shared/contracts/database';

export const DATABASE_ENGINE_POLICY_KEY = 'database_engine_policy_v1';
export const DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY = 'database_engine_service_route_map_v1';
export const DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY = 'database_engine_collection_route_map_v1';
export const DATABASE_ENGINE_BACKUP_SCHEDULE_KEY = 'database_engine_backup_schedule_v1';
export const DATABASE_ENGINE_OPERATION_CONTROLS_KEY = 'database_engine_operation_controls_v1';

export type DatabaseEngineProvider = DatabaseEngineProviderDto;
export type DatabaseEnginePrimaryProvider = DatabaseEnginePrimaryProviderDto;

export type DatabaseEngineServiceRoute = DatabaseEngineServiceDto;

export type DatabaseEnginePolicy = DatabaseEnginePolicyDto;

export const DEFAULT_DATABASE_ENGINE_POLICY: DatabaseEnginePolicy = {
  requireExplicitServiceRouting: false,
  requireExplicitCollectionRouting: false,
  allowAutomaticFallback: true,
  allowAutomaticBackfill: true,
  allowAutomaticMigrations: true,
  strictProviderAvailability: false,
};

export type DatabaseEngineOperationControls = DatabaseEngineOperationControlsDto;

export const DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS: DatabaseEngineOperationControls = {
  allowManualFullSync: true,
  allowManualCollectionSync: true,
  allowManualBackfill: true,
  allowManualBackupRunNow: true,
  allowManualBackupMaintenance: true,
  allowBackupSchedulerTick: true,
  allowOperationJobCancellation: true,
};

export type DatabaseEngineBackupCadence = 'daily' | 'every_n_days' | 'weekly';
export type DatabaseEngineBackupType = 'mongodb' | 'postgresql';
export type DatabaseEngineBackupStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed';

export type DatabaseEngineBackupTargetSchedule = DatabaseEngineBackupTargetScheduleDto;

export type DatabaseEngineBackupSchedule = DatabaseEngineBackupScheduleDto;

const DEFAULT_DATABASE_ENGINE_BACKUP_TARGET_SCHEDULE: DatabaseEngineBackupTargetSchedule = {
  enabled: false,
  cadence: 'daily',
  intervalDays: 3,
  weekday: 1,
  timeUtc: '02:00',
  lastQueuedAt: null,
  lastRunAt: null,
  lastStatus: 'idle',
  lastJobId: null,
  lastError: null,
  nextDueAt: null,
};

export const DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE: DatabaseEngineBackupSchedule = {
  schedulerEnabled: false,
  repeatTickEnabled: false,
  lastCheckedAt: null,
  mongodb: { ...DEFAULT_DATABASE_ENGINE_BACKUP_TARGET_SCHEDULE },
  postgresql: { ...DEFAULT_DATABASE_ENGINE_BACKUP_TARGET_SCHEDULE },
};
