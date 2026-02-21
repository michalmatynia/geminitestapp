import { z } from 'zod';
 

import { dtoBaseSchema } from './base';


export const databaseTypeSchema = z.enum(['postgresql', 'mongodb']);
export type DatabaseTypeDto = z.infer<typeof databaseTypeSchema>;
export type DatabaseType = DatabaseTypeDto;

export const databaseSyncDirectionSchema = z.enum(['mongo_to_prisma', 'prisma_to_mongo']);
export type DatabaseSyncDirectionDto = z.infer<typeof databaseSyncDirectionSchema>;
export type DatabaseSyncDirection = DatabaseSyncDirectionDto;

export const databasePreviewModeSchema = z.enum(['full', 'stats', 'tables', 'counts']);
export type DatabasePreviewModeDto = z.infer<typeof databasePreviewModeSchema>;
export type DatabasePreviewMode = DatabasePreviewModeDto;

export const databasePreviewGroupSchema = z.object({
  type: z.string(),
  objects: z.array(z.string()),
});

export type DatabasePreviewGroupDto = z.infer<typeof databasePreviewGroupSchema>;
export type DatabasePreviewGroup = DatabasePreviewGroupDto;

export const databasePreviewTableSchema = z.object({
  name: z.string(),
  rows: z.number(),
});

export type DatabasePreviewTableDto = z.infer<typeof databasePreviewTableSchema>;
export type DatabasePreviewTable = DatabasePreviewTableDto;

export const databasePreviewRowSchema = z.record(z.string(), z.any());

export type DatabasePreviewRowDto = z.infer<typeof databasePreviewRowSchema>;
export type DatabasePreviewRow = DatabasePreviewRowDto;
export type SqlQueryResultRow = DatabasePreviewRowDto;

export const databasePreviewPayloadSchema = z.object({
  type: databaseTypeSchema.optional(),
  mode: databasePreviewModeSchema.optional(),
  groups: z.array(databasePreviewGroupSchema).optional(),
  tables: z.array(databasePreviewTableSchema).optional(),
  tableRows: z.array(databasePreviewRowSchema).optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  total: z.number().optional(),
});

export type DatabasePreviewPayloadDto = z.infer<typeof databasePreviewPayloadSchema>;
export type DatabasePreviewPayload = DatabasePreviewPayloadDto;

export const databaseBackupFileSchema = z.object({
  name: z.string(),
  size: z.number(),
  createdAt: z.string(),
});

export type DatabaseBackupFileDto = z.infer<typeof databaseBackupFileSchema>;

export const databaseBackupResultSchema = z.object({
  message: z.string(),
  backupName: z.string(),
  log: z.string().optional(),
  warning: z.string().optional(),
});

export type DatabaseBackupResultDto = z.infer<typeof databaseBackupResultSchema>;

export const fullDatabaseBackupResultSchema = z.object({
  mongo: databaseBackupResultSchema,
  postgres: databaseBackupResultSchema,
});

export type FullDatabaseBackupResultDto = z.infer<typeof fullDatabaseBackupResultSchema>;

export const databaseBrowseParamsSchema = z.object({
  collection: z.string(),
  limit: z.number().optional(),
  skip: z.number().optional(),
  query: z.string().optional(),
});

export type DatabaseBrowseParamsDto = z.infer<typeof databaseBrowseParamsSchema>;

export const databaseBrowseSchema = z.object({
  provider: z.enum(['mongodb', 'postgresql', 'prisma']),
  collection: z.string(),
  documents: z.array(z.record(z.string(), z.unknown())),
  total: z.number(),
  limit: z.number(),
  skip: z.number(),
});

export type DatabaseBrowseDto = z.infer<typeof databaseBrowseSchema>;
export type DatabaseInfo = DatabaseBackupFileDto;

export const databaseBackupOperationResponseSchema = z.object({
  success: z.boolean(),
  backupName: z.string().optional(),
  message: z.string().optional(),
});

export type DatabaseBackupOperationResponseDto = z.infer<typeof databaseBackupOperationResponseSchema>;
export type DatabaseBackupResponse = DatabaseBackupOperationResponseDto;

export const databaseRestoreOperationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type DatabaseRestoreOperationResponseDto = z.infer<typeof databaseRestoreOperationResponseSchema>;
export type DatabaseRestoreResponse = DatabaseRestoreOperationResponseDto;

/**
 * Database Sync DTOs
 */

export const databaseSyncOptionsSchema = z.object({
  skipCollections: z.array(z.string()).optional(),
  skipAuthCollections: z.boolean().optional(),
  includeCollections: z.array(z.string()).optional(),
  dryRun: z.boolean().optional(),
  verbose: z.boolean().optional(),
});

export type DatabaseSyncOptionsDto = z.infer<typeof databaseSyncOptionsSchema>;

