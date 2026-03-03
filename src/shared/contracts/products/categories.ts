import { z } from 'zod';
import { namedDtoSchema } from '../base';

/**
 * Product Category Contract
 */
export const productCategorySchema = namedDtoSchema.extend({
  name_en: z.string().nullable().optional(),
  name_pl: z.string().nullable().optional(),
  name_de: z.string().nullable().optional(),
  color: z.string().nullable(),
  parentId: z.string().nullable(),
  catalogId: z.string(),
  sortIndex: z.number().nullable().optional(),
});

export type ProductCategory = z.infer<typeof productCategorySchema>;

/**
 * Product Category With Children Contract
 */
export interface ProductCategoryWithChildren extends ProductCategory {
  children: ProductCategoryWithChildren[];
}

export const productCategoryWithChildrenSchema: z.ZodType<ProductCategoryWithChildren> =
  productCategorySchema.extend({
    children: z.array(z.lazy(() => productCategoryWithChildrenSchema)),
  });

export const createProductCategorySchema = productCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProductCategoryCreateInput = z.infer<typeof createProductCategorySchema>;
export type ProductCategoryUpdateInput = Partial<ProductCategoryCreateInput>;

export const productCategoryFiltersSchema = z.object({
  catalogId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  search: z.string().optional(),
});

export type ProductCategoryFilters = z.infer<typeof productCategoryFiltersSchema>;

/**
 * Product Category Reorder Contract
 */
export const reorderProductCategorySchema = z.object({
  categoryId: z.string().trim().min(1),
  parentId: z.string().trim().nullable().optional(),
  position: z.enum(['inside', 'before', 'after']),
  targetId: z.string().trim().nullable().optional(),
  catalogId: z.string().trim().optional(),
});

export type ReorderProductCategory = z.infer<typeof reorderProductCategorySchema>;
