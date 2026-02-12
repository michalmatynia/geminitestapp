import { z } from 'zod';

import { localizedSchema, dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Product Category Contract
 */
export const productCategorySchema = namedDtoSchema.extend({
  color: z.string().nullable(),
  parentId: z.string().nullable(),
  catalogId: z.string(),
  sortIndex: z.number().nullable().optional(),
});

export type ProductCategoryDto = z.infer<typeof productCategorySchema>;

export const createProductCategorySchema = productCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductCategoryDto = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryDto = Partial<CreateProductCategoryDto>;

/**
 * Product Tag Contract
 */
export const productTagSchema = namedDtoSchema.extend({
  color: z.string().nullable(),
  catalogId: z.string(),
});

export type ProductTagDto = z.infer<typeof productTagSchema>;

export const createProductTagSchema = productTagSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductTagDto = z.infer<typeof createProductTagSchema>;
export type UpdateProductTagDto = Partial<CreateProductTagDto>;

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

export const createCatalogSchema = catalogSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCatalogDto = z.infer<typeof createCatalogSchema>;
export type UpdateCatalogDto = Partial<CreateCatalogDto>;

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

export const createPriceGroupSchema = priceGroupSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePriceGroupDto = z.infer<typeof createPriceGroupSchema>;
export type UpdatePriceGroupDto = Partial<CreatePriceGroupDto>;

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
  tags: z.array(z.string()),
  images: z.array(z.string()),
  imageLinks: z.array(z.string()),
  imageBase64s: z.array(z.string()),
  noteIds: z.array(z.string()),
  // Transient fields for creation/update
  catalogIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  producerIds: z.array(z.string()).optional(),
});

export type ProductDto = z.infer<typeof productSchema>;

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = Partial<CreateProductDto>;
