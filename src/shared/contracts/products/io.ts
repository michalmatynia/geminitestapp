import { z } from 'zod';

import {
  productImportSourceSchema,
  productParameterValueSchema,
  productSchema,
} from './product';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

/**
 * Product Input Contracts (Modular/API)
 */
const normalizeFiniteNumericValue = (value: number): number | undefined =>
  Number.isFinite(value) ? value : undefined;

const normalizeStringNumericFormValue = (value: string): number | string | undefined => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'nan') return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : value;
};

const normalizeNumericFormValue = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    return normalizeFiniteNumericValue(value);
  }
  if (typeof value !== 'string') return value;
  return normalizeStringNumericFormValue(value);
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
  } catch (error) {
    logClientCatch(error, {
      source: 'contracts.products.io',
      action: 'preprocessStringArrayField',
      valueLength: trimmed.length,
    });

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
  } catch (error) {
    logClientCatch(error, {
      source: 'contracts.products.io',
      action: 'optionalParameterValuesFromFormSchema',
      valueLength: trimmed.length,
    });
    return value;
  }
}, z.array(productParameterValueSchema).optional());

export const productCreateInputSchema = z.object({
  id: z.string().nullable().optional(),
  baseProductId: z.string().nullable().optional(),
  importSource: productImportSourceSchema.nullable().optional(),
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
  shippingGroupId: z.string().nullable().optional(),
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

export type CreateProductInput = z.infer<typeof productCreateInputSchema>;
export type ProductCreateInput = CreateProductInput;

export const productUpdateInputSchema = productCreateInputSchema.partial().extend({
  sku: z.preprocess((value: unknown): unknown => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, z.string().min(1).nullable().optional()),
});

export type UpdateProductInput = z.infer<typeof productUpdateInputSchema>;
export type ProductUpdateInput = UpdateProductInput;

export const productPatchInputSchema = z.object({
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
});

export type ProductPatchInput = z.infer<typeof productPatchInputSchema>;

export const productDuplicateRequestSchema = z.object({
  sku: z.string().trim().optional(),
});

export type ProductDuplicateRequest = z.infer<typeof productDuplicateRequestSchema>;

export const productCsvImportErrorSchema = z.object({
  sku: z.string(),
  error: z.string(),
});

export type ProductCsvImportError = z.infer<typeof productCsvImportErrorSchema>;

export const productCsvImportSummarySchema = z.object({
  total: z.number().int().min(0),
  successful: z.number().int().min(0),
  failed: z.number().int().min(0),
  errors: z.array(productCsvImportErrorSchema),
});

export type ProductCsvImportSummary = z.infer<typeof productCsvImportSummarySchema>;

export const productCsvImportResponseSchema = z.object({
  message: z.string(),
  summary: productCsvImportSummarySchema,
});

export type ProductCsvImportResponse = z.infer<typeof productCsvImportResponseSchema>;

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  category: true,
  shippingGroup: true,
  shippingGroupSource: true,
  shippingGroupResolutionReason: true,
  shippingGroupMatchedCategoryRuleIds: true,
  shippingGroupMatchingGroupNames: true,
  tags: true,
  producers: true,
  images: true,
  catalogs: true,
});

export type CreateProduct = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProduct = z.infer<typeof updateProductSchema>;

/**
 * Product Domain Enums & DTOs
 */
