import { z } from 'zod';
 

import { dtoBaseSchema } from './base';


export const databaseTypeSchema = z.enum(['postgresql', 'mongodb']);
export type DatabaseType = z.infer<typeof databaseTypeSchema>;

export const databaseSyncDirectionSchema = z.enum(['mongo_to_prisma', 'prisma_to_mongo']);
export type DatabaseSyncDirection = z.infer<typeof databaseSyncDirectionSchema>;

export const databasePreviewModeSchema = z.enum(['full', 'stats', 'tables', 'counts', 'current', 'backup']);
export type DatabasePreviewMode = z.infer<typeof databasePreviewModeSchema>;

export const databasePreviewGroupSchema = z.object({
  type: z.string(),
  objects: z.array(z.string()),
});

export type DatabasePreviewGroup = z.infer<typeof databasePreviewGroupSchema>;

export const databasePreviewTableSchema = z.object({
  name: z.string(),
  rows: z.number(),
});

export type DatabasePreviewTable = z.infer<typeof databasePreviewTableSchema>;

export const databasePreviewRowSchema = z.record(z.string(), z.unknown());

export type DatabasePreviewRow = z.infer<typeof databasePreviewRowSchema>;
export type SqlQueryResultRow = DatabasePreviewRow;

export const databaseTablePreviewDataSchema = z.object({
  name: z.string(),
  rows: z.array(databasePreviewRowSchema),
  totalRows: z.number(),
});

export type DatabaseTablePreviewData = z.infer<typeof databaseTablePreviewDataSchema>;

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

export type DatabasePreviewPayload = z.infer<typeof databasePreviewPayloadSchema>;

export const databasePreviewRequestSchema = z.object({
  type: databaseTypeSchema,
  mode: databasePreviewModeSchema,
  backupName: z.string().nullable().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  table: z.string().optional(),
  search: z.string().optional(),
});

export type DatabasePreviewRequest = z.infer<typeof databasePreviewRequestSchema>;

export const databaseBackupFileSchema = z.object({
  name: z.string(),
  size: z.number(),
  createdAt: z.string(),
  lastModifiedAt: z.string().optional(),
  lastRestored: z.string().optional(),
});

export type DatabaseBackupFile = z.infer<typeof databaseBackupFileSchema>;

export const databaseBackupResultSchema = z.object({
  message: z.string(),
  backupName: z.string(),
  log: z.string().optional(),
  warning: z.string().optional(),
});

export type DatabaseBackupResult = z.infer<typeof databaseBackupResultSchema>;

export const fullDatabaseBackupResultSchema = z.object({
  mongo: databaseBackupResultSchema,
  postgres: databaseBackupResultSchema,
});

export type FullDatabaseBackupResult = z.infer<typeof fullDatabaseBackupResultSchema>;

export const databaseBrowseParamsSchema = z.object({
  collection: z.string(),
  limit: z.number().optional(),
  skip: z.number().optional(),
  query: z.string().optional(),
});

export type DatabaseBrowseParams = z.infer<typeof databaseBrowseParamsSchema>;

export const databaseBrowseSchema = z.object({
  provider: z.enum(['mongodb', 'postgresql', 'prisma']),
  collection: z.string(),
  documents: z.array(z.record(z.string(), z.unknown())),
  total: z.number(),
  limit: z.number(),
  skip: z.number(),
});

export type DatabaseBrowse = z.infer<typeof databaseBrowseSchema>;
export type DatabaseInfo = DatabaseBackupFile;

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

export type DatabaseBackupResponse = z.infer<typeof databaseBackupOperationResponseSchema>;

export const databaseRestoreOperationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  log: z.string().nullable().optional(),
  error: z.string().optional(),
  errorId: z.string().optional(),
  stage: z.string().optional(),
  backupName: z.string().optional(),
});

export type DatabaseRestoreResponse = z.infer<typeof databaseRestoreOperationResponseSchema>;

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

export type DatabaseSyncOptions = z.infer<typeof databaseSyncOptionsSchema>;

