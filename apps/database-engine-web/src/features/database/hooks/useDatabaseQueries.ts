/**
 * Database Queries Hook
 * 
 * React Query hooks for database management operations.
 * Provides:
 * - Database backup and restore queries
 * - Sync status and operation monitoring
 * - Engine state and configuration queries
 * - Job status and progress tracking
 * - Type-safe query interfaces with automatic caching
 */

import { type QueryClient } from '@tanstack/react-query';

import type {
  DatabaseBackupFile as DatabaseInfoResponse,
  DatabaseBackupResponse,
  DatabaseEngineBackupSchedulerStatus as DatabaseEngineBackupSchedulerStatusResponse,
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineManagedMongoDatabasesResponse,
  DatabaseEngineMongoSourceState as DatabaseEngineMongoSourceStateResponse,
  DatabaseEngineMongoSyncDirection,
  DatabaseEngineMongoSyncResponse as DatabaseEngineMongoSyncResponsePayload,
  DatabaseEngineOperationsJobs as DatabaseEngineOperationsJobsResponse,
  DatabaseEngineProviderPreview as DatabaseEngineProviderPreviewResponse,
  DatabaseEngineStatus as DatabaseEngineStatusResponse,
  DatabaseRestoreResponse,
  MultiSchemaResponse,
  RedisOverview as RedisOverviewResponse,
  CrudRequest,
  CrudResult,
  DatabasePreviewMode,
  DatabasePreviewPayload,
  DatabaseType,
  DatabaseEngineManagedMongoApplication,
  MongoSource,
  SqlQueryResult,
} from '@/shared/contracts/database';
import type { ApiPayloadResult } from '@/shared/contracts/http';
import type { ListQuery, SingleQuery, MutationResult, UpdateMutation } from '@/shared/contracts/ui/queries';
import { ApiError } from '@/shared/lib/api-client';
import {
  resolvePayloadErrorMessage,
  unwrapMutationResult,
} from '@/shared/lib/mutation-error-handler';
import {
  createDeleteMutationV2,
  createListQueryV2,
  createSingleQueryV2,
  createCreateMutationV2,
  createUpdateMutationV2,
  createMutationV2,
} from '@/shared/lib/query-factories-v2';
import { dbKeys } from '@/shared/lib/query-key-exports';

import {
  createDatabaseBackup,
  createJsonBackup,
  deleteDatabaseBackup,
  executeCrudOperation,
  executeSqlQuery,
  fetchAllCollectionsSchema,
  backupDatabaseEngineManagedMongo,
  getDatabaseEngineManagedMongoDatabases,
  fetchDatabaseBackups,
  fetchDatabaseEngineBackupSchedulerStatus,
  getDatabaseEngineMongoSource,
  fetchDatabaseEngineOperationsJobs,
  fetchDatabaseEngineProviderPreview,
  fetchDatabaseEngineStatus,
  fetchDatabasePreview,
  fetchJsonBackups,
  fetchRedisOverview,
  restoreDatabaseBackup,
  restoreJsonBackup,
  syncDatabaseEngineManagedMongo,
  syncDatabaseEngineMongoSource,
  uploadDatabaseBackup,
} from '../api';

export const invalidateBackups = (queryClient: QueryClient, dbType: DatabaseType): void => {
  void queryClient.invalidateQueries({ queryKey: dbKeys.backups(dbType) });
};

export const invalidateSchemaAll = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({
    queryKey: dbKeys.schema({ provider: 'all', includeCounts: true }),
  });
};

export const invalidateEngineSchedulerStatus = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: dbKeys.engineBackupSchedulerStatus() });
};

export const invalidateEngineMongoSource = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: dbKeys.engineMongoSource() });
};

export const invalidateEngineManagedMongo = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: dbKeys.engineManagedMongo() });
};

export function useDatabaseBackups(dbType: DatabaseType): ListQuery<DatabaseInfoResponse> {
  const queryKey = dbKeys.backups(dbType);
  return createListQueryV2({
    queryKey,
    queryFn: () => fetchDatabaseBackups(dbType),
    meta: {
      source: 'database.hooks.useDatabaseBackups',
      operation: 'list',
      resource: 'system.databases.backups',
      domain: 'database',

      tags: ['database', 'backups'],
      description: 'Loads system databases backups.'},
  });
}

