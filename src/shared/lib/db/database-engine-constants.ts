export const DATABASE_ENGINE_POLICY_KEY = 'database_engine_policy_v1';
export const DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY = 'database_engine_service_route_map_v1';
export const DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY = 'database_engine_collection_route_map_v1';
export const DATABASE_ENGINE_BACKUP_SCHEDULE_KEY = 'database_engine_backup_schedule_v1';

export type DatabaseEngineProvider = 'prisma' | 'mongodb' | 'redis';
export type DatabaseEnginePrimaryProvider = 'prisma' | 'mongodb';

export type DatabaseEngineServiceRoute =
  | 'app'
  | 'auth'
  | 'product'
  | 'integrations'
  | 'cms';

export type DatabaseEnginePolicy = {
  requireExplicitServiceRouting: boolean;
  requireExplicitCollectionRouting: boolean;
  allowAutomaticFallback: boolean;
  allowAutomaticBackfill: boolean;
  allowAutomaticMigrations: boolean;
  strictProviderAvailability: boolean;
};

export const DEFAULT_DATABASE_ENGINE_POLICY: DatabaseEnginePolicy = {
  requireExplicitServiceRouting: false,
  requireExplicitCollectionRouting: false,
  allowAutomaticFallback: true,
  allowAutomaticBackfill: true,
  allowAutomaticMigrations: true,
  strictProviderAvailability: false,
};

export type DatabaseEngineBackupCadence = 'daily' | 'every_n_days' | 'weekly';
export type DatabaseEngineBackupType = 'mongodb' | 'postgresql';
export type DatabaseEngineBackupStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed';

export type DatabaseEngineBackupTargetSchedule = {
  enabled: boolean;
  cadence: DatabaseEngineBackupCadence;
  intervalDays: number;
  weekday: number;
  timeUtc: string;
  lastQueuedAt: string | null;
  lastRunAt: string | null;
  lastStatus: DatabaseEngineBackupStatus;
  lastJobId: string | null;
  lastError: string | null;
  nextDueAt: string | null;
};

export type DatabaseEngineBackupSchedule = {
  schedulerEnabled: boolean;
  lastCheckedAt: string | null;
  mongodb: DatabaseEngineBackupTargetSchedule;
  postgresql: DatabaseEngineBackupTargetSchedule;
};

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
  lastCheckedAt: null,
  mongodb: { ...DEFAULT_DATABASE_ENGINE_BACKUP_TARGET_SCHEDULE },
  postgresql: { ...DEFAULT_DATABASE_ENGINE_BACKUP_TARGET_SCHEDULE },
};
