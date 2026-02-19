import { z } from 'zod';

import { localizedSchema, dtoBaseSchema, namedDtoSchema } from './base';
import { imageFileRecordSchema } from './files';
import { commonListQuerySchema } from '../validations/api-schemas';

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

/**
 * Product Category With Children Contract
 */
export interface ProductCategoryWithChildrenDto extends ProductCategoryDto {
  children: ProductCategoryWithChildrenDto[];
}

export const productCategoryWithChildrenSchema: z.ZodType<ProductCategoryWithChildrenDto> =
  productCategorySchema.extend({
    children: z.array(z.lazy(() => productCategoryWithChildrenSchema)),
  });

export const createProductCategorySchema = productCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductCategoryDto = z.infer<typeof createProductCategorySchema>;
export type ProductCategoryCreateInput = CreateProductCategoryDto;
export type UpdateProductCategoryDto = Partial<CreateProductCategoryDto>;
export type ProductCategoryUpdateInput = UpdateProductCategoryDto;

export const productCategoryFiltersSchema = z.object({
  catalogId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  search: z.string().optional(),
});

export type ProductCategoryFiltersDto = z.infer<typeof productCategoryFiltersSchema>;

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
}).extend({
  color: z.string().nullable().optional(),
});

export type ProductTagCreateInputDto = z.infer<typeof createProductTagSchema>;

export const updateProductTagSchema = createProductTagSchema.partial();

export type ProductTagUpdateInputDto = z.infer<typeof updateProductTagSchema>;

export const productTagFiltersSchema = z.object({
  catalogId: z.string().optional(),
  search: z.string().optional(),
});

export type ProductTagFiltersDto = z.infer<typeof productTagFiltersSchema>;

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
}).extend({
  description: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  languageIds: z.array(z.string()).optional(),
  priceGroupIds: z.array(z.string()).optional(),
});

export type CatalogCreateInputDto = z.infer<typeof createCatalogSchema>;

export const updateCatalogSchema = createCatalogSchema.partial();

export type CatalogUpdateInputDto = z.infer<typeof updateCatalogSchema>;

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

export const createProductParameterSchema = productParameterSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  selectorType: productParameterSelectorTypeSchema.optional(),
  optionLabels: z.array(z.string()).optional(),
});

export type ProductParameterCreateInputDto = z.infer<typeof createProductParameterSchema>;

export const updateProductParameterSchema = createProductParameterSchema.partial();

export type ProductParameterUpdateInputDto = z.infer<typeof updateProductParameterSchema>;

export const productParameterFiltersSchema = z.object({
  catalogId: z.string().optional(),
  search: z.string().optional(),
});

export type ProductParameterFiltersDto = z.infer<typeof productParameterFiltersSchema>;

/**
 * Product Simple Parameter Contract
 */
export const productSimpleParameterSchema = productParameterSchema.omit({
  selectorType: true,
  optionLabels: true,
});

export type ProductSimpleParameterDto = z.infer<typeof productSimpleParameterSchema>;

/**
 * Product Simple Parameter Value Contract
 */
export const productSimpleParameterValueSchema = z.object({
  parameterId: z.string(),
  value: z.string().nullable().optional(),
});

export type ProductSimpleParameterValueDto = z.infer<typeof productSimpleParameterValueSchema>;

/**
 * Currency Contract (Product-specific)
 */
export const productCurrencySchema = namedDtoSchema.extend({
  code: z.string(),
  symbol: z.string().nullable(),
});

export type ProductCurrencyDto = z.infer<typeof productCurrencySchema>;

/**
 * Price Group With Details Contract
 */
export const priceGroupWithDetailsSchema = priceGroupSchema.extend({
  currency: productCurrencySchema,
  currencyCode: z.string(),
});

export type PriceGroupWithDetailsDto = z.infer<typeof priceGroupWithDetailsSchema>;

/**
 * Price Group For Calculation Contract
 */
export const priceGroupForCalculationSchema = z.object({
  id: z.string(),
  groupId: z.string().optional(),
  currencyId: z.string(),
  type: z.string(),
  isDefault: z.boolean(),
  sourceGroupId: z.string().nullable(),
  priceMultiplier: z.number(),
  addToPrice: z.number(),
  currency: z.object({ code: z.string() }),
  currencyCode: z.string().optional(),
});

export type PriceGroupForCalculationDto = z.infer<typeof priceGroupForCalculationSchema>;

/**
 * Product Image Contract
 */
export const productImageSchema = z.object({
  productId: z.string(),
  imageFileId: z.string(),
  assignedAt: z.string(),
  imageFile: z.lazy(() => imageFileRecordSchema).optional(),
});

export type ProductImageDto = z.infer<typeof productImageSchema>;

/**
 * Product Image Record Contract (Domain-specific DTO)
 */
export const productImageRecordSchema = productImageSchema.omit({
  imageFile: true,
}).extend({
  imageFile: imageFileRecordSchema,
});

export type ProductImageRecordDto = z.infer<typeof productImageRecordSchema>;

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
 * Product Catalog Record Contract (Domain-specific DTO)
 */