export function useCreateBackupMutation(): MutationResult<
  ApiPayloadResult<DatabaseBackupResponse>,
  DatabaseType
  > {
  const mutationKey = dbKeys.all;
  return createCreateMutationV2({
    mutationFn: (dbType: DatabaseType) => createDatabaseBackup(dbType),
    mutationKey,
    meta: {
      source: 'database.hooks.useCreateBackupMutation',
      operation: 'create',
      resource: 'system.databases.backups',
      domain: 'database',
      mutationKey,
      tags: ['database', 'backups', 'create'],
      description: 'Creates system databases backups.'},
    invalidateKeys: (_result, dbType) => [dbKeys.backups(dbType)],
  });
}

export function useRestoreBackupMutation(): MutationResult<
  ApiPayloadResult<DatabaseRestoreResponse>,
  { dbType: DatabaseType; backupName: string; truncateBeforeRestore: boolean }
  > {
  const mutationKey = dbKeys.all;
  return createUpdateMutationV2({
    mutationFn: (variables: {
      dbType: DatabaseType;
      backupName: string;
      truncateBeforeRestore: boolean;
    }) =>
      restoreDatabaseBackup(variables.dbType, {
        backupName: variables.backupName,
        truncateBeforeRestore: variables.truncateBeforeRestore,
      }),
    mutationKey,
    meta: {
      source: 'database.hooks.useRestoreBackupMutation',
      operation: 'update',
      resource: 'system.databases.backups.restore',
      domain: 'database',
      mutationKey,
      tags: ['database', 'backups', 'restore'],
      description: 'Updates system databases backups restore.'},
  });
}

export function useUploadBackupMutation(): MutationResult<
  ApiPayloadResult<DatabaseBackupResponse>,
  { dbType: DatabaseType; file: File; onProgress?: (loaded: number, total?: number) => void }
  > {
  const mutationKey = dbKeys.all;
  return createMutationV2({
    mutationFn: (variables: {
      dbType: DatabaseType;
      file: File;
      onProgress?: (loaded: number, total?: number) => void;
    }) => uploadDatabaseBackup(variables.dbType, variables.file, variables.onProgress),
    mutationKey,
    meta: {
      source: 'database.hooks.useUploadBackupMutation',
      operation: 'upload',
      resource: 'system.databases.backups',
      domain: 'database',
      mutationKey,
      tags: ['database', 'backups', 'upload'],
      description: 'Uploads system databases backups.'},
    invalidateKeys: (_result, variables) => [dbKeys.backups(variables.dbType)],
  });
}

export function useDeleteBackupMutation(): MutationResult<
  ApiPayloadResult<DatabaseBackupResponse>,
  { dbType: DatabaseType; backupName: string }
  > {
  const mutationKey = dbKeys.all;
  return createDeleteMutationV2({
    mutationFn: (variables: { dbType: DatabaseType; backupName: string }) =>
      deleteDatabaseBackup(variables.dbType, variables.backupName),
    mutationKey,
    meta: {
      source: 'database.hooks.useDeleteBackupMutation',
      operation: 'delete',
      resource: 'system.databases.backups',
      domain: 'database',
      mutationKey,
      tags: ['database', 'backups', 'delete'],
      description: 'Deletes system databases backups.'},
    invalidateKeys: (_result, variables) => [dbKeys.backups(variables.dbType)],
  });
}

export function useDatabasePreview(input: {
  backupName?: string | undefined;
  mode?: DatabasePreviewMode;
  type?: DatabaseType;
  page?: number;
  pageSize?: number;
  application?: DatabaseEngineManagedMongoApplication | undefined;
  source?: MongoSource | undefined;
  enabled?: boolean;
}): SingleQuery<DatabasePreviewPayload> {
  const { backupName, mode, type, page, pageSize, application, source, enabled = true } = input;
  const queryKey = dbKeys.preview({
    backupName,
    mode,
    type,
    page,
    pageSize,
    application,
    source,
  });

  return createSingleQueryV2({
    id: `${backupName ?? 'none'}:${mode ?? 'none'}:${type ?? 'none'}:${page ?? 1}:${pageSize ?? 0}`,
    queryKey,
    queryFn: async (): Promise<DatabasePreviewPayload> => {
      const result = await fetchDatabasePreview({
        backupName,
        mode: mode ?? 'current',
        type: type ?? 'mongodb',
        page,
        pageSize,
        application,
        source,
      });
      if (!result.ok) {
        const message = resolvePayloadErrorMessage(
          result.payload,
          'Failed to fetch database preview.'
        );
        throw new ApiError(message, 400);
      }
      return result.payload as DatabasePreviewPayload;
    },
    enabled: enabled && (Boolean(backupName) || mode === 'current'),
    meta: {
      source: 'database.hooks.useDatabasePreview',
      operation: 'detail',
      resource: 'system.databases.preview',
      domain: 'database',

      tags: ['database', 'preview'],
      description: 'Loads system databases preview.'},
  });
}