export const databaseSyncCollectionResultSchema = z.object({
  name: z.string(),
  status: z.enum(['completed', 'failed', 'skipped']),
  sourceCount: z.number(),
  targetDeleted: z.number(),
  targetInserted: z.number(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export type DatabaseSyncCollectionResultDto = z.infer<typeof databaseSyncCollectionResultSchema>;

export const databaseSyncResultSchema = z.object({
  direction: databaseSyncDirectionSchema,
  startedAt: z.string(),
  finishedAt: z.string(),
  backups: z.any().optional(),
  collections: z.array(databaseSyncCollectionResultSchema),
});

export type DatabaseSyncResultDto = z.infer<typeof databaseSyncResultSchema>;

/**
 * Database Engine DTOs
 */

export const databaseEngineProviderSchema = z.enum(['mongodb', 'prisma', 'redis']);
export type DatabaseEngineProviderDto = z.infer<typeof databaseEngineProviderSchema>;

export const databaseEnginePrimaryProviderSchema = z.enum(['mongodb', 'prisma']);
export type DatabaseEnginePrimaryProviderDto = z.infer<typeof databaseEnginePrimaryProviderSchema>;

export const databaseEngineServiceSchema = z.enum(['app', 'auth', 'product', 'integrations', 'cms']);
export type DatabaseEngineServiceDto = z.infer<typeof databaseEngineServiceSchema>;

export const databaseEnginePolicySchema = z.object({
  requireExplicitServiceRouting: z.boolean(),
  requireExplicitCollectionRouting: z.boolean(),
  allowAutomaticFallback: z.boolean(),
  allowAutomaticBackfill: z.boolean(),
  allowAutomaticMigrations: z.boolean(),
  strictProviderAvailability: z.boolean(),
});

export type DatabaseEnginePolicyDto = z.infer<typeof databaseEnginePolicySchema>;

export const databaseEngineOperationControlsSchema = z.object({
  allowManualFullSync: z.boolean(),
  allowManualCollectionSync: z.boolean(),
  allowManualBackfill: z.boolean(),
  allowManualBackupRunNow: z.boolean(),
  allowManualBackupMaintenance: z.boolean(),
  allowBackupSchedulerTick: z.boolean(),
  allowOperationJobCancellation: z.boolean(),
});

export type DatabaseEngineOperationControlsDto = z.infer<typeof databaseEngineOperationControlsSchema>;

export const databaseEngineBackupTargetScheduleSchema = z.object({
  enabled: z.boolean(),
  cadence: z.enum(['daily', 'every_n_days', 'weekly']),
  intervalDays: z.number(),
  weekday: z.number(),
  timeUtc: z.string(),
  lastQueuedAt: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  lastStatus: z.enum(['idle', 'queued', 'running', 'success', 'failed']),
  lastJobId: z.string().nullable(),
  lastError: z.string().nullable(),
  nextDueAt: z.string().nullable(),
});

export type DatabaseEngineBackupTargetScheduleDto = z.infer<typeof databaseEngineBackupTargetScheduleSchema>;

export const databaseEngineBackupScheduleSchema = z.object({
  schedulerEnabled: z.boolean(),
  lastCheckedAt: z.string().nullable(),
  mongodb: databaseEngineBackupTargetScheduleSchema,
  postgresql: databaseEngineBackupTargetScheduleSchema,
});

export type DatabaseEngineBackupScheduleDto = z.infer<typeof databaseEngineBackupScheduleSchema>;

export const sqlQueryFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
});

export type SqlQueryFieldDto = z.infer<typeof sqlQueryFieldSchema>;
export type SqlQueryField = SqlQueryFieldDto;

export const sqlQueryResultSchema = z.object({
  fields: z.array(sqlQueryFieldSchema),
  rows: z.array(databasePreviewRowSchema),
  rowCount: z.number(),
  executionTimeMs: z.number(),
});

export type SqlQueryResultDto = z.infer<typeof sqlQueryResultSchema>;
export type SqlQueryResult = SqlQueryResultDto;

export const crudOperationSchema = z.enum(['create', 'read', 'update', 'delete']);
export type CrudOperationDto = z.infer<typeof crudOperationSchema>;
export type CrudOperation = CrudOperationDto;

export const crudRequestSchema = z.object({
  provider: z.enum(['mongodb', 'prisma']),
  collection: z.string(),
  operation: crudOperationSchema,
  filter: z.record(z.string(), z.any()).optional(),
  data: z.record(z.string(), z.any()).optional(),
  id: z.string().optional(),
});

export type CrudRequestDto = z.infer<typeof crudRequestSchema>;
export type CrudRequest = CrudRequestDto;

export const crudResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type CrudResultDto = z.infer<typeof crudResultSchema>;
export type CrudResult = CrudResultDto;

export const databaseColumnInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  defaultValue: z.any().nullable(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
});

