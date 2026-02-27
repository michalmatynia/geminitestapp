import { z } from 'zod';

import { localizedSchema, dtoBaseSchema, namedDtoSchema } from './base';
import { imageFileRecordSchema, type ImageFileRecordDto as ImageFileRecord } from './files';
import { ManagedImageSlot } from './image-slots';
import { commonListQuerySchema } from '../validations/api-schemas';

export const PRODUCT_SIMPLE_PARAMETER_ID_PREFIX = 'sp:';
export const PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY = 'product_studio_default_project_id';

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
export type ProductCategory = ProductCategoryDto;

/**
 * Product Category With Children Contract
 */
export interface ProductCategoryWithChildrenDto extends ProductCategoryDto {
  children: ProductCategoryWithChildrenDto[];
}
export type ProductCategoryWithChildren = ProductCategoryWithChildrenDto;

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
export type ProductTag = ProductTagDto;

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
export type Catalog = CatalogDto;
export type CatalogRecord = CatalogDto;

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
export type PriceGroup = PriceGroupDto;
export type PriceGroupRecord = PriceGroupDto;

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
export type Producer = ProducerDto;

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
export type ProductParameter = ProductParameterDto;

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
export type ProductSimpleParameter = ProductSimpleParameterDto;

/**
 * Product Simple Parameter Value Contract
 */
export const productSimpleParameterValueSchema = z.object({
  parameterId: z.string(),
  value: z.string().nullable().optional(),
});

export type ProductSimpleParameterValueDto = z.infer<typeof productSimpleParameterValueSchema>;
export type ProductSimpleParameterValue = ProductSimpleParameterValueDto;

/**
 * Currency Contract (Product-specific)
 */
export const productCurrencySchema = namedDtoSchema.extend({
  code: z.string(),
  symbol: z.string().nullable(),
});

export type ProductCurrencyDto = z.infer<typeof productCurrencySchema>;
export type CurrencyRecord = ProductCurrencyDto;

/**
 * Price Group With Details Contract
 */
export const priceGroupWithDetailsSchema = priceGroupSchema.extend({
  currency: productCurrencySchema,
  currencyCode: z.string(),
});

export type PriceGroupWithDetailsDto = z.infer<typeof priceGroupWithDetailsSchema>;
export type PriceGroupWithDetails = PriceGroupWithDetailsDto;

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
export type PriceGroupForCalculation = PriceGroupForCalculationDto;

/**
 * Product Image Contract
 */
export const productImageSchema = z.object({
  productId: z.string(),
  imageFileId: z.string(),
  assignedAt: z.string(),
  imageFile: imageFileRecordSchema.optional(),
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

export interface ProductImageRecordDto {
  productId: string;
  imageFileId: string;
  assignedAt: string;
  imageFile: ImageFileRecord;
}

export type ProductImageRecord = ProductImageRecordDto;

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
export type ProductCatalogRecord = ProductCatalogRecordDto;

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
export type ProductParameterValue = ProductParameterValueDto;

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
export type ProductRecord = ProductDto;
export type Product = ProductDto;

/**
 * Product With Images Contract
 */
export const productWithImagesSchema = productSchema
  .extend({
    images: z.array(productImageRecordSchema).default([]),
    catalogs: z.array(productCatalogRecordSchema).default([]),
    tags: z.array(productTagRelationSchema).default([]),
    producers: z.array(productProducerRelationSchema).default([]),
  });
export type ProductWithImagesDto = z.infer<typeof productWithImagesSchema>;
export type ProductWithImages = ProductWithImagesDto;

/**
 * Product Input Contracts (Modular/API)
 */
const normalizeNumericFormValue = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'nan') return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : value;
};

const optionalNonNegativeNumberFromFormSchema = z.preprocess(
  normalizeNumericFormValue,
  z.number().min(0).optional()
);

const optionalNonNegativeIntFromFormSchema = z.preprocess(
  normalizeNumericFormValue,
  z.number().int().min(0).optional()
);

const preprocessStringArrayField = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall through to CSV parsing.
  }

  return trimmed
    .split(',')
    .map((part: string): string => part.trim())
    .filter((part: string): boolean => part.length > 0);
};

const optionalStringArrayFromFormSchema = z.preprocess(
  preprocessStringArrayField,
  z.array(z.string()).optional()
);

const optionalParameterValuesFromFormSchema = z.preprocess(
  (value: unknown): unknown => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  },
  z.array(productParameterValueSchema).optional()
);

export const productCreateInputSchema = z.object({
  id: z.string().nullable().optional(),
  baseProductId: z.string().nullable().optional(),
  defaultPriceGroupId: z.string().nullable().optional(),
  sku: z.preprocess(
    (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1, 'SKU is required for new products')
  ),
  ean: z.string().nullable().optional(),
  gtin: z.string().nullable().optional(),
  asin: z.string().nullable().optional(),
  name_en: z.string().nullable().optional(),
  name_pl: z.string().nullable().optional(),
  name_de: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  description_pl: z.string().nullable().optional(),
  description_de: z.string().nullable().optional(),
  price: optionalNonNegativeNumberFromFormSchema,
  supplierName: z.string().nullable().optional(),
  supplierLink: z.string().nullable().optional(),
  priceComment: z.string().nullable().optional(),
  stock: optionalNonNegativeIntFromFormSchema,
  sizeLength: optionalNonNegativeNumberFromFormSchema,
  sizeWidth: optionalNonNegativeNumberFromFormSchema,
  weight: optionalNonNegativeNumberFromFormSchema,
  length: optionalNonNegativeNumberFromFormSchema,
  categoryId: z.string().nullable().optional(),
  catalogIds: optionalStringArrayFromFormSchema,
  tagIds: optionalStringArrayFromFormSchema,
  producerIds: optionalStringArrayFromFormSchema,
  noteIds: optionalStringArrayFromFormSchema,
  studioProjectId: z.string().nullable().optional(),
  imageLinks: optionalStringArrayFromFormSchema,
  imageFileIds: optionalStringArrayFromFormSchema,
  imageBase64s: optionalStringArrayFromFormSchema,

  parameters: optionalParameterValuesFromFormSchema,
});

