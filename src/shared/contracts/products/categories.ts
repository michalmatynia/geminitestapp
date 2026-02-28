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

export type ProductCategoryDto = z.infer<typeof productCategorySchema>;
export type ProductCategory = ProductCategoryDto;

/**
 * Product Category With Children Contract
 */
export interface ProductCategoryWithChildrenDto extends ProductCategoryDto {
  children: ProductCategoryWithChildrenDto[];
}
export type ProductCategoryWithChildren = ProductCategoryWithChildrenDto;

export const productCategoryWithChildrenSchema: z.ZodType<ProductCategoryWithChildrenDto> =
  productCategorySchema.extend({
    children: z.array(z.lazy(() => productCategoryWithChildrenSchema)),
  });

export const createProductCategorySchema = productCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductCategoryDto = z.infer<typeof createProductCategorySchema>;
export type ProductCategoryCreateInput = CreateProductCategoryDto;
export type UpdateProductCategoryDto = Partial<CreateProductCategoryDto>;
export type ProductCategoryUpdateInput = UpdateProductCategoryDto;

export const productCategoryFiltersSchema = z.object({
  catalogId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  search: z.string().optional(),
});

export type ProductCategoryFiltersDto = z.infer<typeof productCategoryFiltersSchema>;
