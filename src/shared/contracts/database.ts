import { z } from 'zod';
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { dtoBaseSchema } from './base';

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
  sources: z.record(schemaProviderSchema, schemaResponseSchema).partial() as unknown,
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
