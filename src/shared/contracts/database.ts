import { z } from 'zod';
 

import { dtoBaseSchema } from './base';


export const databaseTypeSchema = z.enum(['postgresql', 'mongodb']);
export type DatabaseTypeDto = z.infer<typeof databaseTypeSchema>;

export const databasePreviewModeSchema = z.enum(['backup', 'current']);
export type DatabasePreviewModeDto = z.infer<typeof databasePreviewModeSchema>;

export const databasePreviewGroupSchema = z.object({
  type: z.string(),
  objects: z.array(z.string()),
});
export type DatabasePreviewGroupDto = z.infer<typeof databasePreviewGroupSchema>;

export const databasePreviewTableSchema = z.object({
  name: z.string(),
  rowEstimate: z.number(),
});
export type DatabasePreviewTableDto = z.infer<typeof databasePreviewTableSchema>;

export const databasePreviewRowSchema = z.object({
  name: z.string(),
  rows: z.array(z.record(z.string(), z.unknown())),
  totalRows: z.number(),
});
export type DatabasePreviewRowDto = z.infer<typeof databasePreviewRowSchema>;

export const databaseColumnInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  defaultValue: z.string().nullable(),
  isPrimaryKey: z.boolean(),
});
export type DatabaseColumnInfoDto = z.infer<typeof databaseColumnInfoSchema>;

export const databaseIndexInfoSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  isUnique: z.boolean(),
  definition: z.string(),
});
export type DatabaseIndexInfoDto = z.infer<typeof databaseIndexInfoSchema>;

export const databaseForeignKeyInfoSchema = z.object({
  name: z.string(),
  column: z.string(),
  referencedTable: z.string(),
  referencedColumn: z.string(),
  onDelete: z.string(),
  onUpdate: z.string(),
});
export type DatabaseForeignKeyInfoDto = z.infer<typeof databaseForeignKeyInfoSchema>;

export const databaseEnumInfoSchema = z.object({
  name: z.string(),
  values: z.array(z.string()),
});
export type DatabaseEnumInfoDto = z.infer<typeof databaseEnumInfoSchema>;

export const databaseTableDetailSchema = z.object({
  name: z.string(),
  columns: z.array(databaseColumnInfoSchema),
  indexes: z.array(databaseIndexInfoSchema),
  foreignKeys: z.array(databaseForeignKeyInfoSchema),
  rowEstimate: z.number(),
  sizeBytes: z.number(),
  sizeFormatted: z.string(),
});
export type DatabaseTableDetailDto = z.infer<typeof databaseTableDetailSchema>;

export const sqlQueryFieldSchema = z.object({
  name: z.string(),
  dataTypeID: z.number(),
});
export type SqlQueryFieldDto = z.infer<typeof sqlQueryFieldSchema>;

export const sqlQueryResultSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  rowCount: z.number(),
  fields: z.array(sqlQueryFieldSchema),
  command: z.string(),
  duration: z.number(),
  error: z.string().optional(),
});
export type SqlQueryResultDto = z.infer<typeof sqlQueryResultSchema>;

export const crudOperationSchema = z.enum(['insert', 'update', 'delete']);
export type CrudOperationDto = z.infer<typeof crudOperationSchema>;

export const crudRequestSchema = z.object({
  table: z.string(),
  operation: crudOperationSchema,
  type: databaseTypeSchema,
  data: z.record(z.string(), z.unknown()).optional(),
  primaryKey: z.record(z.string(), z.unknown()).optional(),
});
export type CrudRequestDto = z.infer<typeof crudRequestSchema>;

export const crudResultSchema = z.object({
  success: z.boolean(),
  rowCount: z.number(),
  returning: z.array(z.record(z.string(), z.unknown())).optional(),
  error: z.string().optional(),
});
export type CrudResultDto = z.infer<typeof crudResultSchema>;

