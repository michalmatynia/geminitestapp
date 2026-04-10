import { z } from 'zod';

import { localizedSchema, dtoBaseSchema, namedDtoSchema } from '../base';
import { imageFileRecordSchema } from '../files';
import { catalogSchema } from './catalogs';
import { productCustomFieldValueSchema } from './custom-fields';
import { priceGroupSchema } from './catalogs';
import { productCategorySchema } from './categories';
import { producerSchema } from './producers';
import { productShippingGroupSchema } from './shipping-groups';
import { productTagSchema } from './tags';

export const productCurrencySchema = namedDtoSchema.extend({
  code: z.string(),
  symbol: z.string().nullable(),
});

export type ProductCurrencyRecord = z.infer<typeof productCurrencySchema>;

export const productImportSourceSchema = z.enum(['base']);

export type ProductImportSource = z.infer<typeof productImportSourceSchema>;

/**
 * Price Group With Details Contract
 */
export const priceGroupWithDetailsSchema = priceGroupSchema.extend({
  currency: productCurrencySchema,
  currencyCode: z.string(),
});

export type PriceGroupWithDetails = z.infer<typeof priceGroupWithDetailsSchema>;

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

export type PriceGroupForCalculation = z.infer<typeof priceGroupForCalculationSchema>;

/**
 * Product Image Contract
 */
export const productImageSchema = z.object({
  productId: z.string(),
  imageFileId: z.string(),
  assignedAt: z.string(),
  imageFile: imageFileRecordSchema.optional(),
});

export type ProductImage = z.infer<typeof productImageSchema>;

/**
 * Product Image Record Contract
 */
export const productImageRecordSchema = productImageSchema
  .omit({
    imageFile: true,
  })
  .extend({
    imageFile: imageFileRecordSchema,
  });

export type ProductImageRecord = z.infer<typeof productImageRecordSchema>;

/**
 * Product Catalog Contract
 */
export const productCatalogSchema = z.object({
  productId: z.string(),
  catalogId: z.string(),
  assignedAt: z.string(),
  catalog: z.lazy(() => catalogSchema).optional(),
});

export type ProductCatalog = z.infer<typeof productCatalogSchema>;

/**
 * Product Catalog Record Contract
 */
export const productCatalogRecordSchema = productCatalogSchema.extend({
  catalog: catalogSchema,
});

export type ProductCatalogRecord = z.infer<typeof productCatalogRecordSchema>;

/**
 * Product Tag Relation Contract
 */
export const productTagRelationSchema = z.object({
  productId: z.string(),
  tagId: z.string(),
  assignedAt: z.string(),
  tag: z.lazy(() => productTagSchema).optional(),
});

export type ProductTagRelation = z.infer<typeof productTagRelationSchema>;

/**
 * Product Producer Relation Contract
 */
export const productProducerRelationSchema = z.object({
  productId: z.string(),
  producerId: z.string(),
  assignedAt: z.string(),
  producer: z.lazy(() => producerSchema).optional(),
});

export type ProductProducerRelation = z.infer<typeof productProducerRelationSchema>;

/**
 * Product Parameter Value Contract
 */
export const productParameterValueSchema = z.object({
  parameterId: z.string(),
  value: z.string().nullable().optional(),
  valuesByLanguage: z.record(z.string(), z.string()).optional(),
});

export type ProductParameterValue = z.infer<typeof productParameterValueSchema>;

export const resolvedProductParameterValueSchema = productParameterValueSchema.extend({
  value: z.string(),
});

export type ResolvedProductParameterValue = z.infer<typeof resolvedProductParameterValueSchema>;

const normalizeTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNullableOverrideText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return normalizeTrimmedString(value);
};

const normalizeOverrideIntegrationIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry: unknown) => {
    const normalized = normalizeTrimmedString(entry);
    if (!normalized) return;
    unique.add(normalized);
  });
  return Array.from(unique);
};

const normalizeProductMarketplaceContentOverrideEntry = (
  value: unknown
): ProductMarketplaceContentOverrideDraft | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  return {
    integrationIds: normalizeOverrideIntegrationIds(record['integrationIds']),
    title: normalizeNullableOverrideText(record['title']),
    description: normalizeNullableOverrideText(record['description']),
  };
};

export const normalizeProductMarketplaceContentOverrideDrafts = (
  value: unknown
): ProductMarketplaceContentOverrideDraft[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry: unknown): ProductMarketplaceContentOverrideDraft | null =>
      normalizeProductMarketplaceContentOverrideEntry(entry)
    )
    .filter(
      (
        entry: ProductMarketplaceContentOverrideDraft | null
      ): entry is ProductMarketplaceContentOverrideDraft => entry !== null
    );
};

export const productMarketplaceContentOverrideDraftSchema = z.object({
  integrationIds: z.array(z.string()).default([]),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type ProductMarketplaceContentOverrideDraft = z.infer<
  typeof productMarketplaceContentOverrideDraftSchema
>;

export const productMarketplaceContentOverrideSchema =
  productMarketplaceContentOverrideDraftSchema.superRefine((entry, ctx) => {
    if (entry.integrationIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['integrationIds'],
        message: 'Select at least one marketplace integration.',
      });
    }

    if (!entry.title && !entry.description) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'Provide an alternate title or description.',
      });
    }
  });

