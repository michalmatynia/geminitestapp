'use client';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { QueryClient } from '@tanstack/react-query';

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

export const invalidateProducts = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: productsAllQueryKey });
};

export const invalidateProductsAndCounts = async (
  queryClient: QueryClient
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: productsAllQueryKey }),
    queryClient.invalidateQueries({ queryKey: productsCountsQueryKey }),
  ]);
};

export const invalidateProductsAndDetail = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: productsAllQueryKey }),
    queryClient.invalidateQueries({ queryKey: getProductDetailQueryKey(productId) }),
  ]);
};

export const invalidateProductsCountsAndDetail = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: productsAllQueryKey }),
    queryClient.invalidateQueries({ queryKey: productsCountsQueryKey }),
    queryClient.invalidateQueries({ queryKey: getProductDetailQueryKey(productId) }),
  ]);
};

export const refetchProductsAndCounts = async (
  queryClient: QueryClient
): Promise<void> => {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: productsListsQueryKey }),
    queryClient.refetchQueries({ queryKey: productsCountsQueryKey }),
  ]);
};
