import { z } from 'zod';

import type { ProductValidationPattern } from '@/shared/contracts/products';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  includeDisabled: optionalBooleanQuerySchema().default(false),
});

export type ProductValidatorConfigQuery = z.infer<typeof querySchema>;

export const shouldIncludeDisabledValidationPatterns = (
  query: Pick<ProductValidatorConfigQuery, 'includeDisabled'> | undefined
): boolean => query?.includeDisabled ?? false;

export const filterValidationPatternsForConfig = (
  patterns: ProductValidationPattern[],
  includeDisabled: boolean
): ProductValidationPattern[] =>
  includeDisabled ? patterns : patterns.filter((pattern) => pattern.enabled);