export const databasePreviewPayloadSchema = z.object({
  content: z.string().optional(),
  groups: z.array(databasePreviewGroupSchema).optional(),
  tables: z.array(databasePreviewTableSchema).optional(),
  tableRows: z.array(databasePreviewRowSchema).optional(),
  tableDetails: z.array(databaseTableDetailSchema).optional(),
  enums: z.array(databaseEnumInfoSchema).optional(),
  databaseSize: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  error: z.string().optional(),
  errorId: z.string().optional(),
  stage: z.string().optional(),
  backupName: z.string().optional(),
  mode: z.string().optional(),
});
export type DatabasePreviewPayloadDto = z.infer<typeof databasePreviewPayloadSchema>;

/**
 * Database Schema Introspection DTOs
 */

export const fieldInfoSchema = z.object({
  name: z.string(),
  type: z.string(),
  isRequired: z.boolean().nullable().optional(),
  isId: z.boolean().nullable().optional(),
  isUnique: z.boolean().nullable().optional(),
  hasDefault: z.boolean().nullable().optional(),
  relationTo: z.string().nullable().optional(),
});

export type FieldInfoDto = z.infer<typeof fieldInfoSchema>;

export const collectionSchemaSchema = z.object({
  name: z.string(),
  fields: z.array(fieldInfoSchema),
  relations: z.array(z.string()).optional(),
  documentCount: z.number().optional(),
});

export type CollectionSchemaDto = z.infer<typeof collectionSchemaSchema>;

export const schemaProviderSchema = z.enum(['mongodb', 'prisma']);
export type SchemaProviderDto = z.infer<typeof schemaProviderSchema>;

export const unifiedCollectionSchema = z.object({
  name: z.string(),
  mongoFieldCount: z.number().nullable(),
  prismaFieldCount: z.number().nullable(),
  mongoDocumentCount: z.number().nullable(),
  prismaRowCount: z.number().nullable(),
  existsInMongo: z.boolean(),
  existsInPrisma: z.boolean(),
  assignedProvider: z.union([schemaProviderSchema, z.literal('auto')]),
});

export type UnifiedCollectionDto = z.infer<typeof unifiedCollectionSchema>;

export const schemaResponseSchema = z.object({
  provider: schemaProviderSchema,
  collections: z.array(collectionSchemaSchema),
});

export type SchemaResponseDto = z.infer<typeof schemaResponseSchema>;

export const multiSchemaResponseSchema = z.object({
  provider: z.literal('multi'),
  collections: z.array(collectionSchemaSchema.extend({ provider: schemaProviderSchema })),
  sources: z.record(schemaProviderSchema, schemaResponseSchema) as unknown,
});

export type MultiSchemaResponseDto = z.infer<typeof multiSchemaResponseSchema>;

export const schemaResponsePayloadSchema = z.union([schemaResponseSchema, multiSchemaResponseSchema]);
export type SchemaResponsePayloadDto = z.infer<typeof schemaResponsePayloadSchema>;

/**
 * Database Browsing DTOs
 */

export const databaseBrowseParamsSchema = z.object({
  collection: z.string(),
  limit: z.number().optional(),
  skip: z.number().optional(),
  query: z.string().optional(),
  provider: schemaProviderSchema.optional(),
});

export type DatabaseBrowseParamsDto = z.infer<typeof databaseBrowseParamsSchema>;

export const databaseBrowseSchema = z.object({
  provider: schemaProviderSchema,
  collection: z.string(),
  documents: z.array(z.record(z.string(), z.unknown())),
  total: z.number(),
  limit: z.number(),
  skip: z.number(),
});

export type DatabaseBrowseDto = z.infer<typeof databaseBrowseSchema>;

export const browseResponseSchema = z.object({
  total: z.number(),
  items: z.array(z.record(z.string(), z.unknown())),
  fields: z.array(z.string()),
});

export type BrowseResponseDto = z.infer<typeof browseResponseSchema>;