export const productCatalogRecordSchema = productCatalogSchema.extend({
  catalog: catalogSchema,
});

export type ProductCatalogRecordDto = z.infer<typeof productCatalogRecordSchema>;

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
  value: z.string().nullable().optional(),
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

/**
 * Product With Images Contract
 */
export const productWithImagesSchema = productSchema
  .omit({
    images: true,
    catalogs: true,
    tags: true,
    producers: true,
  })
  .extend({
    images: z.array(productImageRecordSchema),
    catalogs: z.array(productCatalogRecordSchema),
    tags: z.array(productTagRelationSchema).optional(),
    producers: z.array(productProducerRelationSchema).optional(),
  });

export type ProductWithImagesDto = z.infer<typeof productWithImagesSchema>;

/**
 * Product Input Contracts (Modular/API)
 */
export const productCreateInputSchema = z.object({
  id: z.string().nullable().optional(),
  baseProductId: z.string().nullable().optional(),
  defaultPriceGroupId: z.string().nullable().optional(),
  sku: z.string().min(1, 'SKU is required for new products'),
  ean: z.string().nullable().optional(),
  gtin: z.string().nullable().optional(),
  asin: z.string().nullable().optional(),
  name_en: z.string().nullable().optional(),
  name_pl: z.string().nullable().optional(),
  name_de: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  description_pl: z.string().nullable().optional(),
  description_de: z.string().nullable().optional(),
  price: z.number().int().min(0).optional(),
  supplierName: z.string().nullable().optional(),
  supplierLink: z.string().nullable().optional(),
  priceComment: z.string().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  sizeLength: z.number().int().min(0).optional(),
  sizeWidth: z.number().int().min(0).optional(),
  weight: z.number().int().min(0).optional(),
  length: z.number().int().min(0).optional(),
  categoryId: z.string().nullable().optional(),
  imageLinks: z.array(z.string()).optional(),
  imageBase64s: z.array(z.string()).optional(),
  parameters: z.array(productParameterValueSchema).optional(),
});

export type ProductCreateInputDto = z.infer<typeof productCreateInputSchema>;

export const productUpdateInputSchema = productCreateInputSchema.partial().extend({
  sku: z.string().optional(),
});

export type ProductUpdateInputDto = z.infer<typeof productUpdateInputSchema>;

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

export const integrationDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type IntegrationDbProviderDto = z.infer<typeof integrationDbProviderSchema>;

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

export const productListPreferencesSchema = z.object({
  nameLocale: z.enum(['name_en', 'name_pl', 'name_de']),
  catalogFilter: z.string(),
  currencyCode: z.string().nullable(),
  pageSize: z.number(),
  thumbnailSource: z.enum(['file', 'link', 'base64']),
  filtersCollapsedByDefault: z.boolean(),
});

export type ProductListPreferencesDto = z.infer<typeof productListPreferencesSchema>;

/**
 * Product Filter Contract
 */
export const productFilterSchema = commonListQuerySchema.extend({
  sku: z.string().trim().optional(),
  description: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  catalogId: z.string().trim().optional(),
  searchLanguage: z.enum(['name_en', 'name_pl', 'name_de']).optional(),
  baseExported: z.preprocess((value: unknown) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return undefined;
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
    return value;
  }, z.boolean().optional()),
});

export type ProductFilterDto = z.infer<typeof productFilterSchema>;

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
export type ProductValidationSeverityDto = z.infer<typeof productValidationSeveritySchema>;

export const productValidationDenyBehaviorSchema = z.enum(['ask_again', 'mute_session']);
export type ProductValidationDenyBehaviorDto = z.infer<typeof productValidationDenyBehaviorSchema>;

export const productValidationInstanceScopeSchema = z.enum([
  'draft_template',
  'product_create',
  'product_edit',
]);
export type ProductValidationInstanceScopeDto = z.infer<typeof productValidationInstanceScopeSchema>;

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

export type ProductValidationTargetDto = z.infer<typeof productValidationTargetSchema>;
export type ProductValidationRuntimeTypeDto = 'none' | 'database_query' | 'ai_prompt';
export type ProductValidationPostAcceptBehaviorDto = 'revalidate' | 'stop_after_accept';
export type ProductValidationChainModeDto = 'continue' | 'stop_on_match' | 'stop_on_replace';
export type ProductValidationLaunchScopeBehaviorDto = 'gate' | 'condition_only';
export type ProductValidationLaunchSourceModeDto = 'current_field' | 'form_field' | 'latest_product_field';
export type ProductValidationLaunchOperatorDto =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty';

export type ProductValidationPatternDto = z.infer<typeof productValidationPatternSchema>;

