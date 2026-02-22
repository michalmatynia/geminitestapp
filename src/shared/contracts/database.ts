import { z } from 'zod';
 

import { dtoBaseSchema } from './base';


export const databaseTypeSchema = z.enum(['postgresql', 'mongodb']);
export type DatabaseTypeDto = z.infer<typeof databaseTypeSchema>;
export type DatabaseType = DatabaseTypeDto;

export const databaseSyncDirectionSchema = z.enum(['mongo_to_prisma', 'prisma_to_mongo']);
export type DatabaseSyncDirectionDto = z.infer<typeof databaseSyncDirectionSchema>;
export type DatabaseSyncDirection = DatabaseSyncDirectionDto;

export const databasePreviewModeSchema = z.enum(['full', 'stats', 'tables', 'counts', 'current', 'backup']);
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

export const databasePreviewRowSchema = z.record(z.string(), z.unknown());

export type DatabasePreviewRowDto = z.infer<typeof databasePreviewRowSchema>;
export type DatabasePreviewRow = DatabasePreviewRowDto;
export type SqlQueryResultRow = DatabasePreviewRowDto;

export const databaseTablePreviewDataSchema = z.object({
  name: z.string(),
  rows: z.array(databasePreviewRowSchema),
  totalRows: z.number(),
});

export type DatabaseTablePreviewDataDto = z.infer<typeof databaseTablePreviewDataSchema>;
export type DatabaseTablePreviewData = DatabaseTablePreviewDataDto;

export const databasePreviewPayloadSchema = z.object({
  type: databaseTypeSchema.optional(),
  mode: databasePreviewModeSchema.optional(),
  groups: z.array(databasePreviewGroupSchema).optional(),
  tables: z.array(databasePreviewTableSchema).optional(),
  tableRows: z.array(databaseTablePreviewDataSchema).optional(),
  tableDetails: z.array(z.lazy(() => databaseTableDetailSchema)).optional(),
  enums: z.array(z.lazy(() => databaseEnumInfoDto)).optional(),
  databaseSize: z.string().optional(),
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
  lastModifiedAt: z.string().optional(),
  lastRestored: z.string().optional(),
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
  log: z.string().nullable().optional(),
  error: z.string().optional(),
  errorId: z.string().optional(),
  stage: z.string().optional(),
  jobId: z.string().optional(),
  warning: z.string().optional(),
});

export type DatabaseBackupOperationResponseDto = z.infer<typeof databaseBackupOperationResponseSchema>;
export type DatabaseBackupResponse = DatabaseBackupOperationResponseDto;

export const databaseRestoreOperationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  log: z.string().nullable().optional(),
  error: z.string().optional(),
  errorId: z.string().optional(),
  stage: z.string().optional(),
  backupName: z.string().optional(),
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
  repeatTickEnabled: z.boolean(),
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
  error: z.string().nullable().optional(),
});

export type SqlQueryResultDto = z.infer<typeof sqlQueryResultSchema>;
export type SqlQueryResult = SqlQueryResultDto;

export const crudOperationSchema = z.enum(['create', 'read', 'update', 'delete']);
export type CrudOperationDto = z.infer<typeof crudOperationSchema>;
export type CrudOperation = CrudOperationDto;

export const crudRequestSchema = z.object({
  provider: z.enum(['mongodb', 'prisma', 'postgresql']),
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
  defaultValue: z.unknown().nullable(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
});

export type DatabaseColumnInfoDto = z.infer<typeof databaseColumnInfoSchema>;
export type DatabaseColumnInfo = DatabaseColumnInfoDto;

export const databaseIndexInfoSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  isUnique: z.boolean(),
  definition: z.string().optional(),
});

export type DatabaseIndexInfoDto = z.infer<typeof databaseIndexInfoSchema>;
export type DatabaseIndexInfo = DatabaseIndexInfoDto;

export const databaseForeignKeyInfoSchema = z.object({
  name: z.string(),
  column: z.string(),
  referencedTable: z.string(),
  referencedColumn: z.string(),
  onDelete: z.string().optional(),
  onUpdate: z.string().optional(),
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
  indexes: z.array(databaseIndexInfoSchema),
  foreignKeys: z.array(databaseForeignKeyInfoSchema),
  rowEstimate: z.number().default(0),
  sizeFormatted: z.string().default(''),
});

export type DatabaseTableDetailDto = z.infer<typeof databaseTableDetailSchema>;
export type DatabaseTableDetail = DatabaseTableDetailDto;

