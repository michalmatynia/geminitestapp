import { z } from "zod";

// Base validation helpers
const trimmedString = z.string().trim();
const optionalTrimmedString = trimmedString.optional();
const nullishTrimmedString = trimmedString.nullish();

const positiveNumber = z.number().int().positive();
const optionalPositiveNumber = positiveNumber.optional();

// Array validation helpers
const stringArray = z.array(z.string()).default([]);
const imageUrlArray = stringArray.transform((urls: string[]) => 
  urls.filter((url: string) => url && !url.startsWith("data:"))
);
const base64Array = stringArray.transform((urls: string[]) => 
  urls.filter((url: string) => url && url.startsWith("data:"))
);

// Parameter validation
const parameterValueSchema = z.object({
  parameterId: trimmedString.min(1, "Parameter ID is required"),
  value: z.string().nullish(),
});

const parametersArray = z.array(parameterValueSchema).default([]);

// Core product schema
const productBaseSchema = z.object({
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
  price: optionalPositiveNumber,
  supplierName: nullishTrimmedString,
  supplierLink: nullishTrimmedString,
  priceComment: nullishTrimmedString,
  
  // Inventory and dimensions
  stock: optionalPositiveNumber,
  sizeLength: optionalPositiveNumber,
  sizeWidth: optionalPositiveNumber,
  weight: optionalPositiveNumber,
  length: optionalPositiveNumber,
  
  // Media and metadata
  imageLinks: imageUrlArray.optional(),
  imageBase64s: base64Array.optional(),
  parameters: parametersArray.optional(),
});

// Export schemas
export const productCreateSchema = productBaseSchema.extend({
  sku: trimmedString.min(1, "SKU is required for new products"),
});

export const productUpdateSchema = productBaseSchema.partial();

// Type exports
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;