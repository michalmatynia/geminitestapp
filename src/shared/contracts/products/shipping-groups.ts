import { z } from 'zod';

import { namedDtoSchema } from '../base';

export const productShippingGroupSchema = namedDtoSchema.extend({
  description: z.string().nullable().optional(),
  catalogId: z.string(),
  traderaShippingCondition: z.string().nullable().optional(),
});

export type ProductShippingGroup = z.infer<typeof productShippingGroupSchema>;

export const createProductShippingGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  catalogId: z.string().min(1, 'Catalog ID is required'),
  traderaShippingCondition: z.string().nullable().optional(),
});

export type ProductShippingGroupCreateInput = z.infer<typeof createProductShippingGroupSchema>;

export const updateProductShippingGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
  traderaShippingCondition: z.string().nullable().optional(),
});

export type ProductShippingGroupUpdateInput = z.infer<typeof updateProductShippingGroupSchema>;

export const productShippingGroupFiltersSchema = z.object({
  catalogId: z.string().optional(),
  search: z.string().optional(),
  skip: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type ProductShippingGroupFilters = z.infer<typeof productShippingGroupFiltersSchema>;