/**
 * AI Query & Node Config DTOs
 */

export const aiQuerySchema = z.object({
  id: z.string(),
  query: z.string(),
  timestamp: z.string(),
});

export type AiQueryDto = z.infer<typeof aiQuerySchema>;

export const databasePresetOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
});

export type DatabasePresetOptionDto = z.infer<typeof databasePresetOptionSchema>;

export const databaseNodeConfigSchema = z.object({
  type: databaseTypeSchema,
  operation: z.enum(['query', 'insert', 'update', 'delete', 'schema']),
  sql: z.string().optional(),
  collection: z.string().optional(),
  filter: z.string().optional(),
  update: z.string().optional(),
  document: z.string().optional(),
  variableName: z.string().optional(),
});

export type DatabaseNodeConfigDto = z.infer<typeof databaseNodeConfigSchema>;

/**
 * Database Backup/Restore DTOs
 */

export const databaseBackupFileSchema = z.object({
  name: z.string(),
  size: z.string(),
  created: z.string(),
  createdAt: z.string(),
  lastModified: z.string(),
  lastModifiedAt: z.string(),
  lastRestored: z.string().optional(),
});

export type DatabaseBackupFileDto = z.infer<typeof databaseBackupFileSchema>;

export const databaseBackupOperationResponseSchema = z.object({
  success: z.boolean().optional(),
  jobId: z.string().optional(),
  message: z.string().optional(),
  backupName: z.string().optional(),
  log: z.string().optional(),
  warning: z.string().optional(),
  error: z.string().optional(),
  errorId: z.string().optional(),
  stage: z.string().optional(),
});

export type DatabaseBackupOperationResponseDto = z.infer<typeof databaseBackupOperationResponseSchema>;

export const databaseRestoreOperationResponseSchema = z.object({
  message: z.string().optional(),
  log: z.string().optional(),
  error: z.string().optional(),
  errorId: z.string().optional(),
  stage: z.string().optional(),
  backupName: z.string().optional(),
});

export type DatabaseRestoreOperationResponseDto = z.infer<typeof databaseRestoreOperationResponseSchema>;

/**
 * Redis DTOs
 */

export const redisNamespaceStatsSchema = z.object({
  namespace: z.string(),
  keyCount: z.number(),
  sampleKeys: z.array(z.string()),
});

export type RedisNamespaceStatsDto = z.infer<typeof redisNamespaceStatsSchema>;

export const redisOverviewSchema = z.object({
  enabled: z.boolean(),
  connected: z.boolean(),
  urlConfigured: z.boolean(),
  dbSize: z.number(),
  usedMemory: z.string().nullable(),
  maxMemory: z.string().nullable(),
  namespaces: z.array(redisNamespaceStatsSchema),
  sampleKeys: z.array(z.string()),
});

export type RedisOverviewDto = z.infer<typeof redisOverviewSchema>;

/**
 * Database Engine Operations DTOs
 */

export const databaseEngineOperationJobSchema = dtoBaseSchema.extend({
  type: z.enum(['db_backup', 'db_sync']),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  dbType: z.enum(['mongodb', 'postgresql']).nullable(),
  direction: z.enum(['mongo_to_prisma', 'prisma_to_mongo']).nullable(),
  source: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  resultSummary: z.string().nullable(),
});

export type DatabaseEngineOperationJobDto = z.infer<typeof databaseEngineOperationJobSchema>;

export const databaseEngineOperationsJobsSchema = z.object({
  timestamp: z.string(),
  queueStatus: z.object({
    running: z.boolean(),
    healthy: z.boolean(),
    processing: z.boolean(),
    lastPollTime: z.number(),
    timeSinceLastPoll: z.number(),
  }),
  jobs: z.array(databaseEngineOperationJobSchema),
});

export type DatabaseEngineOperationsJobsDto = z.infer<typeof databaseEngineOperationsJobsSchema>;