export type DatabaseColumnInfoDto = z.infer<typeof databaseColumnInfoSchema>;
export type DatabaseColumnInfo = DatabaseColumnInfoDto;

export const databaseIndexInfoSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  isUnique: z.boolean(),
});

export type DatabaseIndexInfoDto = z.infer<typeof databaseIndexInfoSchema>;
export type DatabaseIndexInfo = DatabaseIndexInfoDto;

export const databaseForeignKeyInfoSchema = z.object({
  columnName: z.string(),
  referencedTable: z.string(),
  referencedColumn: z.string(),
});

export type DatabaseForeignKeyInfoDto = z.infer<typeof databaseForeignKeyInfoSchema>;
export type DatabaseForeignKeyInfo = DatabaseForeignKeyInfoDto;

export const databaseEnumInfoDto = z.object({
  name: z.string(),
  values: z.array(z.string()),
});

export type DatabaseEnumInfoDto = z.infer<typeof databaseEnumInfoDto>;
export type DatabaseEnumInfo = DatabaseEnumInfoDto;

export const databaseTableDetailSchema = z.object({
  name: z.string(),
  columns: z.array(databaseColumnInfoSchema),
  indices: z.array(databaseIndexInfoSchema),
  foreignKeys: z.array(databaseForeignKeyInfoSchema),
});

export type DatabaseTableDetailDto = z.infer<typeof databaseTableDetailSchema>;
export type DatabaseTableDetail = DatabaseTableDetailDto;

export const fieldInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean().optional(),
  isRequired: z.boolean().nullable().optional(),
  isId: z.boolean().nullable().optional(),
  isPrimaryKey: z.boolean().optional(),
  isForeignKey: z.boolean().optional(),
  isUnique: z.boolean().nullable().optional(),
  hasDefault: z.boolean().nullable().optional(),
  relationTo: z.string().nullable().optional(),
});

export type FieldInfoDto = z.infer<typeof fieldInfoSchema>;
export type FieldSchema = FieldInfoDto;

export const collectionSchemaSchema = z.object({
  name: z.string(),
  fields: z.array(fieldInfoSchema),
  count: z.number().optional(),
  documentCount: z.number().optional(),
  provider: z.string().optional(),
}).catchall(z.any());

export type CollectionSchemaDto = z.infer<typeof collectionSchemaSchema>;
export type CollectionSchema = CollectionSchemaDto;

export const schemaProviderSchema = z.enum(['prisma', 'mongodb', 'multi']);
export type SchemaProviderDto = z.infer<typeof schemaProviderSchema>;
export type SchemaProvider = SchemaProviderDto;

export const multiSchemaResponseSchema = z.object({
  provider: z.string(),
  collections: z.union([
    z.record(z.string(), collectionSchemaSchema),
    z.array(collectionSchemaSchema.and(z.object({ provider: z.string().optional() })))
  ]),
  sources: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

export type MultiSchemaResponseDto = z.infer<typeof multiSchemaResponseSchema>;
export type SchemaResponseDto = MultiSchemaResponseDto;
export type SchemaResponsePayloadDto = SchemaResponseDto;
export type SchemaResponse = SchemaResponseDto;
export type SchemaData = SchemaResponseDto;

export const databaseEngineOperationJobSchema = dtoBaseSchema.extend({
  status: z.enum(['queued', 'running', 'completed', 'failed', 'canceled']),
  type: z.string(),
  dbType: z.string().nullable().optional(),
  direction: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  resultSummary: z.union([z.string(), z.record(z.string(), z.unknown())]).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  progress: z.number().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
});

export type DatabaseEngineOperationJobDto = z.infer<typeof databaseEngineOperationJobSchema>;

export const databaseEngineOperationsJobsSchema = z.object({
  timestamp: z.string(),
  queueStatus: z.record(z.string(), z.unknown()),
  jobs: z.array(databaseEngineOperationJobSchema),
});

export type DatabaseEngineOperationsJobsDto = z.infer<typeof databaseEngineOperationsJobsSchema>;

export const databaseEngineProviderPreviewSchema = z.object({
  timestamp: z.string().optional(),
  policy: z.record(z.string(), z.unknown()).optional(),
  appProvider: z.string().optional(),
  appProviderError: z.string().nullable().optional(),
  provider: z.string().optional(),
  collections: z.array(z.object({
    name: z.string().optional(),
    collection: z.string().optional(),
    count: z.number().optional(),
    sizeBytes: z.number().nullable().optional(),
    configuredProvider: z.string().optional(),
    effectiveProvider: z.string().optional(),
    source: z.string().optional(),
    error: z.string().nullable().optional(),
  })),
});

export type DatabaseEngineProviderPreviewDto = z.infer<typeof databaseEngineProviderPreviewSchema>;

export const databaseCollectionCopyResultSchema = z.object({
  success: z.boolean(),
  itemsCopied: z.number(),
  errors: z.array(z.string()),
});

export type DatabaseCollectionCopyResultDto = z.infer<typeof databaseCollectionCopyResultSchema>;

export const databaseEngineBackupRunNowResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
});

