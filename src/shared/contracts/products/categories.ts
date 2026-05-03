import { z } from 'zod';

import { namedDtoSchema } from '../base';
import { type RecursiveTreeNode } from '../tree';

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
export type ProductCategoryWithChildren = RecursiveTreeNode<ProductCategory>;

export const productCategoryWithChildrenSchema: z.ZodType<ProductCategoryWithChildren> =
  productCategorySchema.extend({
    children: z.array(z.lazy(() => productCategoryWithChildrenSchema)),
  });

export const createProductCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_pl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  catalogId: z.string().min(1, 'Catalog ID is required'),
  sortIndex: z.number().int().min(0).optional(),
});

export type ProductCategoryCreateInput = z.infer<typeof createProductCategorySchema>;

export const updateProductCategorySchema = z.object({
  name: z.string().min(1).optional(),
  name_pl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  catalogId: z.string().min(1).optional(),
  sortIndex: z.number().int().min(0).optional(),
});

export type ProductCategoryUpdateInput = z.infer<typeof updateProductCategorySchema>;
export type ProductCategorySummaryDto = {
  id: string;
  name: string;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  parentId: string | null;
  sortIndex: number | null;
};

const normalizeNullableProductCategoryName = (value: string | null | undefined): string | null =>
  value ?? null;

const normalizeNullableProductCategorySortIndex = (
  value: number | null | undefined
): number | null => value ?? null;

export const toProductCategorySummaryDto = (
  category: ProductCategory
): ProductCategorySummaryDto => ({
  id: category.id,
  name: category.name,
  name_en: normalizeNullableProductCategoryName(category.name_en),
  name_pl: normalizeNullableProductCategoryName(category.name_pl),
  name_de: normalizeNullableProductCategoryName(category.name_de),
  parentId: category.parentId,
  sortIndex: normalizeNullableProductCategorySortIndex(category.sortIndex),
});

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