export function useSqlQueryMutation(): MutationResult<
  SqlQueryResult,
  {
    sql?: string;
    type: DatabaseType;
    application?: DatabaseEngineManagedMongoApplication | undefined;
    source?: MongoSource | undefined;
    collection?: string;
    operation?: string;
    filter?: Record<string, unknown>;
    document?: Record<string, unknown>;
    update?: Record<string, unknown>;
    pipeline?: Record<string, unknown>[];
    skip?: number;
    limit?: number;
    sort?: Record<string, 1 | -1>;
  }
  > {
  const mutationKey = dbKeys.all;
  return createUpdateMutationV2({
    mutationFn: (input) => executeSqlQuery(input),
    mutationKey,
    meta: {
      source: 'database.hooks.useSqlQueryMutation',
      operation: 'action',
      resource: 'system.databases.sql-query',
      domain: 'database',
      mutationKey,
      tags: ['database', 'sql', 'query'],
      description: 'Runs system databases sql query.'},
  });
}

export function useCrudMutation(): MutationResult<CrudResult, CrudRequest> {
  const mutationKey = dbKeys.all;
  return createMutationV2({
    mutationFn: (input: CrudRequest) => executeCrudOperation(input),
    mutationKey,
    meta: {
      source: 'database.hooks.useCrudMutation',
      operation: 'action',
      resource: 'system.databases.crud',
      domain: 'database',
      mutationKey,
      tags: ['database', 'crud'],
      description: 'Runs system databases crud.'},
  });
}

// ── Control Panel hooks ──

export function useAllCollectionsSchema(): SingleQuery<MultiSchemaResponse> {
  const queryKey = dbKeys.schema({ provider: 'all', includeCounts: true });
  return createSingleQueryV2({
    id: 'all-collections',
    queryKey,
    queryFn: fetchAllCollectionsSchema,
    staleTime: 30_000,
    meta: {
      source: 'database.hooks.useAllCollectionsSchema',
      operation: 'detail',
      resource: 'system.databases.schema',
      domain: 'database',

      tags: ['database', 'schema'],
      description: 'Loads system databases schema.'},
  });
}

export function useRedisOverview(limit = 200): SingleQuery<RedisOverviewResponse> {
  const queryKey = dbKeys.redisOverview({ limit });
  return createSingleQueryV2({
    id: `redis-overview-${limit}`,
    queryKey,
    queryFn: () => fetchRedisOverview(limit),
    staleTime: 15_000,
    meta: {
      source: 'database.hooks.useRedisOverview',
      operation: 'detail',
      resource: 'system.databases.redis-overview',
      domain: 'database',

      tags: ['database', 'redis', 'overview'],
      description: 'Loads system databases redis overview.'},
  });
}

export function useDatabaseEngineStatus(): SingleQuery<DatabaseEngineStatusResponse> {
  const queryKey = dbKeys.engineStatus();
  return createSingleQueryV2({
    id: 'engine-status',
    queryKey,
    queryFn: fetchDatabaseEngineStatus,
    staleTime: 10_000,
    refetchInterval: 20_000,
    meta: {
      source: 'database.hooks.useDatabaseEngineStatus',
      operation: 'polling',
      resource: 'system.databases.engine-status',
      domain: 'database',

      tags: ['database', 'engine', 'status'],
      description: 'Polls system databases engine status.'},
  });
}