export type ProductCreateInputDto = z.infer<typeof productCreateInputSchema>;
export type CreateProductInput = ProductCreateInputDto;
export type ProductCreateInput = ProductCreateInputDto;

export const productUpdateInputSchema = productCreateInputSchema.partial().extend({
  sku: z.preprocess(
    (value: unknown): unknown => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().min(1).nullable().optional()
  ),
});

export type ProductUpdateInputDto = z.infer<typeof productUpdateInputSchema>;
export type UpdateProductInput = ProductUpdateInputDto;
export type ProductUpdateInput = ProductUpdateInputDto;

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type CreateProduct = CreateProductDto;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProductDto = z.infer<typeof updateProductSchema>;

/**
 * Product Domain Enums & DTOs
 */

export const productDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type ProductDbProviderDto = z.infer<typeof productDbProviderSchema>;
export type ProductDbProvider = ProductDbProviderDto;

export const integrationDbProviderSchema = z.enum(['prisma', 'mongodb']);
export type IntegrationDbProviderDto = z.infer<typeof integrationDbProviderSchema>;
export type IntegrationDbProvider = IntegrationDbProviderDto;

export const productMigrationDirectionSchema = z.enum(['prisma-to-mongo', 'mongo-to-prisma']);
export type ProductMigrationDirectionDto = z.infer<typeof productMigrationDirectionSchema>;
export type ProductMigrationDirection = ProductMigrationDirectionDto;

export const syncDirectionSchema = z.enum(['to_base', 'from_base', 'bidirectional']);
export type SyncDirectionDto = z.infer<typeof syncDirectionSchema>;
export type SyncDirection = SyncDirectionDto;

export const priceGroupTypeSchema = z.enum(['standard', 'dependent']);
export type PriceGroupTypeDto = z.infer<typeof priceGroupTypeSchema>;
export type PriceGroupType = PriceGroupTypeDto;

export const productMigrationBatchResultSchema = z.object({
  direction: productMigrationDirectionSchema,
  productsProcessed: z.number(),
  productsUpserted: z.number(),
  nextCursor: z.string().nullable(),
  missingImageFileIds: z.array(z.string()),
  missingCatalogIds: z.array(z.string()),
});

export type ProductMigrationBatchResultDto = z.infer<typeof productMigrationBatchResultSchema>;
export type ProductMigrationBatchResult = ProductMigrationBatchResultDto;

export const productAdvancedFilterFieldSchema = z.enum([
  'id',
  'sku',
  'name',
  'description',
  'categoryId',
  'catalogId',
  'tagId',
  'producerId',
  'price',
  'stock',
  'published',
  'baseExported',
  'baseProductId',
  'createdAt',
]);

export type ProductAdvancedFilterFieldDto = z.infer<typeof productAdvancedFilterFieldSchema>;
export type ProductAdvancedFilterField = ProductAdvancedFilterFieldDto;

export const productAdvancedFilterOperatorSchema = z.enum([
  'contains',
  'eq',
  'neq',
  'in',
  'notIn',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'isEmpty',
  'isNotEmpty',
]);

export type ProductAdvancedFilterOperatorDto = z.infer<typeof productAdvancedFilterOperatorSchema>;
export type ProductAdvancedFilterOperator = ProductAdvancedFilterOperatorDto;

export const productAdvancedFilterCombinatorSchema = z.enum(['and', 'or']);

export type ProductAdvancedFilterCombinatorDto = z.infer<typeof productAdvancedFilterCombinatorSchema>;
export type ProductAdvancedFilterCombinator = ProductAdvancedFilterCombinatorDto;

export const PRODUCT_ADVANCED_FILTER_MAX_DEPTH = 5;
export const PRODUCT_ADVANCED_FILTER_MAX_RULES = 40;
export const PRODUCT_ADVANCED_FILTER_MAX_SET_ITEMS = 50;

const productAdvancedFilterScalarValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const productAdvancedFilterValueSchema = z.union([
  productAdvancedFilterScalarValueSchema,
  z.array(productAdvancedFilterScalarValueSchema),
]);

type ProductAdvancedScalarValue = z.infer<typeof productAdvancedFilterScalarValueSchema>;

const PRODUCT_ADVANCED_FILTER_OPERATOR_COMPATIBILITY: Record<
  ProductAdvancedFilterField,
  readonly ProductAdvancedFilterOperator[]