export const databaseEngineBackupTargetStatusSchema = z.object({
  enabled: z.boolean(),
  cadence: z.enum(['daily', 'every_n_days', 'weekly']),
  timeUtc: z.string(),
  intervalDays: z.number(),
  weekday: z.number(),
  lastRunAt: z.string().nullable(),
  lastQueuedAt: z.string().nullable(),
  lastStatus: z.enum(['idle', 'queued', 'running', 'success', 'failed']),
  lastJobId: z.string().nullable(),
  lastError: z.string().nullable(),
  nextDueAt: z.string().nullable(),
  dueNow: z.boolean(),
});

export type DatabaseEngineBackupTargetStatusDto = z.infer<typeof databaseEngineBackupTargetStatusSchema>;

export const databaseEngineBackupSchedulerStatusSchema = z.object({
  timestamp: z.string(),
  schedulerEnabled: z.boolean(),
  lastCheckedAt: z.string().nullable(),
  queue: z.object({
    running: z.boolean(),
    healthy: z.boolean(),
    processing: z.boolean(),
  }),
  repeatEveryMs: z.number(),
  targets: z.object({
    mongodb: databaseEngineBackupTargetStatusSchema,
    postgresql: databaseEngineBackupTargetStatusSchema,
  }),
});

export type DatabaseEngineBackupSchedulerStatusDto = z.infer<typeof databaseEngineBackupSchedulerStatusSchema>;

export const databaseEngineBackupSchedulerTickResultSchema = z.object({
  checkedAt: z.string(),
  schedulerEnabled: z.boolean(),
  triggered: z.array(z.object({
    dbType: z.enum(['mongodb', 'postgresql']),
    jobId: z.string(),
  })),
  skipped: z.array(z.object({
    dbType: z.enum(['mongodb', 'postgresql']),
    reason: z.string(),
  })),
});

export type DatabaseEngineBackupSchedulerTickResultDto = z.infer<typeof databaseEngineBackupSchedulerTickResultSchema>;

export const databaseEngineBackupRunNowResponseSchema = z.object({
  success: z.boolean(),
  queued: z.array(
    z.object({
      dbType: z.enum(['mongodb', 'postgresql']),
      jobId: z.string(),
    })
  ),
  inlineProcessed: z.array(
    z.object({
      dbType: z.enum(['mongodb', 'postgresql']),
      jobId: z.string(),
    })
  ),
});

export type DatabaseEngineBackupRunNowResponseDto = z.infer<
  typeof databaseEngineBackupRunNowResponseSchema
>;

export const databaseEngineBackupSchedulerTickResponseSchema = z.object({
  success: z.boolean(),
  tick: databaseEngineBackupSchedulerTickResultSchema,
  status: databaseEngineBackupSchedulerStatusSchema,
});

export type DatabaseEngineBackupSchedulerTickResponseDto = z.infer<
  typeof databaseEngineBackupSchedulerTickResponseSchema
>;

/**
 * Database Engine Policy DTOs
 */

export const databaseEngineServiceSchema = z.enum(['app', 'auth', 'product', 'integrations', 'cms']);
export type DatabaseEngineServiceDto = z.infer<typeof databaseEngineServiceSchema>;

export const databaseEngineProviderSchema = z.enum(['mongodb', 'prisma', 'redis']);
export type DatabaseEngineProviderDto = z.infer<typeof databaseEngineProviderSchema>;

export const databaseEnginePrimaryProviderSchema = z.enum(['mongodb', 'prisma']);
export type DatabaseEnginePrimaryProviderDto = z.infer<typeof databaseEnginePrimaryProviderSchema>;

export const databaseEnginePolicySchema = z.object({
  requireExplicitServiceRouting: z.boolean(),
  requireExplicitCollectionRouting: z.boolean(),
  allowAutomaticFallback: z.boolean(),
  allowAutomaticBackfill: z.boolean(),
  allowAutomaticMigrations: z.boolean(),
  strictProviderAvailability: z.boolean(),
});

