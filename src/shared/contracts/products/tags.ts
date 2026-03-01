import { z } from 'zod';
import { namedDtoSchema } from '../base';

/**
 * Product Tag Contract
 */
export const productTagSchema = namedDtoSchema.extend({
  color: z.string().nullable(),
  catalogId: z.string(),
});

export type ProductTagDto = z.infer<typeof productTagSchema>;
export type ProductTag = ProductTagDto;

export const createProductTagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().nullable().optional(),
  catalogId: z.string().min(1, 'Catalog ID is required'),
});

export type ProductTagCreateInputDto = z.infer<typeof createProductTagSchema>;

export const updateProductTagSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
});

export type ProductTagUpdateInputDto = z.infer<typeof updateProductTagSchema>;

export const productTagFiltersSchema = z.object({
  catalogId: z.string().optional(),
  search: z.string().optional(),
});

export type ProductTagFiltersDto = z.infer<typeof productTagFiltersSchema>;