> = {
  id: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  sku: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  name: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  description: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  categoryId: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  catalogId: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  tagId: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  producerId: ['eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  price: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  stock: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  published: ['eq', 'neq'],
  baseExported: ['eq', 'neq'],
  baseProductId: ['contains', 'eq', 'neq', 'isEmpty', 'isNotEmpty'],
  createdAt: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
};

export const productAdvancedFilterConditionSchema = z.object({
  type: z.literal('condition'),
  id: z.string().trim().min(1),
  field: productAdvancedFilterFieldSchema,
  operator: productAdvancedFilterOperatorSchema,
  value: productAdvancedFilterValueSchema.optional(),
  valueTo: productAdvancedFilterValueSchema.optional(),
});

export type ProductAdvancedFilterConditionDto = z.infer<typeof productAdvancedFilterConditionSchema>;
export type ProductAdvancedFilterCondition = ProductAdvancedFilterConditionDto;

export interface ProductAdvancedFilterGroupDto {
  type: 'group';
  id: string;
  combinator: ProductAdvancedFilterCombinator;
  not: boolean;
  rules: Array<ProductAdvancedFilterConditionDto | ProductAdvancedFilterGroupDto>;
}

export type ProductAdvancedFilterGroup = ProductAdvancedFilterGroupDto;

const productAdvancedFilterGroupBaseSchema: z.ZodType<ProductAdvancedFilterGroupDto> =
  z.object({
    type: z.literal('group'),
    id: z.string().trim().min(1),
    combinator: productAdvancedFilterCombinatorSchema,
    not: z.boolean().default(false),
    rules: z
      .array(
        z.union([
          productAdvancedFilterConditionSchema,
          z.lazy(() => productAdvancedFilterGroupBaseSchema),
        ])
      )
      .min(1),
  });

export type ProductAdvancedFilterRuleDto =
  ProductAdvancedFilterConditionDto | ProductAdvancedFilterGroupDto;
export type ProductAdvancedFilterRule = ProductAdvancedFilterRuleDto;

const PRODUCT_ADVANCED_STRING_FIELDS = new Set<ProductAdvancedFilterField>([
  'id',
  'sku',
  'name',
  'description',
  'categoryId',
  'catalogId',
  'tagId',
  'producerId',
  'baseProductId',
]);

const PRODUCT_ADVANCED_NUMERIC_FIELDS = new Set<ProductAdvancedFilterField>([
  'price',
  'stock',
]);

const PRODUCT_ADVANCED_DATE_FIELDS = new Set<ProductAdvancedFilterField>([
  'createdAt',
]);

const PRODUCT_ADVANCED_BOOLEAN_FIELDS = new Set<ProductAdvancedFilterField>([
  'published',
  'baseExported',
]);

const isAdvancedStringValue = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isAdvancedNumberValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isAdvancedBooleanValue = (value: unknown): value is boolean =>
  typeof value === 'boolean';

const isAdvancedDateValue = (value: unknown): value is string | number => {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return typeof value === 'string' && value.trim().length > 0;
};

const validateAdvancedFilterScalarValue = (
  field: ProductAdvancedFilterField,
  value: unknown
): value is ProductAdvancedScalarValue => {
  if (PRODUCT_ADVANCED_STRING_FIELDS.has(field)) {
    return isAdvancedStringValue(value);
  }
  if (PRODUCT_ADVANCED_NUMERIC_FIELDS.has(field)) {
    return isAdvancedNumberValue(value);
  }
  if (PRODUCT_ADVANCED_DATE_FIELDS.has(field)) {
    return isAdvancedDateValue(value);
  }
  if (PRODUCT_ADVANCED_BOOLEAN_FIELDS.has(field)) {
    return isAdvancedBooleanValue(value);
  }
  return false;
};

const validateAdvancedFilterCondition = (
  condition: ProductAdvancedFilterConditionDto,
  path: Array<string | number>,
  ctx: z.RefinementCtx
): void => {
  const allowedOperators = PRODUCT_ADVANCED_FILTER_OPERATOR_COMPATIBILITY[condition.field];
  if (!allowedOperators.includes(condition.operator)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'operator'],
      message: `Operator "${condition.operator}" is not allowed for field "${condition.field}".`,
    });
    return;
  }

  if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
    if (condition.value !== undefined || condition.valueTo !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Operator "${condition.operator}" does not accept value inputs.`,
      });
    }
    return;
  }

  if (condition.operator === 'between') {
    if (Array.isArray(condition.value) || Array.isArray(condition.valueTo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: 'Operator "between" expects scalar values for value and valueTo.',
      });
      return;
    }
    if (
      !validateAdvancedFilterScalarValue(condition.field, condition.value) ||
      !validateAdvancedFilterScalarValue(condition.field, condition.valueTo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Operator "between" requires valid scalar values for field "${condition.field}".`,
      });
    }
    return;
  }

  if (condition.operator === 'in' || condition.operator === 'notIn') {
    if (!Array.isArray(condition.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" requires an array value.`,
      });
      return;
    }
    if (condition.value.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" requires at least one value.`,
      });
    }
    if (condition.value.length > PRODUCT_ADVANCED_FILTER_MAX_SET_ITEMS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" supports up to ${PRODUCT_ADVANCED_FILTER_MAX_SET_ITEMS} values.`,
      });
    }
    const hasInvalidValue = condition.value.some(
      (value: unknown) => !validateAdvancedFilterScalarValue(condition.field, value)
    );
    if (hasInvalidValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" has invalid value type for field "${condition.field}".`,
      });
    }
    if (condition.valueTo !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'valueTo'],
        message: `Operator "${condition.operator}" does not use valueTo.`,
      });
    }
    return;
  }

  if (Array.isArray(condition.value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'value'],
      message: `Operator "${condition.operator}" requires a scalar value.`,
    });
    return;
  }

  if (!validateAdvancedFilterScalarValue(condition.field, condition.value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'value'],
      message: `Invalid value type for field "${condition.field}" and operator "${condition.operator}".`,
    });
  }

  if (condition.valueTo !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'valueTo'],
      message: `Operator "${condition.operator}" does not use valueTo.`,
    });
  }
};