export interface FieldInfoDto {
  name: string;
  type: string;
  nullable?: boolean;
  isRequired?: boolean | null;
  isId?: boolean | null;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean | null;
  hasDefault?: boolean | null;
  relationTo?: string | null;
}

export type FieldSchema = FieldInfoDto;

export interface CollectionSchemaDto {
  name: string;
  fields: FieldInfoDto[];
  count?: number;
  documentCount?: number;
  provider?: string;
  relations?: string[];
  [key: string]: unknown;
}

export type CollectionSchema = CollectionSchemaDto;

export const schemaProviderSchema = z.enum(['prisma', 'mongodb', 'multi']);
export type SchemaProviderDto = z.infer<typeof schemaProviderSchema>;
export type SchemaProvider = SchemaProviderDto;

export interface MultiSchemaResponseDto {
  provider: string;
  collections: CollectionSchemaDto[];
  sources?: Record<string, Record<string, unknown>>;
}

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

export type DatabaseEngineWorkspaceViewDto = 'engine' | 'operations' | 'backups' | 'redis' | 'preview' | 'crud';

export interface UnifiedCollectionDto {
  name: string;
  existsInMongo: boolean;
  existsInPrisma: boolean;
  mongoDocumentCount: number | null;
  prismaRowCount: number | null;
  mongoFieldCount: number | null;
  prismaFieldCount: number | null;
  assignedProvider: 'mongodb' | 'prisma' | 'auto';
}

export const databaseEngineCollectionProviderPreviewItemSchema = z.object({
  collection: z.string(),
  configuredProvider: z.string().nullable(),
  effectiveProvider: z.string().nullable(),
  source: z.enum(['collection_route', 'app_provider', 'error']),
  error: z.string().nullable(),
});

export type DatabaseEngineCollectionProviderPreviewItemDto = z.infer<typeof databaseEngineCollectionProviderPreviewItemSchema>;

export const databaseEngineProviderPreviewSchema = z.object({
  timestamp: z.string().optional(),
  policy: z.record(z.string(), z.unknown()).optional(),
  appProvider: z.string().nullable().optional(),
  appProviderError: z.string().nullable().optional(),
  provider: z.string().optional(),
  collections: z.array(z.object({
    name: z.string().optional(),
    collection: z.string().optional(),
    count: z.number().optional(),
    sizeBytes: z.number().nullable().optional(),
    configuredProvider: z.string().nullable().optional(),
    effectiveProvider: z.string().nullable().optional(),
    source: z.string().optional(),
    error: z.string().nullable().optional(),
  })),
});

export type DatabaseEngineProviderPreviewDto = z.infer<typeof databaseEngineProviderPreviewSchema>;

export type DatabaseCollectionCopyResultDto = DatabaseSyncCollectionResultDto;
export type CollectionCopyResult = DatabaseCollectionCopyResultDto;

export const databaseEngineBackupRunNowResponseSchema = z.object({
  success: z.boolean(),
  queued: z.array(z.object({
    dbType: z.enum(['mongodb', 'postgresql']),
    jobId: z.string(),
  })),
  inlineProcessed: z.array(z.object({
    dbType: z.enum(['mongodb', 'postgresql']),
    jobId: z.string(),
  })),
});

export type DatabaseEngineBackupRunNowResponseDto = z.infer<typeof databaseEngineBackupRunNowResponseSchema>;

export const databaseEngineBackupSchedulerStatusSchema = z.object({
  timestamp: z.string().optional(),
  enabled: z.boolean().optional(),
  schedulerEnabled: z.boolean().optional(),
  repeatTickEnabled: z.boolean().optional(),
  lastCheckedAt: z.string().nullable().optional(),
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

export type AiQuery = {
  id: string;
  query: string;
  timestamp: string;
};
export type DatabasePresetOption = {
  id: string;
  label: string;
  description?: string;
  config?: unknown;
};

export const settingsBackfillResultSchema = z.object({
  matched: z.number(),
  modified: z.number(),
  remaining: z.number(),
  sampleIds: z.array(z.string()).optional(),
});

export type SettingsBackfillResultDto = z.infer<typeof settingsBackfillResultSchema>;
export type SettingsBackfillResult = SettingsBackfillResultDto;

export interface SettingsBackfillResultDto {
  matched: number;
  modified: number;
  remaining: number;
  sampleIds?: string[];
}
