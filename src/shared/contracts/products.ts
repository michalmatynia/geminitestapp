import { z } from 'zod';

import { localizedSchema, dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Product Category Contract
 */
export const productCategorySchema = namedDtoSchema.extend({
  name_en: z.string().nullable().optional(),
  name_pl: z.string().nullable().optional(),
  name_de: z.string().nullable().optional(),
  color: z.string().nullable(),
  parentId: z.string().nullable(),
  catalogId: z.string(),
  sortIndex: z.number().nullable().optional(),
});

export type ProductCategoryDto = z.infer<typeof productCategorySchema>;

export const createProductCategorySchema = productCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductCategoryDto = z.infer<typeof createProductCategorySchema>;
export type ProductCategoryCreateInput = CreateProductCategoryDto;
export type UpdateProductCategoryDto = Partial<CreateProductCategoryDto>;
export type ProductCategoryUpdateInput = UpdateProductCategoryDto;

/**
 * Product Tag Contract
 */
export const productTagSchema = namedDtoSchema.extend({
  color: z.string().nullable(),
  catalogId: z.string(),
});

export type ProductTagDto = z.infer<typeof productTagSchema>;

export const createProductTagSchema = productTagSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductTagDto = z.infer<typeof createProductTagSchema>;
export type ProductTagCreateInput = CreateProductTagDto;
export type UpdateProductTagDto = Partial<CreateProductTagDto>;
export type ProductTagUpdateInput = UpdateProductTagDto;

/**
 * Catalog Contract
 */
export const catalogSchema = namedDtoSchema.extend({
  isDefault: z.boolean(),
  languageIds: z.array(z.string()),
  defaultLanguageId: z.string().nullable(),
  defaultPriceGroupId: z.string().nullable(),
  priceGroupIds: z.array(z.string()),
});

export type CatalogDto = z.infer<typeof catalogSchema>;

export const createCatalogSchema = catalogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCatalogDto = z.infer<typeof createCatalogSchema>;
export type CatalogCreateInput = CreateCatalogDto;
export type UpdateCatalogDto = Partial<CreateCatalogDto>;
export type CatalogUpdateInput = UpdateCatalogDto;

/**
 * Price Group Contract
 */
export const priceGroupSchema = namedDtoSchema.extend({
  groupId: z.string(),
  currencyId: z.string(),
  currencyCode: z.string(),
  isDefault: z.boolean(),
  groupType: z.enum(['standard', 'dependent']),
  type: z.string(),
  basePriceField: z.string(),
  sourceGroupId: z.string().nullable(),
  priceMultiplier: z.number(),
  addToPrice: z.number(),
});

export type PriceGroupDto = z.infer<typeof priceGroupSchema>;

export const createPriceGroupSchema = priceGroupSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePriceGroupDto = z.infer<typeof createPriceGroupSchema>;
export type PriceGroupCreateInput = CreatePriceGroupDto;
export type UpdatePriceGroupDto = Partial<CreatePriceGroupDto>;
export type PriceGroupUpdateInput = UpdatePriceGroupDto;

/**
 * Producer Contract
 */
export const producerSchema = namedDtoSchema.extend({
  website: z.string().nullable(),
});

export type ProducerDto = z.infer<typeof producerSchema>;

export const createProducerSchema = producerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProducerDto = z.infer<typeof createProducerSchema>;

/**
 * Product Parameter Contract
 */
export const productParameterSelectorTypeSchema = z.enum([
  'text',
  'textarea',
  'radio',
  'select',
  'dropdown',
  'checkbox',
  'checklist',
]);

export type ProductParameterSelectorTypeDto = z.infer<
  typeof productParameterSelectorTypeSchema
>;

export const productParameterSchema = namedDtoSchema.extend({
  catalogId: z.string(),
  name_en: z.string(),
  name_pl: z.string().nullable(),
  name_de: z.string().nullable(),
  selectorType: productParameterSelectorTypeSchema,
  optionLabels: z.array(z.string()),
});

export type ProductParameterDto = z.infer<typeof productParameterSchema>;

/**
 * Currency Contract (Product-specific)
 */
export const productCurrencySchema = namedDtoSchema.extend({
  code: z.string(),
  symbol: z.string().nullable(),
});

export type ProductCurrencyDto = z.infer<typeof productCurrencySchema>;

/**
 * Product Image Contract
 */
export const productImageSchema = z.object({
  productId: z.string(),
  imageFileId: z.string(),
  assignedAt: z.string(),
  imageFile: z.unknown().optional(), // Avoid circular dependency if ImageFile is in another contract
});

export type ProductImageDto = z.infer<typeof productImageSchema>;

/**
 * Product Catalog Contract
 */
export const productCatalogSchema = z.object({
  productId: z.string(),
  catalogId: z.string(),
  assignedAt: z.string(),
  catalog: z.lazy(() => catalogSchema).optional(),
});

export type ProductCatalogDto = z.infer<typeof productCatalogSchema>;

/**
 * Product Tag Relation Contract
 */
export const productTagRelationSchema = z.object({
  productId: z.string(),
  tagId: z.string(),
  assignedAt: z.string(),
  tag: z.lazy(() => productTagSchema).optional(),
});

export type ProductTagRelationDto = z.infer<typeof productTagRelationSchema>;

/**
 * Product Producer Relation Contract
 */
export const productProducerRelationSchema = z.object({
  productId: z.string(),
  producerId: z.string(),
  assignedAt: z.string(),
  producer: z.lazy(() => producerSchema).optional(),
});

export type ProductProducerRelationDto = z.infer<typeof productProducerRelationSchema>;

/**
 * Product Parameter Value Contract
 */
export const productParameterValueSchema = z.object({
  parameterId: z.string(),
  value: z.string(),
  valuesByLanguage: z.record(z.string(), z.string()).optional(),
});

export type ProductParameterValueDto = z.infer<typeof productParameterValueSchema>;

/**
 * Product Contract
 */
export const productSchema = dtoBaseSchema.extend({
  sku: z.string().nullable(),
  baseProductId: z.string().nullable(),
  defaultPriceGroupId: z.string().nullable(),
  ean: z.string().nullable(),
  gtin: z.string().nullable(),
  asin: z.string().nullable(),
  name: localizedSchema,
  description: localizedSchema,
  name_en: z.string().nullable().optional(),
  name_pl: z.string().nullable().optional(),
  name_de: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  description_pl: z.string().nullable().optional(),
  description_de: z.string().nullable().optional(),
  supplierName: z.string().nullable(),
  supplierLink: z.string().nullable(),
  priceComment: z.string().nullable(),
  stock: z.number().nullable(),
  price: z.number().nullable(),
  sizeLength: z.number().nullable(),
  sizeWidth: z.number().nullable(),
  weight: z.number().nullable(),
  length: z.number().nullable(),
  published: z.boolean(),
  categoryId: z.string().nullable(),
  catalogId: z.string(),
  tags: z.array(productTagRelationSchema).optional(),
  producers: z.array(productProducerRelationSchema).optional(),
  images: z.array(productImageSchema).optional(),
  catalogs: z.array(productCatalogSchema).optional(),
  parameters: z.array(productParameterValueSchema).optional(),
  imageLinks: z.array(z.string()).optional(),
  imageBase64s: z.array(z.string()).optional(),
  noteIds: z.array(z.string()).optional(),
});

export type ProductDto = z.infer<typeof productSchema>;

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type ProductCreateInput = CreateProductDto;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type ProductUpdateInput = UpdateProductDto;

/**
 * Product Domain Enums & DTOs
 */

export const productDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type ProductDbProviderDto = z.infer<typeof productDbProviderSchema>;

export const productMigrationDirectionSchema = z.enum(['prisma-to-mongo', 'mongo-to-prisma']);
export type ProductMigrationDirectionDto = z.infer<typeof productMigrationDirectionSchema>;

export const syncDirectionSchema = z.enum(['to_base', 'from_base', 'bidirectional']);
export type SyncDirectionDto = z.infer<typeof syncDirectionSchema>;

export const priceGroupTypeSchema = z.enum(['standard', 'dependent']);
export type PriceGroupTypeDto = z.infer<typeof priceGroupTypeSchema>;

export const productMigrationBatchResultSchema = z.object({
  direction: productMigrationDirectionSchema,
  productsProcessed: z.number(),
  productsUpserted: z.number(),
  nextCursor: z.string().nullable(),
  missingImageFileIds: z.array(z.string()),
  missingCatalogIds: z.array(z.string()),
});

export type ProductMigrationBatchResultDto = z.infer<typeof productMigrationBatchResultSchema>;

/**
 * Validation Contracts
 */
export const productValidationTargetSchema = z.enum([
  'name',
  'description',
  'sku',
  'price',
  'stock',
  'category',
  'size_length',
  'size_width',
  'length',
  'weight',
]);

export const productValidationSeveritySchema = z.enum(['error', 'warning']);
export const productValidationDenyBehaviorSchema = z.enum(['ask_again', 'mute_session']);
export const productValidationInstanceScopeSchema = z.enum([
  'draft_template',
  'product_create',
  'product_edit',
]);

export const productValidationPatternSchema = dtoBaseSchema.extend({
  label: z.string(),
  target: productValidationTargetSchema,
  locale: z.string().nullable(),
  regex: z.string(),
  flags: z.string().nullable(),
  message: z.string(),
  severity: productValidationSeveritySchema,
  enabled: z.boolean(),
  replacementEnabled: z.boolean(),
  replacementAutoApply: z.boolean(),
  skipNoopReplacementProposal: z.boolean(),
  replacementValue: z.string().nullable(),
  replacementFields: z.array(z.string()),
  replacementAppliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
  runtimeEnabled: z.boolean(),
  runtimeType: z.enum(['none', 'database_query', 'ai_prompt']),
  runtimeConfig: z.string().nullable(),
  postAcceptBehavior: z.enum(['revalidate', 'stop_after_accept']),
  denyBehaviorOverride: productValidationDenyBehaviorSchema.nullable(),
  validationDebounceMs: z.number(),
  sequenceGroupId: z.string().nullable(),
  sequenceGroupLabel: z.string().nullable(),
  sequenceGroupDebounceMs: z.number(),
  sequence: z.number().nullable(),
  chainMode: z.enum(['continue', 'stop_on_match', 'stop_on_replace']),
  maxExecutions: z.number(),
  passOutputToNext: z.boolean(),
  launchEnabled: z.boolean(),
  launchAppliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
  launchScopeBehavior: z.enum(['gate', 'condition_only']).optional(),
  launchSourceMode: z.enum(['current_field', 'form_field', 'latest_product_field']),
  launchSourceField: z.string().nullable(),
  launchOperator: z.enum([
    'equals',
    'not_equals',
    'contains',
    'starts_with',
    'ends_with',
    'regex',
    'gt',
    'gte',
    'lt',
    'lte',
    'is_empty',
    'is_not_empty',
  ]),
  launchValue: z.string().nullable(),
  launchFlags: z.string().nullable(),
  appliesToScopes: z.array(productValidationInstanceScopeSchema).optional(),
});

export type ProductValidationPatternDto = z.infer<typeof productValidationPatternSchema>;

export const productValidatorSettingsSchema = z.object({
  enabledByDefault: z.boolean(),
  instanceDenyBehavior: z.record(
    productValidationInstanceScopeSchema,
    productValidationDenyBehaviorSchema
  ),
});

export type ProductValidatorSettingsDto = z.infer<typeof productValidatorSettingsSchema>;

export const productValidatorConfigSchema = z.object({
  enabledByDefault: z.boolean(),
  instanceDenyBehavior: z.record(
    productValidationInstanceScopeSchema,
    productValidationDenyBehaviorSchema
  ),
  patterns: z.array(productValidationPatternSchema),
});

export type ProductValidatorConfigDto = z.infer<typeof productValidatorConfigSchema>;

/**
 * Product Validation Replacement DTOs
 */

export const dynamicReplacementSourceModeSchema = z.enum([
  'current_field',
  'form_field',
  'latest_product_field',
]);
export type DynamicReplacementSourceModeDto = z.infer<typeof dynamicReplacementSourceModeSchema>;

export const dynamicReplacementMathOperationSchema = z.enum([
  'none',
  'add',
  'subtract',
  'multiply',
  'divide',
]);
export type DynamicReplacementMathOperationDto = z.infer<typeof dynamicReplacementMathOperationSchema>;

export const dynamicReplacementRoundModeSchema = z.enum(['none', 'round', 'floor', 'ceil']);
export type DynamicReplacementRoundModeDto = z.infer<typeof dynamicReplacementRoundModeSchema>;

export const dynamicReplacementResultAssemblySchema = z.enum(['segment_only', 'source_replace_match']);
export type DynamicReplacementResultAssemblyDto = z.infer<typeof dynamicReplacementResultAssemblySchema>;

export const dynamicReplacementTargetApplySchema = z.enum(['replace_whole_field', 'replace_matched_segment']);
export type DynamicReplacementTargetApplyDto = z.infer<typeof dynamicReplacementTargetApplySchema>;

export const dynamicReplacementLogicOperatorSchema = z.enum([
  'none',
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
  'gt',
  'gte',
  'lt',
  'lte',
  'is_empty',
  'is_not_empty',
]);
export type DynamicReplacementLogicOperatorDto = z.infer<typeof dynamicReplacementLogicOperatorSchema>;

export const dynamicReplacementLogicActionSchema = z.enum(['keep', 'set_value', 'clear', 'abort']);
export type DynamicReplacementLogicActionDto = z.infer<typeof dynamicReplacementLogicActionSchema>;

export const dynamicReplacementRecipeSchema = z.object({
  version: z.literal(1),
  sourceMode: dynamicReplacementSourceModeSchema,
  sourceField: z.string().nullable().optional(),
  sourceRegex: z.string().nullable().optional(),
  sourceFlags: z.string().nullable().optional(),
  sourceMatchGroup: z.number().nullable().optional(),
  mathOperation: dynamicReplacementMathOperationSchema.optional(),
  mathOperand: z.number().nullable().optional(),
  roundMode: dynamicReplacementRoundModeSchema.optional(),
  padLength: z.number().nullable().optional(),
  padChar: z.string().nullable().optional(),
  logicOperator: dynamicReplacementLogicOperatorSchema.optional(),
  logicOperand: z.string().nullable().optional(),
  logicFlags: z.string().nullable().optional(),
  logicWhenTrueAction: dynamicReplacementLogicActionSchema.optional(),
  logicWhenTrueValue: z.string().nullable().optional(),
  logicWhenFalseAction: dynamicReplacementLogicActionSchema.optional(),
  logicWhenFalseValue: z.string().nullable().optional(),
  resultAssembly: dynamicReplacementResultAssemblySchema.optional(),
  targetApply: dynamicReplacementTargetApplySchema.optional(),
});

export type DynamicReplacementRecipeDto = z.infer<typeof dynamicReplacementRecipeSchema>;

/**
 * Product Studio Sequencing DTOs
 */

export const productStudioSequenceGenerationModeSchema = z.enum([
  'studio_prompt_then_sequence',
  'model_full_sequence',
  'studio_native_sequencer_prior_generation',
  'auto',
]);

export type ProductStudioSequenceGenerationModeDto = z.infer<typeof productStudioSequenceGenerationModeSchema>;

export const productStudioExecutionRouteSchema = z.enum([
  'studio_sequencer',
  'studio_native_sequencer_prior_generation',
  'ai_model_full_sequence',
  'ai_direct_generation',
]);

export type ProductStudioExecutionRouteDto = z.infer<typeof productStudioExecutionRouteSchema>;

export const productStudioSequencingDiagnosticsScopeSchema = z.enum(['project', 'global', 'default']);

export type ProductStudioSequencingDiagnosticsScopeDto = z.infer<typeof productStudioSequencingDiagnosticsScopeSchema>;

export const productStudioSequenceReadinessStateSchema = z.enum([
  'ready',
  'project_settings_missing',
  'project_sequence_disabled',
  'project_steps_empty',
  'project_snapshot_stale',
]);

export type ProductStudioSequenceReadinessStateDto = z.infer<typeof productStudioSequenceReadinessStateSchema>;

export const productStudioSequencingConfigSchema = z.object({
  persistedEnabled: z.boolean(),
  enabled: z.boolean(),
  cropCenterBeforeGeneration: z.boolean(),
  upscaleOnAccept: z.boolean(),
  upscaleScale: z.number(),
  runViaSequence: z.boolean(),
  sequenceStepCount: z.number(),
  expectedOutputs: z.number(),
  snapshotHash: z.string().nullable(),
  snapshotSavedAt: z.string().nullable(),
  snapshotStepCount: z.number(),
  snapshotModelId: z.string().nullable(),
  currentSnapshotHash: z.string().nullable(),
  snapshotMatchesCurrent: z.boolean(),
  needsSaveDefaults: z.boolean(),
  needsSaveDefaultsReason: z.string().nullable(),
});

export type ProductStudioSequencingConfigDto = z.infer<typeof productStudioSequencingConfigSchema>;

export const productStudioSequencingDiagnosticsSchema = z.object({
  projectId: z.string().nullable(),
  projectSettingsKey: z.string().nullable(),
  selectedSettingsKey: z.string().nullable(),
  selectedScope: productStudioSequencingDiagnosticsScopeSchema,
  hasProjectSettings: z.boolean(),
  hasGlobalSettings: z.boolean(),
  projectSequencingEnabled: z.boolean(),
  globalSequencingEnabled: z.boolean(),
  selectedSequencingEnabled: z.boolean(),
  selectedSnapshotHash: z.string().nullable(),
  selectedSnapshotSavedAt: z.string().nullable(),
  selectedSnapshotStepCount: z.number(),
  selectedSnapshotModelId: z.string().nullable(),
});

export type ProductStudioSequencingDiagnosticsDto = z.infer<typeof productStudioSequencingDiagnosticsSchema>;

export const productStudioSequenceReadinessSchema = z.object({
  ready: z.boolean(),
  requiresProjectSequence: z.boolean(),
  state: productStudioSequenceReadinessStateSchema,
  message: z.string().nullable(),
});

export type ProductStudioSequenceReadinessDto = z.infer<typeof productStudioSequenceReadinessSchema>;

/**
 * Product Draft Contracts
 */
export const productDraftOpenFormTabSchema = z.enum([
  'general',
  'other',
  'parameters',
  'images',
  'studio',
  'import-info',
  'note-link',
  'validation',
]);

export type ProductDraftOpenFormTab = z.infer<typeof productDraftOpenFormTabSchema>;

export const productDraftSchema = namedDtoSchema.extend({
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  ean: z.string().nullable().optional(),
  gtin: z.string().nullable().optional(),
  asin: z.string().nullable().optional(),
  name_en: z.string().nullable().optional(),
  name_pl: z.string().nullable().optional(),
  name_de: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  description_pl: z.string().nullable().optional(),
  description_de: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  sizeLength: z.number().nullable().optional(),
  sizeWidth: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  price: z.number().nullable().optional(),
  supplierName: z.string().nullable().optional(),
  supplierLink: z.string().nullable().optional(),
  priceComment: z.string().nullable().optional(),
  stock: z.number().nullable().optional(),
  catalogIds: z.array(z.string()).optional(),
  categoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  producerIds: z.array(z.string()).optional(),
  parameters: z.array(productParameterValueSchema).optional(),
  defaultPriceGroupId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  validatorEnabled: z.boolean().optional(),
  formatterEnabled: z.boolean().optional(),
  icon: z.string().nullable().optional(),
  iconColorMode: z.enum(['theme', 'custom']).nullable().optional(),
  iconColor: z.string().nullable().optional(),
  openProductFormTab: productDraftOpenFormTabSchema.nullable().optional(),
  imageLinks: z.array(z.string()).optional(),
  baseProductId: z.string().nullable().optional(),
});

export type ProductDraftDto = z.infer<typeof productDraftSchema>;

export const createProductDraftSchema = productDraftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductDraftDto = z.infer<typeof createProductDraftSchema>;
export type UpdateProductDraftDto = Partial<CreateProductDraftDto>;
