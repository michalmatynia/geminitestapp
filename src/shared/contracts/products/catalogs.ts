import { z } from 'zod';
import { namedDtoSchema } from '../base';

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
export type Catalog = CatalogDto;
export type CatalogRecord = CatalogDto;

export const createCatalogSchema = catalogSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    description: z.string().nullable().optional(),
    isDefault: z.boolean().optional(),
    languageIds: z.array(z.string()).optional(),
    priceGroupIds: z.array(z.string()).optional(),
  });

export type CatalogCreateInputDto = z.infer<typeof createCatalogSchema>;

export const updateCatalogSchema = createCatalogSchema.partial();

export type CatalogUpdateInputDto = z.infer<typeof updateCatalogSchema>;

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
export type PriceGroup = PriceGroupDto;
export type PriceGroupRecord = PriceGroupDto;

export const createPriceGroupSchema = priceGroupSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePriceGroupDto = z.infer<typeof createPriceGroupSchema>;
export type PriceGroupCreateInput = CreatePriceGroupDto;
export type UpdatePriceGroupDto = Partial<CreatePriceGroupDto>;
export type PriceGroupUpdateInput = UpdatePriceGroupDto;
