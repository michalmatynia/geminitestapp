import { z } from 'zod';

const optionalSku = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  },
  z.string().trim().min(1, { message: "SKU is required" })
);

const productBaseSchema = z.object({
  name_en: z.string().nullish(),
  name_pl: z.string().nullish(),
  name_de: z.string().nullish(),
  price: z.coerce.number().int().nullish(),
  description_en: z.string().nullish(),
  description_pl: z.string().nullish(),
  description_de: z.string().nullish(),
  supplierName: z.string().nullish(),
  supplierLink: z.string().nullish(),
  priceComment: z.string().nullish(),
  stock: z.coerce.number().int().nullish(),
  sizeLength: z.coerce.number().int().nullish(),
  sizeWidth: z.coerce.number().int().nullish(),
  weight: z.coerce.number().int().nullish(),
  length: z.coerce.number().int().nullish(),
});

export const productCreateSchema = productBaseSchema.extend({
  sku: optionalSku.optional(),
});

export const productUpdateSchema = productBaseSchema.extend({
  sku: optionalSku.optional(),
});

export type ProductCreateData = z.infer<typeof productCreateSchema>;
export type ProductUpdateData = z.infer<typeof productUpdateSchema>;
