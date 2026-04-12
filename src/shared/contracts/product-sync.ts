import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';
import { BASE_EXPORT_FIELD_DOCS } from './integrations/base-export-fields';

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

export type ProductSyncBaseFieldOption = {
  value: string;
  label: string;
  description?: string;
  group?: string;
  disabled?: boolean;
};

export type ProductSyncBaseFieldPatternHint = {
  value: string;
  description: string;
};

const BASE_EXPORT_FIELD_DESCRIPTION_BY_KEY = new Map(
  BASE_EXPORT_FIELD_DOCS.map((entry) => [entry.key, entry.description])
);

const describeBaseExportField = (key: string): string | undefined =>
  BASE_EXPORT_FIELD_DESCRIPTION_BY_KEY.get(key);

const createProductSyncBaseFieldOption = (input: {
  value: string;
  label: string;
  group: string;
}): ProductSyncBaseFieldOption => ({
  value: input.value,
  label: input.label,
  group: input.group,
  description: describeBaseExportField(input.value),
});

const createProductSyncBaseFieldPatternHint = (value: string): ProductSyncBaseFieldPatternHint => ({
  value,
  description: describeBaseExportField(value) ?? value,
});

export const PRODUCT_SYNC_BASE_FIELD_OPTIONS_BY_APP_FIELD: Record<
  ProductSyncAppField,
  ProductSyncBaseFieldOption[]
> = {
  stock: [
    createProductSyncBaseFieldOption({
      value: 'stock',
      label: 'Inventory stock (stock)',
      group: 'Inventory',
    }),
  ],
  price: [
    createProductSyncBaseFieldOption({
      value: 'prices.0',
      label: 'Price group 0 (prices.0)',
      group: 'Pricing',
    }),
  ],
  name_en: [
    createProductSyncBaseFieldOption({
      value: 'text_fields.name',
      label: 'Product name (text_fields.name)',
      group: 'Text Fields',
    }),
    createProductSyncBaseFieldOption({
      value: 'text_fields.name|en',
      label: 'English name (text_fields.name|en)',
      group: 'Text Fields',
    }),
    createProductSyncBaseFieldOption({
      value: 'name',
      label: 'Legacy name (name)',
      group: 'Legacy fields',
    }),
    createProductSyncBaseFieldOption({
      value: 'name|en',
      label: 'Legacy English name (name|en)',
      group: 'Legacy fields',
    }),
  ],
  description_en: [
    createProductSyncBaseFieldOption({
      value: 'text_fields.description',
      label: 'Product description (text_fields.description)',
      group: 'Text Fields',
    }),
    createProductSyncBaseFieldOption({
      value: 'text_fields.description|en',
      label: 'English description (text_fields.description|en)',
      group: 'Text Fields',
    }),
    createProductSyncBaseFieldOption({
      value: 'description',
      label: 'Legacy description (description)',
      group: 'Legacy fields',
    }),
    createProductSyncBaseFieldOption({
      value: 'description|en',
      label: 'Legacy English description (description|en)',
      group: 'Legacy fields',
    }),
  ],
  sku: [
    createProductSyncBaseFieldOption({
      value: 'sku',
      label: 'SKU (sku)',
      group: 'Identifiers',
    }),
  ],
  ean: [
    createProductSyncBaseFieldOption({
      value: 'ean',
      label: 'EAN (ean)',
      group: 'Identifiers',
    }),
  ],
  weight: [
    createProductSyncBaseFieldOption({
      value: 'weight',
      label: 'Weight (weight)',
      group: 'Physical',
    }),
  ],
};

export const PRODUCT_SYNC_BASE_FIELD_PATTERN_HINTS_BY_APP_FIELD: Record<
  ProductSyncAppField,
  ProductSyncBaseFieldPatternHint[]
> = {
  stock: [
    createProductSyncBaseFieldPatternHint('stock.<warehouse_id>'),
    createProductSyncBaseFieldPatternHint('stock.bl_<warehouse_id>'),
  ],
  price: [createProductSyncBaseFieldPatternHint('prices.<price_group_id>')],
  name_en: [],
  description_en: [],
  sku: [],
  ean: [],
  weight: [],
};

export const getProductSyncBaseFieldOptions = (
  appField: ProductSyncAppField
): ProductSyncBaseFieldOption[] => PRODUCT_SYNC_BASE_FIELD_OPTIONS_BY_APP_FIELD[appField];

export const isKnownProductSyncBaseField = (
  appField: ProductSyncAppField,
  value: string
): boolean => {
  const normalizedValue = value.trim();
  if (!normalizedValue) return false;
  return PRODUCT_SYNC_BASE_FIELD_OPTIONS_BY_APP_FIELD[appField].some(
    (option) => option.value === normalizedValue
  );
};

