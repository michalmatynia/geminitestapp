import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * System DTOs
 */

export const appProviderValueSchema = z.enum(['mongodb']);
export type AppProviderValue = z.infer<typeof appProviderValueSchema>;

export const appProviderSourceSchema = z.enum([
  'env',
  'mongo-setting',
  'app-setting',
  'default',
  'derived',
]);
export type AppProviderSource = z.infer<typeof appProviderSourceSchema>;

export const appProviderServiceSchema = z.enum(['app', 'auth', 'product', 'integrations', 'cms']);
export type AppProviderService = z.infer<typeof appProviderServiceSchema>;

export const appProviderServiceStatusSchema = z.object({
  service: appProviderServiceSchema,
  configured: appProviderValueSchema.nullable(),
  configuredSource: appProviderSourceSchema.nullable(),
  effective: appProviderValueSchema,
  driftFromApp: z.boolean(),
  notes: z.array(z.string()),
});

export type AppProviderServiceStatus = z.infer<typeof appProviderServiceStatusSchema>;

export const appProviderDiagnosticsSchema = z.object({
  timestamp: z.string(),
  env: z.object({
    hasDatabaseUrl: z.boolean(),
    hasMongoUri: z.boolean(),
    appDbProviderEnv: z.string().nullable(),
  }),
  services: z.array(appProviderServiceStatusSchema),
  driftCount: z.number(),
  warningCount: z.number(),
  warnings: z.array(z.string()),
});

export type AppProviderDiagnostics = z.infer<typeof appProviderDiagnosticsSchema>;

/**
 * Activity Log DTO
 */

export const observabilityApplicationIdValues = [
  'geminitestapp',
  'studiq',
  'cms-builder',
  'stargater',
  'arch',
] as const;

export const observabilityApplicationIdSchema = z.enum(observabilityApplicationIdValues);
export type ObservabilityApplicationId = z.infer<typeof observabilityApplicationIdSchema>;

export const observabilityLogOriginSchema = z.object({
  applicationId: observabilityApplicationIdSchema.nullable().optional(),
  applicationName: z.string().nullable().optional(),
  environment: z.string().nullable().optional(),
  sourceService: z.string().nullable().optional(),
  originDatabase: z.string().nullable().optional(),
  originCollection: z.string().nullable().optional(),
  originLogId: z.string().nullable().optional(),
});

export const activityLogSchema = dtoBaseSchema.extend({
  type: z.string(),
  description: z.string(),
  userId: z.string().nullable(),
  entityId: z.string().nullable(),
  entityType: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  ...observabilityLogOriginSchema.shape,
});

export type ActivityLog = z.infer<typeof activityLogSchema>;

export const createActivityLogSchema = z.object({
  type: z.string(),
  description: z.string(),
  userId: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  ...observabilityLogOriginSchema.shape,
});

export type CreateActivityLog = z.infer<typeof createActivityLogSchema>;

export const activityFiltersSchema = z.object({
  userId: z.string().optional(),
  type: z.string().optional(),
  types: z.array(z.string()).optional(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  applicationId: observabilityApplicationIdSchema.optional(),
  search: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type ActivityFilters = z.infer<typeof activityFiltersSchema>;

export type ActivityRepository = {
  listActivity(filters: ActivityFilters): Promise<ActivityLog[]>;
  countActivity(filters: ActivityFilters): Promise<number>;
  createActivity(data: CreateActivityLog): Promise<ActivityLog>;
  deleteActivity(id: string): Promise<void>;
};

/**
 * System Database Migration DTOs
 */

export const appDbProviderSchema = z.enum(['mongodb']);
export type AppDbProvider = z.infer<typeof appDbProviderSchema>;

export const migrationDirectionSchema = z.literal('mongo-only');
export type MigrationDirection = z.infer<typeof migrationDirectionSchema>;

export const migrationBatchResultSchema = z.object({
  processed: z.number(),
  successful: z.number(),
  failed: z.number(),
  errors: z.array(
    z.object({
      id: z.string(),
      error: z.string(),
    })
  ),
});

export type MigrationBatchResult = z.infer<typeof migrationBatchResultSchema>;
