import { productCreateInputSchema as productCreateSchema, productUpdateInputSchema as productUpdateSchema } from '@/shared/contracts/products/io';
import { productFilterSchema as productFilterDtoSchema } from '@/shared/contracts/products/filters';
import { type ProductCreateInput, type ProductFilter as ProductFiltersParsed, type ProductUpdateInput } from '@/shared/contracts/products';

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
