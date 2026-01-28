import { z } from 'zod';

// Helper: preprocess empty strings to undefined before coercing to number
const emptyStringToUndefined = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return value;
  },
  z.coerce.number().int()
);

const optionalSku = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  },
  z.string().trim().min(1, { message: "SKU is required" })
);

const imageLinksSchema = z.preprocess((value: unknown): string[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      return trimmed
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return [];
}, z.array(z.string().trim()));

const parameterValueSchema = z.object({
  parameterId: z.string().trim().min(1, "Parameter ID is required"),
  value: z.string().optional().nullable(),
});

const parametersSchema = z.preprocess((value: unknown): unknown[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value as unknown[];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed as unknown[];
    } catch {
      return [];
    }
  }
  return [];
}, z.array(parameterValueSchema));

const productBaseSchema = z.object({
  baseProductId: z.string().nullish(),
  defaultPriceGroupId: z.string().nullish(),
  ean: z.string().nullish(),
  gtin: z.string().nullish(),
  asin: z.string().nullish(),
  name_en: z.string().nullish(),
  name_pl: z.string().nullish(),
  name_de: z.string().nullish(),
  price: emptyStringToUndefined.nullish(),
  description_en: z.string().nullish(),
  description_pl: z.string().nullish(),
  description_de: z.string().nullish(),
  supplierName: z.string().nullish(),
  supplierLink: z.string().nullish(),
  priceComment: z.string().nullish(),
  stock: emptyStringToUndefined.nullish(),
  sizeLength: emptyStringToUndefined.nullish(),
  sizeWidth: emptyStringToUndefined.nullish(),
  weight: emptyStringToUndefined.nullish(),
  length: emptyStringToUndefined.nullish(),
  imageLinks: imageLinksSchema.optional(),
  parameters: parametersSchema.optional(),
});

export const productCreateSchema = productBaseSchema.extend({
  sku: optionalSku.optional(),
});

export const productUpdateSchema = productBaseSchema.extend({
  sku: optionalSku.optional(),
});

export type ProductCreateData = z.infer<typeof productCreateSchema>;
export type ProductUpdateData = z.infer<typeof productUpdateSchema>;
