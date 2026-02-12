'use client';

import {
  getProductDetailEditQueryKey,
  getProductDetailQueryKey,
  inactiveProductDetailQueryKey,
  productsAllQueryKey,
  productsCategoriesAllQueryKey,
  productsCountsQueryKey,
  productsDetailsQueryKey,
  productsListsQueryKey,
  getProductCountQueryKey,
  getProductListQueryKey,
} from '@/shared/lib/product-query-keys';

import type { QueryClient } from '@tanstack/react-query';
export {
  getProductCountQueryKey,
  getProductDetailEditQueryKey,
  getProductDetailQueryKey,
  getProductListQueryKey,
  inactiveProductDetailQueryKey,
  productsAllQueryKey,
  productsCategoriesAllQueryKey,
  productsCountsQueryKey,
  productsDetailsQueryKey,
  productsListsQueryKey,
};

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
