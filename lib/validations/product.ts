import { z } from 'zod';

export const productSchema = z.object({
  name_en: z.string().nullish(),
  name_pl: z.string().nullish(),
  name_de: z.string().nullish(),
  price: z.coerce.number().int().nullish(),
  sku: z.string().min(1, { message: 'SKU is required' }),
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