export type ProductAdvancedFilterMetrics = {
  depth: number;
  rules: number;
  setItems: number;
};

export const getProductAdvancedFilterMetrics = (
  root: ProductAdvancedFilterGroupDto
): ProductAdvancedFilterMetrics => {
  let depth = 1;
  let rules = 0;
  let setItems = 0;

  const walk = (group: ProductAdvancedFilterGroupDto, currentDepth: number): void => {
    depth = Math.max(depth, currentDepth);
    group.rules.forEach((rule: ProductAdvancedFilterRuleDto) => {
      rules += 1;
      if (
        rule.type === 'condition' &&
        (rule.operator === 'in' || rule.operator === 'notIn') &&
        Array.isArray(rule.value)
      ) {
        setItems += rule.value.length;
      }
      if (rule.type === 'group') {
        walk(rule, currentDepth + 1);
      }
    });
  };

  walk(root, 1);
  return { depth, rules, setItems };
};

export const productAdvancedFilterGroupSchema: z.ZodType<ProductAdvancedFilterGroupDto> =
  productAdvancedFilterGroupBaseSchema.superRefine((group: ProductAdvancedFilterGroupDto, ctx) => {
    const metrics = getProductAdvancedFilterMetrics(group);
    if (metrics.depth > PRODUCT_ADVANCED_FILTER_MAX_DEPTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rules'],
        message: `Advanced filter max depth is ${PRODUCT_ADVANCED_FILTER_MAX_DEPTH}.`,
      });
    }
    if (metrics.rules > PRODUCT_ADVANCED_FILTER_MAX_RULES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rules'],
        message: `Advanced filter supports up to ${PRODUCT_ADVANCED_FILTER_MAX_RULES} rules.`,
      });
    }

    const walk = (nestedGroup: ProductAdvancedFilterGroupDto, path: Array<string | number>): void => {
      nestedGroup.rules.forEach((rule: ProductAdvancedFilterRuleDto, index: number) => {
        const nextPath = [...path, 'rules', index];
        if (rule.type === 'condition') {
          validateAdvancedFilterCondition(rule, nextPath, ctx);
          return;
        }
        walk(rule, nextPath);
      });
    };

    walk(group, []);
  });

export const productAdvancedFilterPresetSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  filter: productAdvancedFilterGroupSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ProductAdvancedFilterPresetDto = z.infer<typeof productAdvancedFilterPresetSchema>;
export type ProductAdvancedFilterPreset = ProductAdvancedFilterPresetDto;

export const productAdvancedFilterPresetBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  presets: z.array(productAdvancedFilterPresetSchema),
});

export type ProductAdvancedFilterPresetBundleDto = z.infer<typeof productAdvancedFilterPresetBundleSchema>;
export type ProductAdvancedFilterPresetBundle = ProductAdvancedFilterPresetBundleDto;

export const productListPreferencesSchema = z.object({
  nameLocale: z.enum(['name_en', 'name_pl', 'name_de']),
  catalogFilter: z.string(),
  currencyCode: z.string().nullable(),
  pageSize: z.number(),
  thumbnailSource: z.enum(['file', 'link', 'base64']),
  filtersCollapsedByDefault: z.boolean(),
  advancedFilterPresets: z.array(productAdvancedFilterPresetSchema),
  appliedAdvancedFilter: z.string(),
  appliedAdvancedFilterPresetId: z.string().nullable(),
});

export type ProductListPreferencesDto = z.infer<typeof productListPreferencesSchema>;

/**
 * Product Filter Contract
 */
export const productStockOperatorSchema = z.enum([
  'gt',
  'gte',
  'lt',
  'lte',
  'eq',
]);

export type ProductStockOperatorDto = z.infer<typeof productStockOperatorSchema>;
export type ProductStockOperator = ProductStockOperatorDto;

const getAdvancedFilterPayloadValidationError = (value: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    const result = productAdvancedFilterGroupSchema.safeParse(parsed);
    if (result.success) return null;
    return result.error.issues[0]?.message ?? 'Invalid advancedFilter payload.';
  } catch {
    return 'advancedFilter must be valid JSON.';
  }
};

export const productFilterSchema = commonListQuerySchema.extend({
  id: z.string().trim().optional(),
  idMatchMode: z.enum(['exact', 'partial']).optional(),
  sku: z.string().trim().optional(),
  description: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  stockValue: z.coerce.number().int().min(0).optional(),
  stockOperator: productStockOperatorSchema.optional(),
  catalogId: z.string().trim().optional(),
  searchLanguage: z.enum(['name_en', 'name_pl', 'name_de']).optional(),
  advancedFilter: z.preprocess(
    (value: unknown) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value !== 'string') return value;
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : undefined;
    },
    z
      .string()
      .superRefine((value: string, ctx) => {
        const errorMessage = getAdvancedFilterPayloadValidationError(value);
        if (!errorMessage) return;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: errorMessage,
        });
      })
      .optional()
  ),
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
export type ProductValidationSeverity = ProductValidationSeverityDto;

