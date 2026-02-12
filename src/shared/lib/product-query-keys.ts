import { QUERY_KEYS } from './query-keys';

export const productsAllQueryKey = QUERY_KEYS.products.all;
export const productsListsQueryKey = QUERY_KEYS.products.lists();
export const productsCountsQueryKey = QUERY_KEYS.products.counts();
export const productsDetailsQueryKey = QUERY_KEYS.products.details();
export const productsCategoriesAllQueryKey = QUERY_KEYS.products.categoriesAll();
export const inactiveProductDetailQueryKey = [...productsDetailsQueryKey, 'inactive'] as const;

export const getProductListQueryKey = (filters: unknown): readonly unknown[] =>
  QUERY_KEYS.products.list(filters);

export const getProductCountQueryKey = (filters: unknown): readonly unknown[] =>
  QUERY_KEYS.products.count(filters);

export const getProductDetailQueryKey = (productId: string): readonly unknown[] =>
  QUERY_KEYS.products.detail(productId);

export const getProductDetailEditQueryKey = (productId: string): readonly unknown[] =>
  QUERY_KEYS.products.detailEdit(productId);