export const resolveProductSyncBaseFieldOption = (
  appField: ProductSyncAppField,
  value: string
): ProductSyncBaseFieldOption | null => {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  return (
    PRODUCT_SYNC_BASE_FIELD_OPTIONS_BY_APP_FIELD[appField].find(
      (option) => option.value === normalizedValue
    ) ?? null
  );
};

const resolveDynamicProductSyncBaseFieldOption = (
  appField: ProductSyncAppField,
  value: string
): ProductSyncBaseFieldOption | null => {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  if (appField === 'stock' && normalizedValue.startsWith('stock.')) {
    const warehouseId = normalizedValue.slice('stock.'.length).trim();
    if (!warehouseId) return null;
    return {
      value: normalizedValue,
      label: `Warehouse stock (${warehouseId})`,
      description: `Stock for Base.com warehouse ${warehouseId}.`,
      group: 'Inventory',
    };
  }

  if (appField === 'price' && normalizedValue.startsWith('prices.')) {
    const priceGroupId = normalizedValue.slice('prices.'.length).trim();
    if (!priceGroupId) return null;
    return {
      value: normalizedValue,
      label: `Price group (${priceGroupId})`,
      description: `Price for Base.com price group ${priceGroupId}.`,
      group: 'Pricing',
    };
  }

  return null;
};

export const getProductSyncBaseFieldPresentation = (
  appField: ProductSyncAppField,
  value: string
): { label: string; description: string | null; isKnown: boolean } => {
  const normalizedValue = value.trim();
  const knownOption = resolveProductSyncBaseFieldOption(appField, normalizedValue);
  const dynamicOption =
    knownOption === null
      ? resolveDynamicProductSyncBaseFieldOption(appField, normalizedValue)
      : null;
  const effectiveOption = knownOption ?? dynamicOption;
  if (effectiveOption) {
    return {
      label: effectiveOption.label,
      description: effectiveOption.description ?? null,
      isKnown: true,
    };
  }
  return {
    label: normalizedValue || 'Custom path',
    description: normalizedValue ? null : 'Custom Base.com field path.',
    isKnown: false,
  };
};

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

type ProductSyncRuleFieldCarrier = {
  appField: ProductSyncAppField;
};

export const findDuplicateProductSyncAppField = (
  rules: ProductSyncRuleFieldCarrier[]
): ProductSyncAppField | null => {
  const seen = new Set<ProductSyncAppField>();
  for (const rule of rules) {
    if (seen.has(rule.appField)) {
      return rule.appField;
    }
    seen.add(rule.appField);
  }
  return null;
};

const buildUniqueProductSyncFieldRulesSchema = <
  T extends z.ZodTypeAny
>(
  schema: T
) =>
  schema.superRefine((rules: unknown, ctx) => {
    if (!Array.isArray(rules)) return;
    const ruleList = rules as ProductSyncRuleFieldCarrier[];
    const duplicateAppField = findDuplicateProductSyncAppField(ruleList);
    if (!duplicateAppField) return;
    const duplicateIndex = ruleList.findIndex(
      (rule, index) =>
        rule.appField === duplicateAppField &&
        ruleList.findIndex((candidate) => candidate.appField === duplicateAppField) !== index
    );
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: duplicateIndex >= 0 ? [duplicateIndex, 'appField'] : ['fieldRules'],
      message: `Only one synchronization rule is allowed for ${duplicateAppField}.`,
    });
  });

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

export const getProductSyncAppFieldLabel = (field: ProductSyncAppField): string => {
  if (field === 'name_en') return 'Name (EN)';
  if (field === 'description_en') return 'Description (EN)';
  if (field === 'stock') return 'Stock';
  if (field === 'price') return 'Price';
  if (field === 'sku') return 'SKU';
  if (field === 'ean') return 'EAN';
  if (field === 'weight') return 'Weight';
  return field;
};

export const buildEffectiveProductSyncFieldRules = (
  configuredRules?: ProductSyncFieldRule[] | null
): ProductSyncFieldRule[] =>
  PRODUCT_SYNC_APP_FIELDS.map((appField: ProductSyncAppField) => {
    const configuredRule =
      configuredRules?.find((rule: ProductSyncFieldRule) => rule.appField === appField) ?? null;
    if (configuredRule) return configuredRule;
    const defaultRule = DEFAULT_PRODUCT_SYNC_FIELD_RULES.find(
      (rule) => rule.appField === appField
    );
    return {
      id: `implicit-${appField}`,
      appField,
      baseField: defaultRule?.baseField ?? appField,
      direction: 'disabled',
    };
  });

