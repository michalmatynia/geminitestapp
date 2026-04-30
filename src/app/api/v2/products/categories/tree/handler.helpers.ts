import { badRequestError } from '@/shared/errors/app-error';
import {
  optionalCatalogIdWithFreshQuerySchema,
  type OptionalCatalogIdWithFreshQuery,
} from '@/shared/validations/product-metadata-api-schemas';

export const querySchema = optionalCatalogIdWithFreshQuerySchema;

export type ProductCategoryTreeQuery = OptionalCatalogIdWithFreshQuery;

export const requireProductCategoryTreeCatalogId = (
  query: ProductCategoryTreeQuery | undefined
): string => {
  const catalogId = query?.catalogId;
  if (catalogId === undefined || catalogId.length === 0) {
    throw badRequestError('catalogId query parameter is required');
  }
  return catalogId;
};

export const shouldFetchFreshProductCategoryTree = (
  query: Pick<ProductCategoryTreeQuery, 'fresh'> | undefined
): boolean => query?.fresh ?? false;