export type ProductMarketplaceContentOverride = z.infer<
  typeof productMarketplaceContentOverrideSchema
>;

export const normalizeProductMarketplaceContentOverrides = (
  value: unknown
): ProductMarketplaceContentOverride[] =>
  normalizeProductMarketplaceContentOverrideDrafts(value).filter(
    (entry: ProductMarketplaceContentOverrideDraft): entry is ProductMarketplaceContentOverride =>
      entry.integrationIds.length > 0 && Boolean(entry.title || entry.description)
  );

const validateMarketplaceContentOverrideUniqueness = (
  entries: ProductMarketplaceContentOverrideDraft[],
  ctx: z.RefinementCtx
): void => {
  const assignedIntegrationIndex = new Map<string, number>();

  entries.forEach((entry: ProductMarketplaceContentOverrideDraft, index: number) => {
    entry.integrationIds.forEach((integrationId: string) => {
      const previousIndex = assignedIntegrationIndex.get(integrationId);
      if (previousIndex === undefined) {
        assignedIntegrationIndex.set(integrationId, index);
        return;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'integrationIds'],
        message: 'Each marketplace integration can only belong to one alternate copy rule.',
      });
    });
  });
};

export const productMarketplaceContentOverrideDraftsSchema = z
  .preprocess(
    (value: unknown): ProductMarketplaceContentOverrideDraft[] =>
      normalizeProductMarketplaceContentOverrideDrafts(value),
    z.array(productMarketplaceContentOverrideDraftSchema)
  )
  .superRefine(validateMarketplaceContentOverrideUniqueness);

export const productMarketplaceContentOverridesSchema = z
  .preprocess(
    (value: unknown): ProductMarketplaceContentOverrideDraft[] =>
      normalizeProductMarketplaceContentOverrideDrafts(value),
    z.array(productMarketplaceContentOverrideSchema)
  )
  .superRefine(validateMarketplaceContentOverrideUniqueness);

/**
 * Product Contract
 */
export const productSchema = dtoBaseSchema.extend({
  sku: z.string().nullable(),
  baseProductId: z.string().nullable(),
  importSource: productImportSourceSchema.nullable().optional(),
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
  shippingGroupId: z.string().nullable().optional(),
  catalogId: z.string(),
  category: productCategorySchema.optional(),
  shippingGroup: productShippingGroupSchema.optional(),
  shippingGroupSource: z.enum(['manual', 'category_rule']).nullable().optional(),
  shippingGroupResolutionReason: z
    .enum(['manual', 'manual_missing', 'category_rule', 'multiple_category_rules', 'none'])
    .nullable()
    .optional(),
  shippingGroupMatchedCategoryRuleIds: z.array(z.string()).optional(),
  shippingGroupMatchingGroupNames: z.array(z.string()).optional(),
  tags: z.array(productTagRelationSchema).optional(),
  producers: z.array(productProducerRelationSchema).optional(),
  images: z.array(productImageSchema).optional(),
  catalogs: z.array(productCatalogSchema).optional(),
  customFields: z.array(productCustomFieldValueSchema).optional(),
  parameters: z.array(productParameterValueSchema).optional(),
  marketplaceContentOverrides: productMarketplaceContentOverridesSchema.optional(),
  imageLinks: z.array(z.string()).optional(),
  imageBase64s: z.array(z.string()).optional(),
  noteIds: z.array(z.string()).optional(),
});

export type ProductRecord = z.infer<typeof productSchema>;
export type Product = ProductRecord;

/**
 * Product With Images Contract
 */
export const productWithImagesSchema = productSchema.extend({
  duplicateSkuCount: z.number().int().min(0).optional(),
  images: z.array(productImageRecordSchema).default([]),
  catalogs: z.array(productCatalogRecordSchema).default([]),
  tags: z.array(productTagRelationSchema).default([]),
  producers: z.array(productProducerRelationSchema).default([]),
});
export type ProductWithImages = z.infer<typeof productWithImagesSchema>;

export const productBulkImagesBase64RequestSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1),
});

export type ProductBulkImagesBase64Request = z.infer<typeof productBulkImagesBase64RequestSchema>;

export const productImageBase64ResponseSchema = z.object({
  status: z.literal('ok'),
  productId: z.string(),
  count: z.number().int().min(0),
});

export type ProductImageBase64Response = z.infer<typeof productImageBase64ResponseSchema>;

export const productBulkImagesBase64ResponseSchema = z.object({
  status: z.literal('ok'),
  requested: z.number().int().min(1),
  succeeded: z.number().int().min(0),
  failed: z.number().int().min(0),
});

export type ProductBulkImagesBase64Response = z.infer<
  typeof productBulkImagesBase64ResponseSchema
>;

/**
 * Product API Paged Result
 */
export const productsPagedResultSchema = z.object({
  products: z.array(productWithImagesSchema),
  total: z.number().int().min(0),
});

export type ProductsPagedResult = z.infer<typeof productsPagedResultSchema>;