export const databaseSyncCollectionResultSchema = z.object({
  name: z.string(),
  status: z.enum(['completed', 'failed', 'skipped']),
  sourceCount: z.number(),
  targetDeleted: z.number(),
  targetInserted: z.number(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export type DatabaseSyncCollectionResult = z.infer<typeof databaseSyncCollectionResultSchema>;

export const databaseSyncResultSchema = z.object({
  direction: databaseSyncDirectionSchema,
  startedAt: z.string(),
  finishedAt: z.string(),
  backups: z.any().optional(),
  collections: z.array(databaseSyncCollectionResultSchema),
});

export type DatabaseSyncResult = z.infer<typeof databaseSyncResultSchema>;

/**
 * Database Engine DTOs
 */

export const databaseEngineProviderSchema = z.enum(['mongodb', 'prisma', 'redis']);
export type DatabaseEngineProvider = z.infer<typeof databaseEngineProviderSchema>;

export const databaseEnginePrimaryProviderSchema = z.enum(['mongodb', 'prisma']);
export type DatabaseEnginePrimaryProvider = z.infer<typeof databaseEnginePrimaryProviderSchema>;

export const databaseEngineServiceSchema = z.enum(['app', 'auth', 'product', 'integrations', 'cms']);
export type DatabaseEngineService = z.infer<typeof databaseEngineServiceSchema>;

export const databaseEnginePolicySchema = z.object({
  requireExplicitServiceRouting: z.boolean(),
  requireExplicitCollectionRouting: z.boolean(),
  allowAutomaticFallback: z.boolean(),
  allowAutomaticBackfill: z.boolean(),
  allowAutomaticMigrations: z.boolean(),
  strictProviderAvailability: z.boolean(),
});

export type DatabaseEnginePolicy = z.infer<typeof databaseEnginePolicySchema>;

export const databaseEngineOperationControlsSchema = z.object({
  allowManualFullSync: z.boolean(),
  allowManualCollectionSync: z.boolean(),
  allowManualBackfill: z.boolean(),
  allowManualBackupRunNow: z.boolean(),
  allowManualBackupMaintenance: z.boolean(),
  allowBackupSchedulerTick: z.boolean(),
  allowOperationJobCancellation: z.boolean(),
});

export type DatabaseEngineOperationControls = z.infer<typeof databaseEngineOperationControlsSchema>;

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

export type DatabaseEngineBackupTargetSchedule = z.infer<typeof databaseEngineBackupTargetScheduleSchema>;

export const databaseEngineBackupScheduleSchema = z.object({
  schedulerEnabled: z.boolean(),
  repeatTickEnabled: z.boolean(),
  lastCheckedAt: z.string().nullable(),
  mongodb: databaseEngineBackupTargetScheduleSchema,
  postgresql: databaseEngineBackupTargetScheduleSchema,
});

export type DatabaseEngineBackupSchedule = z.infer<typeof databaseEngineBackupScheduleSchema>;

export const sqlQueryFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
});

export type SqlQueryField = z.infer<typeof sqlQueryFieldSchema>;

export const sqlQueryResultSchema = z.object({
  fields: z.array(sqlQueryFieldSchema),
  rows: z.array(databasePreviewRowSchema),
  rowCount: z.number(),
  executionTimeMs: z.number(),
  error: z.string().nullable().optional(),
});

export type SqlQueryResult = z.infer<typeof sqlQueryResultSchema>;

export const crudOperationSchema = z.enum(['create', 'read', 'update', 'delete']);
export type CrudOperation = z.infer<typeof crudOperationSchema>;

export const crudRequestSchema = z.object({
  provider: z.enum(['mongodb', 'prisma', 'postgresql']),
  collection: z.string(),
  operation: crudOperationSchema,
  filter: z.record(z.string(), z.any()).optional(),
  data: z.record(z.string(), z.any()).optional(),
  id: z.string().optional(),
});

export type CrudRequest = z.infer<typeof crudRequestSchema>;

export const crudResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type CrudResult = z.infer<typeof crudResultSchema>;

export const databaseColumnInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  defaultValue: z.unknown().nullable(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
});

export type DatabaseColumnInfo = z.infer<typeof databaseColumnInfoSchema>;

export const databaseIndexInfoSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  isUnique: z.boolean(),
  definition: z.string().optional(),
});

export type DatabaseIndexInfo = z.infer<typeof databaseIndexInfoSchema>;

export const databaseForeignKeyInfoSchema = z.object({
  name: z.string(),
  column: z.string(),
  referencedTable: z.string(),
  referencedColumn: z.string(),
  onDelete: z.string().optional(),
  onUpdate: z.string().optional(),
});

