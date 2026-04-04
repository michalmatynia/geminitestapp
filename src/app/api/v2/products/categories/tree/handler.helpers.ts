import { z } from 'zod';

import { badRequestError } from '@/shared/errors/app-error';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';
import { catalogIdQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

export const querySchema = catalogIdQuerySchema.extend({
  fresh: optionalBooleanQuerySchema().default(false),
});

export type ProductCategoryTreeQuery = z.infer<typeof querySchema>;

export const requireProductCategoryTreeCatalogId = (
  query: ProductCategoryTreeQuery | undefined
): string => {
  const catalogId = query?.catalogId;
  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }
  return catalogId;
};

export const shouldFetchFreshProductCategoryTree = (
  query: Pick<ProductCategoryTreeQuery, 'fresh'> | undefined
): boolean => query?.fresh ?? false;