export function useDatabaseEngineMongoSource(): SingleQuery<DatabaseEngineMongoSourceStateResponse> {
  const queryKey = dbKeys.engineMongoSource();
  return createSingleQueryV2({
    id: 'engine-mongo-source',
    queryKey,
    queryFn: getDatabaseEngineMongoSource,
    staleTime: 5_000,
    refetchInterval: 10_000,
    meta: {
      source: 'database.hooks.useDatabaseEngineMongoSource',
      operation: 'polling',
      resource: 'system.databases.engine-mongo-source',
      domain: 'database',
      tags: ['database', 'engine', 'mongo-source'],
      description: 'Polls the active MongoDB source state.',
    },
  });
}

export function useDatabaseEngineManagedMongoDatabases(): SingleQuery<DatabaseEngineManagedMongoDatabasesResponse> {
  const queryKey = dbKeys.engineManagedMongo();
  return createSingleQueryV2({
    id: 'engine-managed-mongo',
    queryKey,
    queryFn: getDatabaseEngineManagedMongoDatabases,
    staleTime: 15_000,
    refetchInterval: 30_000,
    meta: {
      source: 'database.hooks.useDatabaseEngineManagedMongoDatabases',
      operation: 'polling',
      resource: 'system.databases.engine-managed-mongo',
      domain: 'database',
      tags: ['database', 'engine', 'managed-mongo'],
      description: 'Polls managed MongoDB application database status.',
    },
  });
}

export function useDatabaseBackupSchedulerStatus(): SingleQuery<DatabaseEngineBackupSchedulerStatusResponse> {
  const queryKey = dbKeys.engineBackupSchedulerStatus();
  return createSingleQueryV2({
    id: 'engine-backup-scheduler-status',
    queryKey,
    queryFn: fetchDatabaseEngineBackupSchedulerStatus,
    staleTime: 10_000,
    refetchInterval: 20_000,
    meta: {
      source: 'database.hooks.useDatabaseBackupSchedulerStatus',
      operation: 'polling',
      resource: 'system.databases.backup-scheduler-status',
      domain: 'database',

      tags: ['database', 'engine', 'backup-scheduler'],
      description: 'Polls system databases backup scheduler status.'},
  });
}

export function useDatabaseEngineOperationsJobs(
  limit = 30
): SingleQuery<DatabaseEngineOperationsJobsResponse> {
  const queryKey = dbKeys.engineOperationsJobs({ limit });
  return createSingleQueryV2({
    id: `engine-operations-jobs-${limit}`,
    queryKey,
    queryFn: () => fetchDatabaseEngineOperationsJobs(limit),
    staleTime: 10_000,
    refetchInterval: 20_000,
    meta: {
      source: 'database.hooks.useDatabaseEngineOperationsJobs',
      operation: 'polling',
      resource: 'system.databases.engine-operations-jobs',
      domain: 'database',

      tags: ['database', 'engine', 'operations-jobs'],
      description: 'Polls system databases engine operations jobs.'},
  });
}

export function useDatabaseEngineProviderPreview(
  collections?: string[]
): SingleQuery<DatabaseEngineProviderPreviewResponse> {
  const queryKey = dbKeys.engineProviderPreview({
    collections: collections ?? [],
  });
  return createSingleQueryV2({
    id: `engine-provider-preview:${(collections ?? []).join(',')}`,
    queryKey,
    queryFn: () => fetchDatabaseEngineProviderPreview(collections),
    staleTime: 10_000,
    refetchInterval: 20_000,
    meta: {
      source: 'database.hooks.useDatabaseEngineProviderPreview',
      operation: 'polling',
      resource: 'system.databases.engine-provider-preview',
      domain: 'database',

      tags: ['database', 'engine', 'provider-preview'],
      description: 'Polls system databases engine provider preview.'},
  });
}

export function useSyncDatabaseEngineMongoSourceMutation(): MutationResult<
  DatabaseEngineMongoSyncResponsePayload,
  DatabaseEngineMongoSyncDirection
> {
  const mutationKey = dbKeys.all;
  return createMutationV2({
    mutationFn: (direction: DatabaseEngineMongoSyncDirection) =>
      syncDatabaseEngineMongoSource(direction),
    mutationKey,
    meta: {
      source: 'database.hooks.useSyncDatabaseEngineMongoSourceMutation',
      operation: 'action',
      resource: 'system.databases.engine-mongo-sync',
      domain: 'database',
      mutationKey,
      tags: ['database', 'engine', 'mongo-source', 'sync'],
      description: 'Synchronizes local and cloud MongoDB sources.',
    },
    invalidateKeys: [
      dbKeys.engineMongoSource(),
      dbKeys.engineStatus(),
      dbKeys.schema({ provider: 'all', includeCounts: true }),
    ],
  });
}

