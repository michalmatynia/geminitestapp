import { badRequestError } from '@/shared/errors/app-error';
import {
  catalogIdWithFreshQuerySchema,
  type CatalogIdWithFreshQuery,
} from '@/shared/validations/product-metadata-api-schemas';

export const querySchema = catalogIdWithFreshQuerySchema;

export type ProductCategoryTreeQuery = CatalogIdWithFreshQuery;

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
