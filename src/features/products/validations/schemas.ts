import { z } from 'zod';

import {
  productCreateInputSchema as productCreateSchema,
  productUpdateInputSchema as productUpdateSchema,
  productFilterSchema as productFilterDtoSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
} from '@/shared/contracts/products';

/**
 * Schema for filtering product lists.
 */
export const productFilterSchema = productFilterDtoSchema;

export type ProductFiltersParsed = z.infer<typeof productFilterSchema>;

// Type exports
export {
  productCreateSchema,
  productUpdateSchema,
  type ProductCreateInput,
  type ProductUpdateInput,
};