export function useBackupDatabaseEngineManagedMongoMutation(): MutationResult<
  DatabaseBackupResponse,
  DatabaseEngineManagedMongoApplicationTarget
> {
  const mutationKey = dbKeys.all;
  return createMutationV2({
    mutationFn: (application: DatabaseEngineManagedMongoApplicationTarget) =>
      backupDatabaseEngineManagedMongo(application),
    mutationKey,
    meta: {
      source: 'database.hooks.useBackupDatabaseEngineManagedMongoMutation',
      operation: 'action',
      resource: 'system.databases.engine-managed-mongo-backup',
      domain: 'database',
      mutationKey,
      tags: ['database', 'engine', 'managed-mongo', 'backup'],
      description: 'Creates a local backup for one or all managed MongoDB application databases.',
    },
    invalidateKeys: [
      dbKeys.backups('mongodb'),
      dbKeys.engineManagedMongo(),
    ],
  });
}

export function useSyncDatabaseEngineManagedMongoMutation(): MutationResult<
  DatabaseEngineMongoSyncResponsePayload,
  {
    direction: DatabaseEngineMongoSyncDirection;
    application: DatabaseEngineManagedMongoApplicationTarget;
  }
> {
  const mutationKey = dbKeys.all;
  return createMutationV2({
    mutationFn: (input: {
      direction: DatabaseEngineMongoSyncDirection;
      application: DatabaseEngineManagedMongoApplicationTarget;
    }) => syncDatabaseEngineManagedMongo(input.direction, input.application),
    mutationKey,
    meta: {
      source: 'database.hooks.useSyncDatabaseEngineManagedMongoMutation',
      operation: 'action',
      resource: 'system.databases.engine-managed-mongo-sync',
      domain: 'database',
      mutationKey,
      tags: ['database', 'engine', 'managed-mongo', 'sync'],
      description: 'Synchronizes managed MongoDB application databases.',
    },
    invalidateKeys: [
      dbKeys.engineManagedMongo(),
      dbKeys.engineMongoSource(),
      dbKeys.engineStatus(),
      dbKeys.schema({ provider: 'all', includeCounts: true }),
    ],
  });
}

export function useCreateJsonBackupMutation(): UpdateMutation<DatabaseBackupResponse, void> {
  const mutationKey = dbKeys.all;
  return createCreateMutationV2({
    mutationFn: async (): Promise<DatabaseBackupResponse> => {
      const result = await createJsonBackup();
      return unwrapMutationResult(result, 'Failed to create JSON backup.');
    },
    mutationKey,
    meta: {
      source: 'database.hooks.useCreateJsonBackupMutation',
      operation: 'create',
      resource: 'system.databases.json-backups',
      domain: 'database',
      mutationKey,
      tags: ['database', 'json-backups', 'create'],
      description: 'Creates system databases json backups.'},
    invalidateKeys: [dbKeys.jsonBackups()],
  });
}

export function useRestoreJsonBackupMutation(): UpdateMutation<DatabaseRestoreResponse, string> {
  const mutationKey = dbKeys.all;
  return createUpdateMutationV2({
    mutationFn: async (backupName: string): Promise<DatabaseRestoreResponse> => {
      const result = await restoreJsonBackup(backupName);
      return unwrapMutationResult(result, 'Failed to restore JSON backup.');
    },
    mutationKey,
    meta: {
      source: 'database.hooks.useRestoreJsonBackupMutation',
      operation: 'update',
      resource: 'system.databases.json-backups.restore',
      domain: 'database',
      mutationKey,
      tags: ['database', 'json-backups', 'restore'],
      description: 'Updates system databases json backups restore.'},
  });
}

export function useJsonBackups(): SingleQuery<{ backups: string[] }> {
  const queryKey = dbKeys.jsonBackups();
  return createSingleQueryV2({
    id: 'json-backups',
    queryKey,
    queryFn: fetchJsonBackups,
    meta: {
      source: 'database.hooks.useJsonBackups',
      operation: 'detail',
      resource: 'system.databases.json-backups',
      domain: 'database',

      tags: ['database', 'json-backups'],
      description: 'Loads system databases json backups.'},
  });
}
