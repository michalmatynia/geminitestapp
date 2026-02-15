import { z } from 'zod';

import { commonListQuerySchema } from '@/shared/validations/api-schemas';

// Base validation helpers
const trimmedString = z.string().trim();
const optionalTrimmedString = trimmedString.optional();
const nullishTrimmedString = trimmedString.nullish();

/**
 * Schema for filtering product lists.
 */
export const productFilterSchema = commonListQuerySchema.extend({
  sku: z.string().trim().optional(),
  description: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  catalogId: z.string().trim().optional(),
  searchLanguage: z.enum(['name_en', 'name_pl', 'name_de']).optional(),
});

export type ProductFiltersParsed = z.infer<typeof productFilterSchema>;

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function jsonToValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  // We only attempt JSON parse for payloads that look like JSON.
  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    return tryParseJson(trimmed);
  }
  // Handle CSV
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return value;
}

const optionalNonNegativeInt = z.preprocess((value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number().int().min(0).optional());

// Array validation helpers
const stringArray = z.preprocess(jsonToValue, z.array(z.string()).default([]));
const imageUrlArray = stringArray.transform((urls: string[]) => 
  urls.filter(Boolean).filter((url: string) => url?.startsWith('data:') === false)
);
const base64Array = stringArray.transform((urls: string[]) => 
  urls.filter((url: string) => url?.startsWith('data:'))
);

// Parameter validation
const parameterValueSchema = z.object({
  parameterId: trimmedString.min(1, 'Parameter ID is required'),
  value: z.string().nullish(),
});

const parametersArray = z.preprocess(jsonToValue, z.array(parameterValueSchema).default([]));

// Core product schema
const productBaseSchema = z.object({
  // Optional custom ID (e.g. from AI Paths modular nodes)
  id: nullishTrimmedString,
  // Identifiers
  baseProductId: nullishTrimmedString,
  defaultPriceGroupId: nullishTrimmedString,
  sku: optionalTrimmedString,
  
  // Product codes
  ean: nullishTrimmedString,
  gtin: nullishTrimmedString,
  asin: nullishTrimmedString,
  
  // Multilingual names
  name_en: nullishTrimmedString,
  name_pl: nullishTrimmedString,
  name_de: nullishTrimmedString,
  
  // Multilingual descriptions
  description_en: nullishTrimmedString,
  description_pl: nullishTrimmedString,
  description_de: nullishTrimmedString,
  
  // Pricing and supplier
  price: optionalNonNegativeInt,
  supplierName: nullishTrimmedString,
  supplierLink: nullishTrimmedString,
  priceComment: nullishTrimmedString,
  
  // Inventory and dimensions
  stock: optionalNonNegativeInt,
  sizeLength: optionalNonNegativeInt,
  sizeWidth: optionalNonNegativeInt,
  weight: optionalNonNegativeInt,
  length: optionalNonNegativeInt,
  categoryId: nullishTrimmedString,
  
  // Media and metadata
  imageLinks: imageUrlArray.optional(),
  imageBase64s: base64Array.optional(),
  parameters: parametersArray.optional(),
});

// Export schemas
export const productCreateSchema = productBaseSchema.extend({
  sku: trimmedString.min(1, 'SKU is required for new products'),
});

export const productUpdateSchema = productBaseSchema.partial();

// Type exports
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
