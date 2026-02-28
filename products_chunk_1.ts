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

export const createProductTagSchema = productTagSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
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

export const createCatalogSchema = catalogSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
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

export type ProductParameterSelectorTypeDto = z.infer<typeof productParameterSelectorTypeSchema>;

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

export const createProductParameterSchema = productParameterSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
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
export const productImageRecordSchema = productImageSchema
  .omit({
    imageFile: true,
  })
  .extend({
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
export const productWithImagesSchema = productSchema.extend({
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

const optionalParameterValuesFromFormSchema = z.preprocess((value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
