import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * System DTOs
 */

export const appProviderValueSchema = z.enum(['prisma', 'mongodb']);
export type AppProviderValueDto = z.infer<typeof appProviderValueSchema>;

export const appProviderSourceSchema = z.enum([
  'env',
  'prisma-setting',
  'mongo-setting',
  'app-setting',
  'default',
  'derived',
]);
export type AppProviderSourceDto = z.infer<typeof appProviderSourceSchema>;

export const appProviderServiceSchema = z.enum(['app', 'auth', 'product', 'integrations', 'cms']);
export type AppProviderServiceDto = z.infer<typeof appProviderServiceSchema>;

export const appProviderServiceStatusSchema = z.object({
  service: appProviderServiceSchema,
  configured: appProviderValueSchema.nullable(),
  configuredSource: appProviderSourceSchema.nullable(),
  effective: appProviderValueSchema,
  driftFromApp: z.boolean(),
  notes: z.array(z.string()),
});

export type AppProviderServiceStatusDto = z.infer<typeof appProviderServiceStatusSchema>;

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

export type AppProviderDiagnosticsDto = z.infer<typeof appProviderDiagnosticsSchema>;

/**
 * Activity Log DTO
 */

export const activityLogSchema = dtoBaseSchema.extend({
  type: z.string(),
  description: z.string(),
  userId: z.string().nullable(),
  entityId: z.string().nullable(),
  entityType: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export type ActivityLogDto = z.infer<typeof activityLogSchema>;

export const createActivityLogSchema = z.object({
  type: z.string(),
  description: z.string(),
  userId: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CreateActivityLogDto = z.infer<typeof createActivityLogSchema>;

export const activityFiltersSchema = z.object({
  userId: z.string().optional(),
  type: z.string().optional(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type ActivityFiltersDto = z.infer<typeof activityFiltersSchema>;

export type ActivityRepository = {
  listActivity(filters: ActivityFiltersDto): Promise<ActivityLogDto[]>;
  countActivity(filters: ActivityFiltersDto): Promise<number>;
  createActivity(data: CreateActivityLogDto): Promise<ActivityLogDto>;
  deleteActivity(id: string): Promise<void>;
};

/**
 * System Database Migration DTOs
 */

export const appDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type AppDbProviderDto = z.infer<typeof appDbProviderSchema>;

export const migrationDirectionSchema = z.enum(['prisma-to-mongo', 'mongo-to-prisma']);
export type MigrationDirectionDto = z.infer<typeof migrationDirectionSchema>;

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

export type MigrationBatchResultDto = z.infer<typeof migrationBatchResultSchema>;
