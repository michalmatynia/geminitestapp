import { z } from 'zod';

import { productParameterValueSchema, productSchema } from './product';
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
  }
}, z.array(productParameterValueSchema).optional());

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

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProduct = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

export type UpdateProduct = z.infer<typeof updateProductSchema>;

/**
 * Product Domain Enums & DTOs
 */