export type DatabaseEngineBackupRunNowResponseDto = z.infer<typeof databaseEngineBackupRunNowResponseSchema>;

export const databaseEngineBackupSchedulerStatusSchema = z.object({
  timestamp: z.string().optional(),
  enabled: z.boolean().optional(),
  schedulerEnabled: z.boolean().optional(),
  lastCheckedAt: z.string().optional(),
  nextRunAt: z.string().nullable().optional(),
  lastRunAt: z.string().nullable().optional(),
  lastRunStatus: z.string().nullable().optional(),
  queue: z.record(z.string(), z.unknown()).optional(),
  repeatEveryMs: z.number().optional(),
  targets: z.record(z.string(), z.any()).optional(),
});

export type DatabaseEngineBackupSchedulerStatusDto = z.infer<typeof databaseEngineBackupSchedulerStatusSchema>;

export const databaseEngineBackupSchedulerTickResultSchema = z.object({
  checkedAt: z.string(),
  schedulerEnabled: z.boolean(),
  triggered: z.array(z.object({
    dbType: z.string(),
    jobId: z.string(),
  })),
  skipped: z.array(z.object({
    dbType: z.string(),
    reason: z.string(),
  })),
});

export type DatabaseEngineBackupSchedulerTickResultDto = z.infer<typeof databaseEngineBackupSchedulerTickResultSchema>;

export const databaseEngineBackupSchedulerTickResponseSchema = z.object({
  executed: z.boolean(),
  jobsQueued: z.number(),
});

export type DatabaseEngineBackupSchedulerTickResponseDto = z.infer<typeof databaseEngineBackupSchedulerTickResponseSchema>;

/**
 * Database Engine Status DTOs
 */

export const databaseEngineCollectionStatusSchema = z.object({
  knownCollections: z.array(z.string()),
  configuredCount: z.number(),
  missingExplicitRoutes: z.array(z.string()),
  orphanedRoutes: z.array(z.string()),
  unavailableConfiguredRoutes: z.array(z.object({
    collection: z.string(),
    provider: z.string(),
  })),
});

export type DatabaseEngineCollectionStatusDto = z.infer<typeof databaseEngineCollectionStatusSchema>;

export const databaseEngineServiceStatusSchema = z.object({
  service: z.string(),
  configuredProvider: z.string().nullable(),
  effectiveProvider: z.string().nullable(),
  missingExplicitRoute: z.boolean(),
  unsupportedConfiguredProvider: z.boolean(),
  unavailableConfiguredProvider: z.boolean(),
  resolutionError: z.string().nullable(),
});

export type DatabaseEngineServiceStatusDto = z.infer<typeof databaseEngineServiceStatusSchema>;

export const databaseEngineStatusSchema = z.object({
  timestamp: z.string(),
  policy: databaseEnginePolicySchema,
  providers: z.object({
    prismaConfigured: z.boolean(),
    mongodbConfigured: z.boolean(),
    redisConfigured: z.boolean(),
  }),
  serviceRouteMap: z.record(z.string(), z.string()),
  collectionRouteMap: z.record(z.string(), z.string()),
  services: z.array(databaseEngineServiceStatusSchema),
  collections: databaseEngineCollectionStatusSchema,
  blockingIssues: z.array(z.string()),
});

export type DatabaseEngineStatusDto = z.infer<typeof databaseEngineStatusSchema>;

export const redisNamespaceSchema = z.object({
  namespace: z.string(),
  keyCount: z.number(),
  sampleKeys: z.array(z.string()),
});

export const redisStatusSchema = z.object({
  enabled: z.boolean(),
  connected: z.boolean(),
  urlConfigured: z.boolean(),
  dbSize: z.number(),
  usedMemory: z.string().nullable(),
  maxMemory: z.string().nullable(),
  namespaces: z.array(redisNamespaceSchema),
  sampleKeys: z.array(z.string()),
  status: z.string().optional(),
  version: z.string().optional(),
  keysCount: z.number().optional(),
  memoryUsed: z.string().nullable().optional(),
  uptime: z.string().optional(),
  clients: z.number().optional(),
});

export type RedisStatusDto = z.infer<typeof redisStatusSchema>;
export type RedisOverviewDto = RedisStatusDto;

export type AiQuery = unknown;
export type DatabasePresetOption = unknown;