export type DatabaseForeignKeyInfo = z.infer<typeof databaseForeignKeyInfoSchema>;

export const databaseEnumInfoDto = z.object({
  name: z.string(),
  values: z.array(z.string()),
});

export type DatabaseEnumInfo = z.infer<typeof databaseEnumInfoDto>;

export const databaseTableDetailSchema = z.object({
  name: z.string(),
  columns: z.array(databaseColumnInfoSchema),
  indexes: z.array(databaseIndexInfoSchema),
  foreignKeys: z.array(databaseForeignKeyInfoSchema),
  rowEstimate: z.number().default(0),
  sizeFormatted: z.string().default(''),
});

export type DatabaseTableDetail = z.infer<typeof databaseTableDetailSchema>;

export interface FieldInfo {
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

export type FieldSchema = FieldInfo;

export interface CollectionSchema {
  name: string;
  fields: FieldInfo[];
  count?: number;
  documentCount?: number;
  provider?: string;
  relations?: string[];
  [key: string]: unknown;
}

export const schemaProviderSchema = z.enum(['prisma', 'mongodb', 'multi']);
export type SchemaProvider = z.infer<typeof schemaProviderSchema>;

export interface MultiSchemaResponse {
  provider: string;
  collections: CollectionSchema[];
  sources?: Record<string, Record<string, unknown>>;
}

export type SchemaResponse = MultiSchemaResponse;
export type SchemaData = SchemaResponse;

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

export type DatabaseEngineOperationJob = z.infer<typeof databaseEngineOperationJobSchema>;

export const databaseEngineOperationsJobsSchema = z.object({
  timestamp: z.string(),
  queueStatus: z.record(z.string(), z.unknown()),
  jobs: z.array(databaseEngineOperationJobSchema),
});

export type DatabaseEngineOperationsJobs = z.infer<typeof databaseEngineOperationsJobsSchema>;

export type DatabaseEngineWorkspaceView = 'engine' | 'operations' | 'backups' | 'redis' | 'preview' | 'crud';

export interface UnifiedCollection {
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

export type DatabaseEngineCollectionProviderPreviewItem = z.infer<typeof databaseEngineCollectionProviderPreviewItemSchema>;

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

export type DatabaseEngineProviderPreview = z.infer<typeof databaseEngineProviderPreviewSchema>;

export type CollectionCopyResult = DatabaseSyncCollectionResult;

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

export type DatabaseEngineBackupRunNowResponse = z.infer<typeof databaseEngineBackupRunNowResponseSchema>;

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

export type DatabaseEngineBackupSchedulerStatus = z.infer<typeof databaseEngineBackupSchedulerStatusSchema>;

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

export type DatabaseEngineBackupSchedulerTickResult = z.infer<typeof databaseEngineBackupSchedulerTickResultSchema>;

export const databaseEngineBackupSchedulerTickResponseSchema = z.object({
  executed: z.boolean(),
  jobsQueued: z.number(),
});

export type DatabaseEngineBackupSchedulerTickResponse = z.infer<typeof databaseEngineBackupSchedulerTickResponseSchema>;

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

export type DatabaseEngineCollectionStatus = z.infer<typeof databaseEngineCollectionStatusSchema>;

export const databaseEngineServiceStatusSchema = z.object({
  service: z.string(),
  configuredProvider: z.string().nullable(),
  effectiveProvider: z.string().nullable(),
  missingExplicitRoute: z.boolean(),
  unsupportedConfiguredProvider: z.boolean(),
  unavailableConfiguredProvider: z.boolean(),
  resolutionError: z.string().nullable(),
});

export type DatabaseEngineServiceStatus = z.infer<typeof databaseEngineServiceStatusSchema>;

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

export type DatabaseEngineStatus = z.infer<typeof databaseEngineStatusSchema>;

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

export type RedisStatus = z.infer<typeof redisStatusSchema>;
export type RedisOverview = RedisStatus;

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

export type SettingsBackfillResult = z.infer<typeof settingsBackfillResultSchema>;

// Backward-compatible DTO aliases used across API/UI modules.
export type DatabaseTypeDto = DatabaseType;
export type DatabaseSyncDirectionDto = DatabaseSyncDirection;
export type DatabasePreviewModeDto = DatabasePreviewMode;
export type DatabasePreviewGroupDto = DatabasePreviewGroup;
export type DatabasePreviewTableDto = DatabasePreviewTable;
export type DatabaseTablePreviewDataDto = DatabaseTablePreviewData;
export type DatabasePreviewPayloadDto = DatabasePreviewPayload;
export type DatabasePreviewRequestDto = DatabasePreviewRequest;
export type DatabaseBackupFileDto = DatabaseBackupFile;
export type DatabaseBackupResultDto = DatabaseBackupResult;
export type FullDatabaseBackupResultDto = FullDatabaseBackupResult;
export type DatabaseBrowseParamsDto = DatabaseBrowseParams;
export type DatabaseBrowseDto = DatabaseBrowse;
export type DatabaseInfoDto = DatabaseInfo;
export type DatabaseBackupOperationResponseDto = DatabaseBackupResponse;
export type DatabaseRestoreOperationResponseDto = DatabaseRestoreResponse;
export type DatabaseSyncOptionsDto = DatabaseSyncOptions;
export type DatabaseSyncCollectionResultDto = DatabaseSyncCollectionResult;
export type DatabaseSyncResultDto = DatabaseSyncResult;
export type DatabaseEngineProviderDto = DatabaseEngineProvider;
export type DatabaseEnginePrimaryProviderDto = DatabaseEnginePrimaryProvider;
export type DatabaseEngineServiceDto = DatabaseEngineService;
export type DatabaseEnginePolicyDto = DatabaseEnginePolicy;
export type DatabaseEngineOperationControlsDto = DatabaseEngineOperationControls;
export type DatabaseEngineBackupTargetScheduleDto = DatabaseEngineBackupTargetSchedule;
export type DatabaseEngineBackupScheduleDto = DatabaseEngineBackupSchedule;
export type SqlQueryFieldDto = SqlQueryField;
export type SqlQueryResultDto = SqlQueryResult;
export type CrudOperationDto = CrudOperation;
export type CrudRequestDto = CrudRequest;
export type CrudResultDto = CrudResult;
export type DatabaseColumnInfoDto = DatabaseColumnInfo;
export type DatabaseIndexInfoDto = DatabaseIndexInfo;
export type DatabaseForeignKeyInfoDto = DatabaseForeignKeyInfo;
export type DatabaseEnumInfoDto = DatabaseEnumInfo;
export type DatabaseTableDetailDto = DatabaseTableDetail;
export type FieldInfoDto = FieldInfo;
export type CollectionSchemaDto = CollectionSchema;
export type SchemaProviderDto = SchemaProvider;
export type MultiSchemaResponseDto = MultiSchemaResponse;
export type SchemaResponseDto = SchemaResponse;
export type SchemaResponsePayloadDto = SchemaResponse;
export type DatabaseEngineOperationJobDto = DatabaseEngineOperationJob;
export type DatabaseEngineOperationsJobsDto = DatabaseEngineOperationsJobs;
export type DatabaseEngineCollectionProviderPreviewItemDto = DatabaseEngineCollectionProviderPreviewItem;
export type DatabaseEngineProviderPreviewDto = DatabaseEngineProviderPreview;
export type CollectionCopyResultDto = CollectionCopyResult;
export type DatabaseEngineBackupRunNowResponseDto = DatabaseEngineBackupRunNowResponse;
export type DatabaseEngineBackupSchedulerStatusDto = DatabaseEngineBackupSchedulerStatus;
export type DatabaseEngineBackupSchedulerTickResultDto = DatabaseEngineBackupSchedulerTickResult;
export type DatabaseEngineBackupSchedulerTickResponseDto = DatabaseEngineBackupSchedulerTickResponse;
export type DatabaseEngineCollectionStatusDto = DatabaseEngineCollectionStatus;
export type DatabaseEngineServiceStatusDto = DatabaseEngineServiceStatus;
export type DatabaseEngineStatusDto = DatabaseEngineStatus;
export type RedisStatusDto = RedisStatus;
export type RedisOverviewDto = RedisOverview;
export type AiQueryDto = AiQuery;
export type DatabasePresetOptionDto = DatabasePresetOption;
export type DatabaseEngineWorkspaceViewDto = DatabaseEngineWorkspaceView;
export type SettingsBackfillResultDto = SettingsBackfillResult;
