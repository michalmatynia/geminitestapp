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

export const createProductTagSchema = productTagSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    color: z.string().nullable().optional(),
  });

export type ProductTagCreateInputDto = z.infer<typeof createProductTagSchema>;

export const updateProductTagSchema = createProductTagSchema.partial();

export type ProductTagUpdateInputDto = z.infer<typeof updateProductTagSchema>;

export const productTagFiltersSchema = z.object({
  catalogId: z.string().optional(),
  search: z.string().optional(),
});

export type ProductTagFiltersDto = z.infer<typeof productTagFiltersSchema>;
