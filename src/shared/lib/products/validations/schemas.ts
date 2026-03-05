import {
  productCreateInputSchema as productCreateSchema,
  productUpdateInputSchema as productUpdateSchema,
  productFilterSchema as productFilterDtoSchema,
  type ProductCreateInput,
  type ProductFilter as ProductFiltersParsed,
  type ProductUpdateInput,
} from '@/shared/contracts/products';

/**
 * Schema for filtering product lists.
 */
export const productFilterSchema = productFilterDtoSchema;

export type { ProductFiltersParsed };

// Type exports
export {
  productCreateSchema,
  productUpdateSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
};