export const productValidationDenyBehaviorSchema = z.enum(['ask_again', 'mute_session']);
export type ProductValidationDenyBehaviorDto = z.infer<typeof productValidationDenyBehaviorSchema>;
export type ProductValidationDenyBehavior = ProductValidationDenyBehaviorDto;
export type ProductValidationPatternDenyBehaviorOverride = ProductValidationDenyBehavior | null;

export const productValidationLaunchScopeBehaviorSchema = z.enum(['gate', 'condition_only']);
export type ProductValidationLaunchScopeBehaviorDto = z.infer<typeof productValidationLaunchScopeBehaviorSchema>;
export type ProductValidationLaunchScopeBehavior = ProductValidationLaunchScopeBehaviorDto;

export const productValidationInstanceScopeSchema = z.enum([
  'draft_template',
  'product_create',
  'product_edit',
]);
export type ProductValidationInstanceScopeDto = z.infer<typeof productValidationInstanceScopeSchema>;
export type ProductValidationInstanceScope = ProductValidationInstanceScopeDto;

export type ProductValidationDenyIssueInput = {
  fieldName: string;
  patternId: string;
  message?: string | null;
  replacementValue?: string | null;
};

export type ProductValidationAcceptIssueInput = {
  fieldName: string;
  patternId: string;
  postAcceptBehavior: ProductValidationPostAcceptBehavior;
  message?: string | null;
  replacementValue?: string | null;
};

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
export type ProductValidationTarget = ProductValidationTargetDto;
export type ProductValidationRuntimeTypeDto = 'none' | 'database_query' | 'ai_prompt';
export type ProductValidationRuntimeType = ProductValidationRuntimeTypeDto;
export type ProductValidationPostAcceptBehaviorDto = 'revalidate' | 'stop_after_accept';
export type ProductValidationPostAcceptBehavior = ProductValidationPostAcceptBehaviorDto;
export type ProductValidationChainModeDto = 'continue' | 'stop_on_match' | 'stop_on_replace';
export type ProductValidationChainMode = ProductValidationChainModeDto;
export type ProductValidationLaunchSourceModeDto = 'current_field' | 'form_field' | 'latest_product_field';
export type ProductValidationLaunchSourceMode = ProductValidationLaunchSourceModeDto;
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
export type ProductValidationLaunchOperator = ProductValidationLaunchOperatorDto;

export type ProductValidationPatternDto = z.infer<typeof productValidationPatternSchema>;
export type ProductValidationPattern = ProductValidationPatternDto;

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
  formatterEnabledByDefault: z.boolean(),
  instanceDenyBehavior: z.record(
    productValidationInstanceScopeSchema,
    productValidationDenyBehaviorSchema
  ),
});

export type ProductValidationInstanceDenyBehaviorMapDto = z.infer<typeof productValidatorSettingsSchema>['instanceDenyBehavior'];
export type ProductValidatorSettingsDto = z.infer<typeof productValidatorSettingsSchema>;
export type ProductValidatorSettings = ProductValidatorSettingsDto;
export type ProductValidationInstanceDenyBehaviorMap = ProductValidationInstanceDenyBehaviorMapDto;

export const productValidatorConfigSchema = z.object({
  enabledByDefault: z.boolean(),
  formatterEnabledByDefault: z.boolean(),
  instanceDenyBehavior: z.record(
    productValidationInstanceScopeSchema,
    productValidationDenyBehaviorSchema
  ),
  patterns: z.array(productValidationPatternSchema),
});

export type ProductValidatorConfigDto = z.infer<typeof productValidatorConfigSchema>;
export type ProductValidatorConfig = ProductValidatorConfigDto;

/**
 * Product Validation Replacement DTOs
 */

export const dynamicReplacementSourceModeSchema = z.enum([
  'current_field',
  'form_field',
  'latest_product_field',
]);
export type DynamicReplacementSourceModeDto = z.infer<typeof dynamicReplacementSourceModeSchema>;
export type DynamicReplacementSourceMode = DynamicReplacementSourceModeDto;

export const dynamicReplacementMathOperationSchema = z.enum([
  'none',
  'add',
  'subtract',
  'multiply',
  'divide',
]);
export type DynamicReplacementMathOperationDto = z.infer<typeof dynamicReplacementMathOperationSchema>;
export type DynamicReplacementMathOperation = DynamicReplacementMathOperationDto;

export const dynamicReplacementRoundModeSchema = z.enum(['none', 'round', 'floor', 'ceil']);
export type DynamicReplacementRoundModeDto = z.infer<typeof dynamicReplacementRoundModeSchema>;
export type DynamicReplacementRoundMode = DynamicReplacementRoundModeDto;

export const dynamicReplacementResultAssemblySchema = z.enum(['segment_only', 'source_replace_match']);
export type DynamicReplacementResultAssemblyDto = z.infer<typeof dynamicReplacementResultAssemblySchema>;
export type DynamicReplacementResultAssembly = DynamicReplacementResultAssemblyDto;

export const dynamicReplacementTargetApplySchema = z.enum(['replace_whole_field', 'replace_matched_segment']);
export type DynamicReplacementTargetApplyDto = z.infer<typeof dynamicReplacementTargetApplySchema>;
export type DynamicReplacementTargetApply = DynamicReplacementTargetApplyDto;

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
export type DynamicReplacementLogicOperator = DynamicReplacementLogicOperatorDto;

export const dynamicReplacementLogicActionSchema = z.enum(['keep', 'set_value', 'clear', 'abort']);
export type DynamicReplacementLogicActionDto = z.infer<typeof dynamicReplacementLogicActionSchema>;
export type DynamicReplacementLogicAction = DynamicReplacementLogicActionDto;

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
export type DynamicReplacementRecipe = DynamicReplacementRecipeDto;

