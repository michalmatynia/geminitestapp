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

export const createActivityLogSchema = activityLogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateActivityLogDto = z.infer<typeof createActivityLogSchema>;