export type DatabaseEnginePolicyDto = z.infer<typeof databaseEnginePolicySchema>;

export const databaseEngineServiceStatusSchema = z.object({
  service: databaseEngineServiceSchema,
  configuredProvider: databaseEngineProviderSchema.nullable(),
  effectiveProvider: databaseEnginePrimaryProviderSchema.nullable(),
  missingExplicitRoute: z.boolean(),
  unsupportedConfiguredProvider: z.boolean(),
  unavailableConfiguredProvider: z.boolean(),
  resolutionError: z.string().nullable(),
});

export type DatabaseEngineServiceStatusDto = z.infer<typeof databaseEngineServiceStatusSchema>;

export const databaseEngineUnavailableCollectionRouteSchema = z.object({
  collection: z.string(),
  provider: databaseEngineProviderSchema,
});

export type DatabaseEngineUnavailableCollectionRouteDto = z.infer<typeof databaseEngineUnavailableCollectionRouteSchema>;

export const databaseEngineCollectionStatusSchema = z.object({
  knownCollections: z.array(z.string()),
  configuredCount: z.number(),
  missingExplicitRoutes: z.array(z.string()),
  orphanedRoutes: z.array(z.string()),
  unavailableConfiguredRoutes: z.array(databaseEngineUnavailableCollectionRouteSchema),
});

export type DatabaseEngineCollectionStatusDto = z.infer<typeof databaseEngineCollectionStatusSchema>;

export const databaseEngineStatusSchema = z.object({
  timestamp: z.string(),
  policy: databaseEnginePolicySchema,
  providers: z.object({
    prismaConfigured: z.boolean(),
    mongodbConfigured: z.boolean(),
    redisConfigured: z.boolean(),
  }),
  serviceRouteMap: z.record(databaseEngineServiceSchema, databaseEngineProviderSchema),
  collectionRouteMap: z.record(z.string(), databaseEngineProviderSchema),
  services: z.array(databaseEngineServiceStatusSchema),
  collections: databaseEngineCollectionStatusSchema,
  blockingIssues: z.array(z.string()),
});

export type DatabaseEngineStatusDto = z.infer<typeof databaseEngineStatusSchema>;

export const databaseEngineCollectionProviderPreviewSourceSchema = z.enum([
  'collection_route',
  'app_provider',
  'error',
]);

export type DatabaseEngineCollectionProviderPreviewSourceDto = z.infer<typeof databaseEngineCollectionProviderPreviewSourceSchema>;

export const databaseEngineCollectionProviderPreviewItemSchema = z.object({
  collection: z.string(),
  configuredProvider: databaseEngineProviderSchema.nullable(),
  effectiveProvider: databaseEnginePrimaryProviderSchema.nullable(),
  source: databaseEngineCollectionProviderPreviewSourceSchema,
  error: z.string().nullable(),
});

export type DatabaseEngineCollectionProviderPreviewItemDto = z.infer<typeof databaseEngineCollectionProviderPreviewItemSchema>;

export const databaseEngineProviderPreviewSchema = z.object({
  timestamp: z.string(),
  policy: databaseEnginePolicySchema,
  appProvider: databaseEnginePrimaryProviderSchema.nullable(),
  appProviderError: z.string().nullable(),
  collections: z.array(databaseEngineCollectionProviderPreviewItemSchema),
});

export type DatabaseEngineProviderPreviewDto = z.infer<typeof databaseEngineProviderPreviewSchema>;

export const databaseCollectionCopyResultSchema = z.object({
  name: z.string(),
  status: z.enum(['completed', 'skipped', 'failed']),
  sourceCount: z.number(),
  targetDeleted: z.number(),
  targetInserted: z.number(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export type DatabaseCollectionCopyResultDto = z.infer<typeof databaseCollectionCopyResultSchema>;
