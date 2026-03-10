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
export type ProductSyncAppField = z.infer<typeof productSyncAppFieldSchema>;

export const PRODUCT_SYNC_APP_FIELDS: ProductSyncAppField[] = [
  'stock',
  'price',
  'name_en',
  'description_en',
  'sku',
  'ean',
  'weight',
];

export const productSyncDirectionSchema = z.enum(['disabled', 'base_to_app', 'app_to_base']);
export type ProductSyncDirection = z.infer<typeof productSyncDirectionSchema>;

export const PRODUCT_SYNC_DIRECTION_OPTIONS: ProductSyncDirection[] = [
  'disabled',
  'base_to_app',
  'app_to_base',
];

export const productSyncConflictPolicySchema = z.enum(['skip']);
export type ProductSyncConflictPolicy = z.infer<typeof productSyncConflictPolicySchema>;

export const productSyncFieldRuleSchema = z.object({
  id: z.string(),
  appField: productSyncAppFieldSchema,
  baseField: z.string(),
  direction: productSyncDirectionSchema,
});
export type ProductSyncFieldRule = z.infer<typeof productSyncFieldRuleSchema>;

export const productSyncFieldRulePayloadSchema = z.object({
  id: z.string().trim().min(1).optional(),
  appField: productSyncAppFieldSchema,
  baseField: z.string().trim().min(1),
  direction: productSyncDirectionSchema,
});
export type ProductSyncFieldRulePayload = z.infer<typeof productSyncFieldRulePayloadSchema>;

export const DEFAULT_PRODUCT_SYNC_FIELD_RULES: Array<Omit<ProductSyncFieldRule, 'id'>> = [
  {
    appField: 'stock',
    baseField: 'stock',
    direction: 'base_to_app',
  },
  {
    appField: 'name_en',
    baseField: 'text_fields.name',
    direction: 'app_to_base',
  },
  {
    appField: 'description_en',
    baseField: 'text_fields.description',
    direction: 'app_to_base',
  },
  {
    appField: 'price',
    baseField: 'prices.0',
    direction: 'disabled',
  },
  {
    appField: 'sku',
    baseField: 'sku',
    direction: 'disabled',
  },
  {
    appField: 'ean',
    baseField: 'ean',
    direction: 'disabled',
  },
  {
    appField: 'weight',
    baseField: 'weight',
    direction: 'disabled',
  },
];

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
export type ProductSyncProfile = z.infer<typeof productSyncProfileSchema>;

export const createProductSyncProfileSchema = productSyncProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateProductSyncProfileInput = z.infer<typeof createProductSyncProfileSchema>;
export type UpdateProductSyncProfileInput = Partial<CreateProductSyncProfileInput>;

export const productSyncProfileCreatePayloadSchema = z.object({
  name: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  connectionId: z.string().trim().min(1),
  inventoryId: z.string().trim().min(1),
  catalogId: z.string().trim().nullable().optional(),
  scheduleIntervalMinutes: z.number().int().min(1).max(24 * 60).optional(),
  batchSize: z.number().int().min(1).max(500).optional(),
  conflictPolicy: productSyncConflictPolicySchema.optional(),
  fieldRules: z.array(productSyncFieldRulePayloadSchema).optional(),
});
export type ProductSyncProfileCreatePayload = z.infer<typeof productSyncProfileCreatePayloadSchema>;

export const productSyncProfileUpdatePayloadSchema = z.object({
  name: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  connectionId: z.string().trim().min(1).optional(),
  inventoryId: z.string().trim().min(1).optional(),
  catalogId: z.string().trim().nullable().optional(),
  scheduleIntervalMinutes: z.number().int().min(1).max(24 * 60).optional(),
  batchSize: z.number().int().min(1).max(500).optional(),
  conflictPolicy: productSyncConflictPolicySchema.optional(),
  fieldRules: z.array(productSyncFieldRulePayloadSchema).optional(),
});
export type ProductSyncProfileUpdatePayload = z.infer<typeof productSyncProfileUpdatePayloadSchema>;

export const productSyncProfilesResponseSchema = z.object({
  profiles: z.array(productSyncProfileSchema),
});
export type ProductSyncProfilesResponse = z.infer<typeof productSyncProfilesResponseSchema>;

export const productSyncRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'partial_success',
  'failed',
]);
export type ProductSyncRunStatus = z.infer<typeof productSyncRunStatusSchema>;

export const productSyncRunTriggerSchema = z.enum(['manual', 'scheduled', 'relink']);
export type ProductSyncRunTrigger = z.infer<typeof productSyncRunTriggerSchema>;

export const productSyncRunStatsSchema = z.object({
  total: z.number(),
  processed: z.number(),
  success: z.number(),
  skipped: z.number(),
  failed: z.number(),
  localUpdated: z.number(),
  baseUpdated: z.number(),
});
export type ProductSyncRunStats = z.infer<typeof productSyncRunStatsSchema>;

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
export type ProductSyncRunRecord = z.infer<typeof productSyncRunRecordSchema>;

export const productSyncRunItemStatusSchema = z.enum(['success', 'skipped', 'failed']);
export type ProductSyncRunItemStatus = z.infer<typeof productSyncRunItemStatusSchema>;

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
export type ProductSyncRunItemRecord = z.infer<typeof productSyncRunItemRecordSchema>;

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
export type ProductSyncRunDetail = z.infer<typeof productSyncRunDetailSchema>;

export const productSyncRunListQuerySchema = z.object({
  profileId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
export type ProductSyncRunListQuery = z.infer<typeof productSyncRunListQuerySchema>;

export const productSyncRunsResponseSchema = z.object({
  runs: z.array(productSyncRunRecordSchema),
});
export type ProductSyncRunsResponse = z.infer<typeof productSyncRunsResponseSchema>;

export const productSyncRelinkPayloadSchema = z.object({
  connectionId: z.string().trim().min(1).optional(),
  inventoryId: z.string().trim().min(1).optional(),
  catalogId: z.string().trim().nullable().optional(),
  limit: z.number().int().min(1).max(100_000).optional(),
});
export type ProductSyncRelinkPayload = z.infer<typeof productSyncRelinkPayloadSchema>;

export const productSyncRelinkResponseSchema = z.object({
  status: z.literal('queued'),
  jobId: z.string(),
});
export type ProductSyncRelinkResponse = z.infer<typeof productSyncRelinkResponseSchema>;

export const productSyncDeleteResponseSchema = z.object({
  ok: z.literal(true),
});
export type ProductSyncDeleteResponse = z.infer<typeof productSyncDeleteResponseSchema>;

export const PRODUCT_SYNC_PROFILE_SETTINGS_KEY = 'product_sync_profiles';
export const PRODUCT_SYNC_RUN_KEY_PREFIX = 'product_sync_run:';
export const PRODUCT_SYNC_ITEM_KEY_PREFIX = 'product_sync_run_item:';
