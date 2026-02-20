import { z } from 'zod';
import { namedDtoSchema } from '../base';
import { productParameterValueSchema } from '../products';

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
  parameters: z.array(z.lazy(() => productParameterValueSchema)).optional(),
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

export const createProductDraftSchema = productDraftSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductDraftDto = z.infer<typeof createProductDraftSchema>;

export const updateProductDraftSchema = createProductDraftSchema.partial();

export type UpdateProductDraftDto = Partial<CreateProductDraftDto>;