export const productSyncProfileSchema = namedDtoSchema.extend({
  isDefault: z.boolean(),
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
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
  connectionId: z.string().trim().min(1),
  inventoryId: z.string().trim().min(1),
  catalogId: z.string().trim().nullable().optional(),
  scheduleIntervalMinutes: z.number().int().min(1).max(24 * 60).optional(),
  batchSize: z.number().int().min(1).max(500).optional(),
  conflictPolicy: productSyncConflictPolicySchema.optional(),
  fieldRules: buildUniqueProductSyncFieldRulesSchema(
    z.array(productSyncFieldRulePayloadSchema)
  ).optional(),
});
export type ProductSyncProfileCreatePayload = z.infer<typeof productSyncProfileCreatePayloadSchema>;

export const productSyncProfileUpdatePayloadSchema = z.object({
  name: z.string().trim().min(1).optional(),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
  connectionId: z.string().trim().min(1).optional(),
  inventoryId: z.string().trim().min(1).optional(),
  catalogId: z.string().trim().nullable().optional(),
  scheduleIntervalMinutes: z.number().int().min(1).max(24 * 60).optional(),
  batchSize: z.number().int().min(1).max(500).optional(),
  conflictPolicy: productSyncConflictPolicySchema.optional(),
  fieldRules: buildUniqueProductSyncFieldRulesSchema(
    z.array(productSyncFieldRulePayloadSchema)
  ).optional(),
});
export type ProductSyncProfileUpdatePayload = z.infer<typeof productSyncProfileUpdatePayloadSchema>;

export const productSyncProfilesResponseSchema = z.object({
  profiles: z.array(productSyncProfileSchema),
});
export type ProductSyncProfilesResponse = z.infer<typeof productSyncProfilesResponseSchema>;

export const productSyncPreviewValueSchema = z.union([z.string(), z.number(), z.null()]);
export type ProductSyncPreviewValue = z.infer<typeof productSyncPreviewValueSchema>;

export const productSyncPreviewStatusSchema = z.enum([
  'ready',
  'missing_profile',
  'profile_run_active',
  'missing_base_link',
  'missing_base_record',
  'connection_error',
]);
export type ProductSyncPreviewStatus = z.infer<typeof productSyncPreviewStatusSchema>;

export const productSyncTargetSourceSchema = z.enum([
  'product',
  'listing',
  'sku_backfill',
  'none',
]);
export type ProductSyncTargetSource = z.infer<typeof productSyncTargetSourceSchema>;

export const productSyncPreviewProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  enabled: z.boolean(),
  connectionId: z.string(),
  connectionName: z.string().nullable().optional(),
  inventoryId: z.string(),
  catalogId: z.string().nullable(),
  lastRunAt: z.string().nullable(),
});
export type ProductSyncPreviewProfile = z.infer<typeof productSyncPreviewProfileSchema>;

export const productSyncFieldPreviewSchema = z.object({
  appField: productSyncAppFieldSchema,
  appFieldLabel: z.string(),
  baseField: z.string(),
  baseFieldLabel: z.string(),
  baseFieldDescription: z.string().nullable(),
  direction: productSyncDirectionSchema,
  appValue: productSyncPreviewValueSchema,
  baseValue: productSyncPreviewValueSchema,
  hasDifference: z.boolean(),
  willWriteToApp: z.boolean(),
  willWriteToBase: z.boolean(),
});
export type ProductSyncFieldPreview = z.infer<typeof productSyncFieldPreviewSchema>;

export const productSyncPreviewSchema = z.object({
  status: productSyncPreviewStatusSchema,
  canSync: z.boolean(),
  disabledReason: z.string().nullable(),
  profile: productSyncPreviewProfileSchema.nullable(),
  linkedBaseProductId: z.string().nullable(),
  resolvedTargetSource: productSyncTargetSourceSchema,
  fields: z.array(productSyncFieldPreviewSchema),
});
export type ProductSyncPreview = z.infer<typeof productSyncPreviewSchema>;

export const productSyncSingleProductResultSchema = z.object({
  status: z.enum(['success', 'skipped', 'failed']),
  localChanges: z.array(z.string()),
  baseChanges: z.array(z.string()),
  message: z.string().nullable(),
  errorMessage: z.string().nullable(),
});
export type ProductSyncSingleProductResult = z.infer<typeof productSyncSingleProductResultSchema>;

export const productSyncSingleProductResponseSchema = z.object({
  preview: productSyncPreviewSchema,
  result: productSyncSingleProductResultSchema,
});
export type ProductSyncSingleProductResponse = z.infer<typeof productSyncSingleProductResponseSchema>;

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
