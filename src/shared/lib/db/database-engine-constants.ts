/**
 * Database Engine Constants
 * 
 * Central registry for Database Engine related constants, settings keys,
 * and default configuration objects. This module provides:
 * - Settings keys for policy, routing, backups, and operation controls.
 * - Default policy and operation control objects.
 * - Shared types for database providers and services.
 */

import type {
  DatabaseEngineProvider,
  DatabaseEnginePrimaryProvider,
  DatabaseEngineService,
  DatabaseEnginePolicy,
  DatabaseEngineOperationControls,
  DatabaseEngineBackupSchedule,
  DatabaseEngineBackupTargetSchedule,
} from '@/shared/contracts/database';
import type { AppProviderValue as DatabaseEngineBackupType } from '@/shared/contracts/system';

export type {
  DatabaseEngineProvider,
  DatabaseEnginePrimaryProvider,
  DatabaseEnginePolicy,
  DatabaseEngineOperationControls,
  DatabaseEngineBackupSchedule,
  DatabaseEngineBackupTargetSchedule,
  DatabaseEngineBackupType,
};

/** Key for Database Engine policy settings. */
export const DATABASE_ENGINE_POLICY_KEY = 'database_engine_policy_v1';

/** Key for Database Engine service routing map. */
export const DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY = 'database_engine_service_route_map_v1';

/** Key for Database Engine collection routing map. */
export const DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY = 'database_engine_collection_route_map_v1';

/** Key for Database Engine backup schedule settings. */
export const DATABASE_ENGINE_BACKUP_SCHEDULE_KEY = 'database_engine_backup_schedule_v1';

/** Key for Database Engine operation control settings. */
export const DATABASE_ENGINE_OPERATION_CONTROLS_KEY = 'database_engine_operation_controls_v1';

/** Key for per-application managed MongoDB sync controls. */
export const DATABASE_ENGINE_MANAGED_MONGO_SYNC_CONTROLS_KEY =
  'database_engine_managed_mongo_sync_controls_v1';

/** Alias for DatabaseEngineService used in routing maps. */
export type DatabaseEngineServiceRoute = DatabaseEngineService;

/**
 * Default policy for the Database Engine.
 * By default, explicit routing is NOT required, and automatic fallbacks/migrations are allowed.
 */
export const DEFAULT_DATABASE_ENGINE_POLICY: DatabaseEnginePolicy = {
  requireExplicitServiceRouting: false,
  requireExplicitCollectionRouting: false,
  allowAutomaticFallback: true,
  allowAutomaticBackfill: true,
  allowAutomaticMigrations: true,
  strictProviderAvailability: false,
};

/**
 * Default operation controls for the Database Engine.
 * Controls manual actions and automated scheduler ticks.
 */
export const DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS: DatabaseEngineOperationControls = {
  allowManualFullSync: true,
  allowManualCollectionSync: true,
  allowManualBackfill: true,
  allowManualBackupRunNow: true,
  allowManualBackupMaintenance: true,
  allowBackupSchedulerTick: true,
  allowOperationJobCancellation: true,
};

/** Supported backup cadences. */
export type DatabaseEngineBackupCadence = 'daily' | 'every_n_days' | 'weekly';

/** Status of a backup job. */
export type DatabaseEngineBackupStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed';

/** Internal default for a single backup target (e.g., MongoDB). */
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

/**
 * Default backup schedule for the entire Database Engine.
 */
export const DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE: DatabaseEngineBackupSchedule = {
  schedulerEnabled: false,
  repeatTickEnabled: false,
  lastCheckedAt: null,
  mongodb: { ...DEFAULT_DATABASE_ENGINE_BACKUP_TARGET_SCHEDULE },
};
