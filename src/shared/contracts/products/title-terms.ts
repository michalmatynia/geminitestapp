import { z } from 'zod';

import { namedDtoSchema } from '../base';

export const productTitleTermTypeSchema = z.enum(['size', 'material', 'theme']);

export type ProductTitleTermType = z.infer<typeof productTitleTermTypeSchema>;

export const productTitleTermSchema = namedDtoSchema.extend({
  catalogId: z.string(),
  type: productTitleTermTypeSchema,
  name_en: z.string(),
  name_pl: z.string().nullable(),
});

export type ProductTitleTerm = z.infer<typeof productTitleTermSchema>;

export const createProductTitleTermSchema = z.object({
  catalogId: z.string().min(1, 'Catalog ID is required'),
  type: productTitleTermTypeSchema,
  name_en: z.string().min(1, 'English name is required'),
  name_pl: z.string().trim().nullable().optional(),
});

export type ProductTitleTermCreateInput = z.infer<typeof createProductTitleTermSchema>;

export const updateProductTitleTermSchema = z.object({
  catalogId: z.string().min(1).optional(),
  type: productTitleTermTypeSchema.optional(),
  name_en: z.string().min(1).optional(),
  name_pl: z.string().trim().nullable().optional(),
});

export type ProductTitleTermUpdateInput = z.infer<typeof updateProductTitleTermSchema>;

export const productTitleTermFiltersSchema = z.object({
  catalogId: z.string().optional(),
  type: productTitleTermTypeSchema.optional(),
  search: z.string().optional(),
  skip: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(250).optional(),
});

export type ProductTitleTermFilters = z.infer<typeof productTitleTermFiltersSchema>;
