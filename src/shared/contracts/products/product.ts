import { z } from 'zod';
import { localizedSchema, dtoBaseSchema, namedDtoSchema } from '../base';
import { imageFileRecordSchema, type ImageFileRecordDto as ImageFileRecord } from '../files';
import { catalogSchema } from './catalogs';
import { productTagSchema } from './tags';
import { producerSchema } from './producers';
import { priceGroupSchema } from './catalogs';

export const productCurrencySchema = namedDtoSchema.extend({
  code: z.string(),
  symbol: z.string().nullable(),
});

export type ProductCurrencyDto = z.infer<typeof productCurrencySchema>;
export type CurrencyRecord = ProductCurrencyDto;

/**
 * Price Group With Details Contract
 */
export const priceGroupWithDetailsSchema = priceGroupSchema.extend({
  currency: productCurrencySchema,
  currencyCode: z.string(),
});

export type PriceGroupWithDetailsDto = z.infer<typeof priceGroupWithDetailsSchema>;
export type PriceGroupWithDetails = PriceGroupWithDetailsDto;

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

export type PriceGroupForCalculationDto = z.infer<typeof priceGroupForCalculationSchema>;
export type PriceGroupForCalculation = PriceGroupForCalculationDto;

/**
 * Product Image Contract
 */
export const productImageSchema = z.object({
  productId: z.string(),
  imageFileId: z.string(),
  assignedAt: z.string(),
  imageFile: imageFileRecordSchema.optional(),
});

export type ProductImageDto = z.infer<typeof productImageSchema>;

/**
 * Product Image Record Contract (Domain-specific DTO)
 */
export const productImageRecordSchema = productImageSchema
  .omit({
    imageFile: true,
  })
  .extend({
    imageFile: imageFileRecordSchema,
  });

export interface ProductImageRecordDto {
  productId: string;
  imageFileId: string;
  assignedAt: string;
  imageFile: ImageFileRecord;
}

export type ProductImageRecord = ProductImageRecordDto;

/**
 * Product Catalog Contract
 */
export const productCatalogSchema = z.object({
  productId: z.string(),
  catalogId: z.string(),
  assignedAt: z.string(),
  catalog: z.lazy(() => catalogSchema).optional(),
});

export type ProductCatalogDto = z.infer<typeof productCatalogSchema>;

/**
 * Product Catalog Record Contract (Domain-specific DTO)
 */
export const productCatalogRecordSchema = productCatalogSchema.extend({
  catalog: catalogSchema,
});

export type ProductCatalogRecordDto = z.infer<typeof productCatalogRecordSchema>;
export type ProductCatalogRecord = ProductCatalogRecordDto;

/**
 * Product Tag Relation Contract
 */
export const productTagRelationSchema = z.object({
  productId: z.string(),
  tagId: z.string(),
  assignedAt: z.string(),
  tag: z.lazy(() => productTagSchema).optional(),
});

export type ProductTagRelationDto = z.infer<typeof productTagRelationSchema>;

/**
 * Product Producer Relation Contract
 */
export const productProducerRelationSchema = z.object({
  productId: z.string(),
  producerId: z.string(),
  assignedAt: z.string(),
  producer: z.lazy(() => producerSchema).optional(),
});

export type ProductProducerRelationDto = z.infer<typeof productProducerRelationSchema>;

/**
 * Product Parameter Value Contract
 */
export const productParameterValueSchema = z.object({
  parameterId: z.string(),
  value: z.string().nullable().optional(),
  valuesByLanguage: z.record(z.string(), z.string()).optional(),
});

export type ProductParameterValueDto = z.infer<typeof productParameterValueSchema>;
export type ProductParameterValue = ProductParameterValueDto;

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
  catalogId: z.string(),
  tags: z.array(productTagRelationSchema).optional(),
  producers: z.array(productProducerRelationSchema).optional(),
  images: z.array(productImageSchema).optional(),
  catalogs: z.array(productCatalogSchema).optional(),
  parameters: z.array(productParameterValueSchema).optional(),
  imageLinks: z.array(z.string()).optional(),
  imageBase64s: z.array(z.string()).optional(),
  noteIds: z.array(z.string()).optional(),
});

export type ProductDto = z.infer<typeof productSchema>;
export type ProductRecord = ProductDto;
export type Product = ProductDto;

/**
 * Product With Images Contract
 */
export const productWithImagesSchema = productSchema.extend({
  images: z.array(productImageRecordSchema).default([]),
  catalogs: z.array(productCatalogRecordSchema).default([]),
  tags: z.array(productTagRelationSchema).default([]),
  producers: z.array(productProducerRelationSchema).default([]),
});
export type ProductWithImagesDto = z.infer<typeof productWithImagesSchema>;
export type ProductWithImages = ProductWithImagesDto;