export const productReplacementModeSchema = z.enum(['static', 'dynamic']);
export type ProductReplacementModeDto = z.infer<typeof productReplacementModeSchema>;
export type ReplacementMode = ProductReplacementModeDto;

export const productValidationSequenceGroupDraftSchema = z.object({
  label: z.string(),
  debounceMs: z.string(),
});

export type ProductValidationSequenceGroupDraftDto = z.infer<typeof productValidationSequenceGroupDraftSchema>;
export type SequenceGroupDraft = ProductValidationSequenceGroupDraftDto;

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
  sequenceGroupId: z.string(),
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
export type ProductStudioSequenceGenerationMode = ProductStudioSequenceGenerationModeDto;

export const productStudioExecutionRouteSchema = z.enum([
  'studio_sequencer',
  'studio_native_sequencer_prior_generation',
  'ai_model_full_sequence',
  'ai_direct_generation',
]);

export type ProductStudioExecutionRouteDto = z.infer<typeof productStudioExecutionRouteSchema>;
export type ProductStudioExecutionRoute = ProductStudioExecutionRouteDto;

export const productStudioSequencingDiagnosticsScopeSchema = z.enum(['project', 'global', 'default']);

export type ProductStudioSequencingDiagnosticsScopeDto = z.infer<typeof productStudioSequencingDiagnosticsScopeSchema>;
export type ProductStudioSequencingDiagnosticsScope = ProductStudioSequencingDiagnosticsScopeDto;

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
export type ProductStudioSequencingConfig = ProductStudioSequencingConfigDto;

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
export type ProductStudioSequencingDiagnostics = ProductStudioSequencingDiagnosticsDto;

export const productStudioSequenceReadinessSchema = z.object({
  ready: z.boolean(),
  requiresProjectSequence: z.boolean(),
  state: productStudioSequenceReadinessStateSchema,
  message: z.string().nullable(),
});

export type ProductStudioSequenceReadinessDto = z.infer<typeof productStudioSequenceReadinessSchema>;
export type ProductStudioSequenceReadiness = ProductStudioSequenceReadinessDto;

export const DEFAULT_PRODUCT_STUDIO_SEQUENCE_READINESS: ProductStudioSequenceReadiness = {
  ready: false,
  requiresProjectSequence: false,
  state: 'project_settings_missing',
  message: 'Loading...',
};

export function normalizeProductStudioSequenceGenerationMode(value: unknown): ProductStudioSequenceGenerationMode {
  if (
    value === 'studio_prompt_then_sequence' ||
    value === 'model_full_sequence' ||
    value === 'studio_native_sequencer_prior_generation' ||
    value === 'auto'
  ) {
    return value;
  }
  return 'auto';
}

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

export const PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS: ProductDraftOpenFormTab[] = [
  'general',
  'other',
  'parameters',
  'images',
  'studio',
  'import-info',
  'note-link',
  'validation',
];

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
export type ProductDraft = ProductDraftDto;

export const createProductDraftSchema = productDraftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductDraftDto = z.infer<typeof createProductDraftSchema>;
export type CreateProductDraftInput = CreateProductDraftDto;

export const updateProductDraftSchema = createProductDraftSchema.partial();

export type UpdateProductDraftDto = Partial<CreateProductDraftDto>;
export type UpdateProductDraftInput = UpdateProductDraftDto;

/**
 * Product Repository Interfaces
 */

export type CatalogCreateInput = CatalogCreateInputDto;
export type CatalogUpdateInput = CatalogUpdateInputDto;

export type CatalogRepository = {
  listCatalogs(): Promise<CatalogRecord[]>;
  getCatalogById(id: string): Promise<CatalogRecord | null>;
  createCatalog(input: CatalogCreateInput): Promise<CatalogRecord>;
  updateCatalog(
    id: string,
    input: CatalogUpdateInput
  ): Promise<CatalogRecord | null>;
  deleteCatalog(id: string): Promise<void>;
  getCatalogsByIds(ids: string[]): Promise<CatalogRecord[]>;
  setDefaultCatalog(id: string): Promise<void>;
};

export type CategoryFilters = ProductCategoryFiltersDto;

export type CategoryRepository = {
  listCategories(filters: CategoryFilters): Promise<ProductCategory[]>;
  getCategoryTree(catalogId?: string): Promise<ProductCategoryWithChildren[]>;
  getCategoryById(id: string): Promise<ProductCategory | null>;
  getCategoryWithChildren(id: string): Promise<ProductCategoryWithChildren | null>;
  createCategory(data: CreateProductCategoryDto): Promise<ProductCategory>;
  updateCategory(id: string, data: UpdateProductCategoryDto): Promise<ProductCategory>;
  deleteCategory(id: string): Promise<void>;
  findByName(catalogId: string, name: string, parentId?: string | null): Promise<ProductCategory | null>;
  isDescendant(categoryId: string, targetId: string): Promise<boolean>;
};

export type ParameterFilters = ProductParameterFiltersDto;
export type ParameterCreateInput = ProductParameterCreateInputDto;
export type ParameterUpdateInput = ProductParameterUpdateInputDto;

