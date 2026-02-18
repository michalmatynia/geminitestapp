import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Product Sync DTOs
 */

export const productSyncAppFieldSchema = z.enum([
  'stock',
  'price',
  'name_en',
  'description_en',
  'sku',
  'ean',
  'weight',
]);
export type ProductSyncAppFieldDto = z.infer<typeof productSyncAppFieldSchema>;

export const productSyncDirectionSchema = z.enum(['disabled', 'base_to_app', 'app_to_base']);
export type ProductSyncDirectionDto = z.infer<typeof productSyncDirectionSchema>;

export const productSyncConflictPolicySchema = z.enum(['skip']);
export type ProductSyncConflictPolicyDto = z.infer<typeof productSyncConflictPolicySchema>;

export const productSyncFieldRuleSchema = z.object({
  id: z.string(),
  appField: productSyncAppFieldSchema,
  baseField: z.string(),
  direction: productSyncDirectionSchema,
});
export type ProductSyncFieldRuleDto = z.infer<typeof productSyncFieldRuleSchema>;

export const productSyncProfileSchema = namedDtoSchema.extend({
  enabled: z.boolean(),
  connectionId: z.string(),
  inventoryId: z.string(),
  catalogId: z.string().nullable(),
  scheduleIntervalMinutes: z.number(),
  batchSize: z.number(),
  conflictPolicy: productSyncConflictPolicySchema,
  fieldRules: z.array(productSyncFieldRuleSchema),
  lastRunAt: z.string().nullable(),
});
export type ProductSyncProfileDto = z.infer<typeof productSyncProfileSchema>;

export const createProductSyncProfileSchema = productSyncProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateProductSyncProfileDto = z.infer<typeof createProductSyncProfileSchema>;
export type UpdateProductSyncProfileDto = Partial<CreateProductSyncProfileDto>;

export const productSyncRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'partial_success',
  'failed',
]);
export type ProductSyncRunStatusDto = z.infer<typeof productSyncRunStatusSchema>;

export const productSyncRunTriggerSchema = z.enum(['manual', 'scheduled', 'relink']);
export type ProductSyncRunTriggerDto = z.infer<typeof productSyncRunTriggerSchema>;

export const productSyncRunStatsSchema = z.object({
  total: z.number(),
  processed: z.number(),
  success: z.number(),
  skipped: z.number(),
  failed: z.number(),
  localUpdated: z.number(),
  baseUpdated: z.number(),
});
export type ProductSyncRunStatsDto = z.infer<typeof productSyncRunStatsSchema>;

export const productSyncRunRecordSchema = dtoBaseSchema.extend({
  profileId: z.string(),
  profileName: z.string(),
  trigger: productSyncRunTriggerSchema,
  status: productSyncRunStatusSchema,
  queueJobId: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  summaryMessage: z.string().nullable(),
  errorMessage: z.string().nullable(),
  stats: productSyncRunStatsSchema,
});
export type ProductSyncRunRecordDto = z.infer<typeof productSyncRunRecordSchema>;

export const productSyncRunItemStatusSchema = z.enum(['success', 'skipped', 'failed']);
export type ProductSyncRunItemStatusDto = z.infer<typeof productSyncRunItemStatusSchema>;

export const productSyncRunItemRecordSchema = dtoBaseSchema.extend({
  runId: z.string(),
  itemId: z.string(),
  productId: z.string(),
  baseProductId: z.string(),
  status: productSyncRunItemStatusSchema,
  localChanges: z.array(z.string()),
  baseChanges: z.array(z.string()),
  message: z.string().nullable(),
  errorMessage: z.string().nullable(),
});
export type ProductSyncRunItemRecordDto = z.infer<typeof productSyncRunItemRecordSchema>;

export const productSyncRunDetailSchema = z.object({
  run: productSyncRunRecordSchema,
  items: z.array(productSyncRunItemRecordSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});
export type ProductSyncRunDetailDto = z.infer<typeof productSyncRunDetailSchema>;