export const createProductValidationPatternSchema = productValidationPatternSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  locale: z.string().nullable().optional(),
  flags: z.string().nullable().optional(),
  severity: productValidationSeveritySchema.nullable().optional(),
  enabled: z.boolean().optional(),
  replacementEnabled: z.boolean().optional(),
  replacementAutoApply: z.boolean().optional(),
  skipNoopReplacementProposal: z.boolean().optional(),
  replacementValue: z.string().nullable().optional(),
  replacementFields: z.array(z.string()).optional(),
  runtimeEnabled: z.boolean().optional(),
  runtimeType: z.enum(['none', 'database_query', 'ai_prompt']).optional(),
  runtimeConfig: z.string().nullable().optional(),
  postAcceptBehavior: z.enum(['revalidate', 'stop_after_accept']).optional(),
  denyBehaviorOverride: productValidationDenyBehaviorSchema.nullable().optional(),
  validationDebounceMs: z.number().optional(),
  sequenceGroupId: z.string().nullable().optional(),
  sequenceGroupLabel: z.string().nullable().optional(),
  sequenceGroupDebounceMs: z.number().optional(),
  sequence: z.number().nullable().optional(),
  chainMode: z.enum(['continue', 'stop_on_match', 'stop_on_replace']).optional(),
  maxExecutions: z.number().optional(),
  passOutputToNext: z.boolean().optional(),
  launchEnabled: z.boolean().optional(),
  launchSourceMode: z.enum(['current_field', 'form_field', 'latest_product_field']).optional(),
  launchSourceField: z.string().nullable().optional(),
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
  ]).optional(),
  launchValue: z.string().nullable().optional(),
  launchFlags: z.string().nullable().optional(),
});

export type CreateProductValidationPatternDto = z.infer<typeof createProductValidationPatternSchema>;

export const updateProductValidationPatternSchema = createProductValidationPatternSchema.partial().extend({
  expectedUpdatedAt: z.string().nullable().optional(),
});

export type UpdateProductValidationPatternDto = z.infer<typeof updateProductValidationPatternSchema>;

export const productValidationSequenceGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  debounceMs: z.number(),
  patternIds: z.array(z.string()),
});

export type ProductValidationSequenceGroupDto = z.infer<typeof productValidationSequenceGroupSchema>;

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

export const productReplacementModeSchema = z.enum(['static', 'dynamic']);
export type ProductReplacementModeDto = z.infer<typeof productReplacementModeSchema>;

export const productValidationSequenceGroupDraftSchema = z.object({
  label: z.string(),
  debounceMs: z.string(),
});

export type ProductValidationSequenceGroupDraftDto = z.infer<typeof productValidationSequenceGroupDraftSchema>;

export const productValidationPatternFormDataSchema = z.object({
  label: z.string(),
  target: productValidationTargetSchema,
  locale: z.string(),
  regex: z.string(),
  flags: z.string(),
  message: z.string(),
  severity: productValidationSeveritySchema,
  enabled: z.boolean(),
  replacementEnabled: z.boolean(),
  replacementAutoApply: z.boolean(),
  skipNoopReplacementProposal: z.boolean(),
  replacementValue: z.string(),
  replacementFields: z.array(z.string()),
  replacementAppliesToScopes: z.array(productValidationInstanceScopeSchema),
  postAcceptBehavior: z.enum(['revalidate', 'stop_after_accept']),
  denyBehaviorOverride: z.enum(['inherit', 'ask_again', 'mute_session']),
  validationDebounceMs: z.string(),
  replacementMode: productReplacementModeSchema,
  sourceMode: dynamicReplacementSourceModeSchema,
  sourceField: z.string(),
  sourceRegex: z.string(),
  sourceFlags: z.string(),
  sourceMatchGroup: z.string(),
  launchEnabled: z.boolean(),
  launchAppliesToScopes: z.array(productValidationInstanceScopeSchema),
  launchScopeBehavior: z.enum(['gate', 'condition_only']),
  launchSourceMode: dynamicReplacementSourceModeSchema,
  launchSourceField: z.string(),
  launchOperator: dynamicReplacementLogicOperatorSchema,
  launchValue: z.string(),
  launchFlags: z.string(),
  mathOperation: dynamicReplacementMathOperationSchema,
  mathOperand: z.string(),
  roundMode: dynamicReplacementRoundModeSchema,
  padLength: z.string(),
  padChar: z.string(),
  logicOperator: dynamicReplacementLogicOperatorSchema,
  logicOperand: z.string(),
  logicFlags: z.string(),
  logicWhenTrueAction: dynamicReplacementLogicActionSchema,
  logicWhenTrueValue: z.string(),
  logicWhenFalseAction: dynamicReplacementLogicActionSchema,
  logicWhenFalseValue: z.string(),
  resultAssembly: dynamicReplacementResultAssemblySchema,
  targetApply: dynamicReplacementTargetApplySchema,
  sequence: z.string(),
  chainMode: z.enum(['continue', 'stop_on_match', 'stop_on_replace']),
  maxExecutions: z.string(),
  passOutputToNext: z.boolean(),
  runtimeEnabled: z.boolean(),
  runtimeType: z.enum(['none', 'database_query', 'ai_prompt']),
  runtimeConfig: z.string(),
  appliesToScopes: z.array(productValidationInstanceScopeSchema),
});

export type ProductValidationPatternFormDataDto = z.infer<typeof productValidationPatternFormDataSchema>;

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

export const updateProductDraftSchema = createProductDraftSchema.partial();

export type UpdateProductDraftDto = Partial<CreateProductDraftDto>;