export type ParameterRepository = {
  listParameters(filters: ParameterFilters): Promise<ProductParameter[]>;
  getParameterById(id: string): Promise<ProductParameter | null>;
  createParameter(data: ParameterCreateInput): Promise<ProductParameter>;
  bulkCreateParameters(data: ParameterCreateInput[]): Promise<ProductParameter[]>;
  updateParameter(id: string, data: ParameterUpdateInput): Promise<ProductParameter>;
  deleteParameter(id: string): Promise<void>;
  findByName(catalogId: string, name_en: string): Promise<ProductParameter | null>;
};

export type ProducerFilters = {
  search?: string;
};

export type ProducerRepository = {
  listProducers(filters: ProducerFilters): Promise<Producer[]>;
  getProducerById(id: string): Promise<Producer | null>;
  createProducer(data: { name: string; website?: string | null }): Promise<Producer>;
  updateProducer(id: string, data: { name?: string; website?: string | null }): Promise<Producer>;
  deleteProducer(id: string): Promise<void>;
  findByName(name: string): Promise<Producer | null>;
};

export type ProductFilters = Partial<ProductFilterDto> & {
  ids?: string[] | undefined;
  excludeIds?: string[] | undefined;
  tagIds?: string[] | undefined;
  producerIds?: string[] | undefined;
  priceGroupIds?: string[] | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  stockValue?: number | undefined;
  stockOperator?: ProductStockOperator | undefined;
  searchLanguage?: 'name_en' | 'name_pl' | 'name_de' | undefined;
  baseExported?: boolean | undefined;
  search?: string | undefined;
  id?: string | undefined;
  idMatchMode?: 'exact' | 'partial' | undefined;
  sku?: string | undefined;
  description?: string | undefined;
  categoryId?: string | undefined;
  catalogId?: string | undefined;
  advancedFilter?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

export type TransactionalProductRepository = {
  getProducts(filters: ProductFilters): Promise<ProductWithImages[]>;
  countProducts(filters: ProductFilters): Promise<number>;
  getProductById(id: string): Promise<ProductWithImages | null>;
  getProductBySku(sku: string): Promise<ProductRecord | null>;
  getProductsBySkus(skus: string[]): Promise<ProductRecord[]>;
  findProductByBaseId(baseProductId: string): Promise<ProductRecord | null>;
  findProductsByBaseIds(baseIds: string[]): Promise<ProductRecord[]>;
  createProduct(data: ProductCreateInputDto): Promise<ProductRecord>;
  bulkCreateProducts(data: ProductCreateInputDto[]): Promise<number>;
  updateProduct(
    id: string,
    data: ProductUpdateInputDto
  ): Promise<ProductRecord | null>;
  deleteProduct(id: string): Promise<ProductRecord | null>;
  duplicateProduct(id: string, sku: string): Promise<ProductRecord | null>;
  getProductImages(productId: string): Promise<ProductImageRecord[]>;
  addProductImages(productId: string, imageFileIds: string[]): Promise<void>;
  replaceProductImages(productId: string, imageFileIds: string[]): Promise<void>;
  removeProductImage(productId: string, imageFileId: string): Promise<void>;
  countProductsByImageFileId(imageFileId: string): Promise<number>;
  replaceProductCatalogs(
    productId: string,
    catalogIds: string[]
  ): Promise<void>;
  replaceProductCategory(
    productId: string,
    categoryId: string | null
  ): Promise<void>;
  replaceProductTags(
    productId: string,
    tagIds: string[]
  ): Promise<void>;
  replaceProductProducers(
    productId: string,
    producerIds: string[]
  ): Promise<void>;
  replaceProductNotes(
    productId: string,
    noteIds: string[]
  ): Promise<void>;
  bulkReplaceProductCatalogs(
    productIds: string[],
    catalogIds: string[]
  ): Promise<void>;
  bulkAddProductCatalogs(
    productIds: string[],
    catalogIds: string[]
  ): Promise<void>;
  bulkRemoveProductCatalogs(
    productIds: string[],
    catalogIds: string[]
  ): Promise<void>;
};
export type ProductRepository = TransactionalProductRepository & {
  getProductsWithCount(filters: ProductFilters): Promise<{ products: ProductWithImages[]; total: number }>;
  createProductInTransaction: <T>(
    callback: (tx: TransactionalProductRepository & unknown) => Promise<T>
  ) => Promise<T>;
};

export type TagFilters = ProductTagFiltersDto;

export type TagRepository = {
  listTags(filters: TagFilters): Promise<ProductTag[]>;
  getTagById(id: string): Promise<ProductTag | null>;
  createTag(data: ProductTagCreateInputDto): Promise<ProductTag>;
  updateTag(id: string, data: ProductTagUpdateInputDto): Promise<ProductTag>;
  deleteTag(id: string): Promise<void>;
  findByName(catalogId: string, name: string): Promise<ProductTag | null>;
};

export type PatternFormData = ProductValidationPatternFormDataDto;

export interface SequenceGroupView {
  id: string;
  label: string;
  debounceMs: number;
  patternIds: string[];
}

export interface ValidatorSettingsController {
  patterns: ProductValidationPattern[];
  settings: unknown; // Ideally more specific, but 'unknown' is what's implied from useValidatorSettings()
  summary: {
    total: number;
    enabled: number;
    replacementEnabled: number;
  };
  orderedPatterns: ProductValidationPattern[];
  enabledByDefault: boolean;
  formatterEnabledByDefault: boolean;
  instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
  loading: boolean;
  isUpdating: boolean;
  settingsBusy: boolean;
  patternActionsPending: boolean;
  reorderPending: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  closeModal: () => void;
  editingPattern: ProductValidationPattern | null;
  formData: PatternFormData;
  setFormData: (data: PatternFormData | ((prev: PatternFormData) => PatternFormData)) => void;
  testResult: unknown;
  handleSave: () => Promise<void>;
  handleSavePattern: () => Promise<void>;
  handleTogglePattern: (pattern: ProductValidationPattern) => Promise<void>;
  handleDeletePattern: (id: string) => Promise<void>;
  handleUpdateSettings: (updates: Partial<{
    enabledByDefault: boolean;
    formatterEnabledByDefault: boolean;
    instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
  }>) => Promise<void>;
  handleToggleDefault: (enabled: boolean) => Promise<void>;
  handleToggleFormatterDefault: (enabled: boolean) => Promise<void>;
  handleInstanceBehaviorChange: (scope: ProductValidationInstanceScope, behavior: ProductValidationDenyBehavior) => Promise<void>;
  handleEditPattern: (pattern: ProductValidationPattern) => void;
  handleDuplicatePattern: (pattern: ProductValidationPattern) => void;
  handleAddPattern: (target?: string) => void;
  handleDragStart: (e: unknown, patternId: string) => void;
  handleDrop: (pattern: ProductValidationPattern, e: unknown) => void;
  replacementFieldOptions: Array<{ value: string; label: string }>;
  sourceFieldOptions: Array<{ value: string; label: string }>;
  createPatternPending: boolean;
  updatePatternPending: boolean;
  isLocaleTarget: (target: string) => boolean;
  normalizeReplacementFields: (fields: unknown, target?: string) => string[];
  getReplacementFieldsForTarget: (target: string) => Array<{ value: string; label: string }>;
  getSourceFieldOptionsForTarget: (target: string) => Array<{ value: string; label: string }>;
  formatReplacementFields: (fields: unknown) => string;
  draggedPatternId: string | null;
  setDraggedPatternId: (id: string | null) => void;
  dragOverPatternId: string | null;
  setDragOverPatternId: (id: string | null) => void;
  handlePatternDrop: (pattern: ProductValidationPattern, e: unknown) => void;
  sequenceGroups: Map<string, SequenceGroupView>;
  firstPatternIdByGroup: Map<string, string>;
  getSequenceGroupId: (p: ProductValidationPattern) => string | null;
  handleMoveGroup: (groupId: string, targetIndex: number) => Promise<void>;
  handleReorderInGroup: (groupId: string, patternId: string, targetIndex: number) => Promise<void>;
  handleMoveToGroup: (patternId: string, targetGroupId: string) => Promise<void>;
  handleRemoveFromGroup: (patternId: string) => Promise<void>;
  handleCreateGroup: (patternIds: string[]) => Promise<void>;
  handleRenameGroup: (groupId: string, label: string) => Promise<void>;
  handleUpdateGroupDebounce: (groupId: string, debounceMs: number) => Promise<void>;
  onCreateSkuAutoIncrementSequence: () => Promise<void>;
  onCreateLatestPriceStockSequence: () => Promise<void>;
  handleCreateNameLengthMirrorPattern: () => Promise<void>;
  handleCreateNameCategoryMirrorPattern: () => Promise<void>;
  handleCreateNameMirrorPolishSequence: () => Promise<void>;
  handleSaveSequenceGroup: (groupId: string) => Promise<void>;
  handleUngroup: (groupId: string) => Promise<void>;
  patternToDelete: ProductValidationPattern | null;
  setPatternToDelete: (pattern: ProductValidationPattern | null) => void;
  groupDrafts: Record<string, SequenceGroupDraft>;
  setGroupDrafts: React.Dispatch<React.SetStateAction<Record<string, SequenceGroupDraft>>>;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  openCreate: (target?: string) => void;
  openEdit: (pattern: ProductValidationPattern) => void;
}

export type CreateProductValidationPatternInput = CreateProductValidationPatternDto;
export type UpdateProductValidationPatternInput = UpdateProductValidationPatternDto;

export type ProductValidationPatternRepository = {
  listPatterns(): Promise<ProductValidationPattern[]>;
  getPatternById(id: string): Promise<ProductValidationPattern | null>;
  createPattern(data: CreateProductValidationPatternInput): Promise<ProductValidationPattern>;
  updatePattern(id: string, data: UpdateProductValidationPatternInput): Promise<ProductValidationPattern>;
  deletePattern(id: string): Promise<void>;
  getEnabledByDefault(): Promise<boolean>;
  setEnabledByDefault(enabled: boolean): Promise<boolean>;
  getFormatterEnabledByDefault(): Promise<boolean>;
  setFormatterEnabledByDefault(enabled: boolean): Promise<boolean>;
  getInstanceDenyBehavior(): Promise<ProductValidationInstanceDenyBehaviorMap>;
  setInstanceDenyBehavior(
    value: ProductValidationInstanceDenyBehaviorMap
  ): Promise<ProductValidationInstanceDenyBehaviorMap>;
};

/**
 * Product UI and Context Types
 */

export type ExpandedImageFile = ImageFileRecord & {
  products: {
    product: {
      id: string;
      name: string;
    };
  }[];
};

export type DebugInfo = {
  action: string;
  message: string;
  slotIndex?: number | undefined;
  filename?: string | undefined;
  timestamp: string;
};

export type ProductFormData = ProductCreateInputDto;

export type ProductListPreferences = ProductListPreferencesDto;

export type ProductImageSlot = ManagedImageSlot;
