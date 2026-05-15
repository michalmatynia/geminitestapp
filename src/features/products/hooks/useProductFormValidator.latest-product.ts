'use client';

import { useMemo } from 'react';

import * as productsApi from '@/features/products/api/products';
import { resolveLatestProductValidatorSourceValues } from '@/features/products/hooks/validator/validator-utils';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { useListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { hasLatestProductSourcePattern } from './useProductFormValidator.helpers';

type UseProductFormValidatorLatestProductValuesArgs = {
  currentProductId: string | null;
  validatorEnabled: boolean;
  validatorPatterns: ProductValidationPattern[];
};

export const useProductFormValidatorLatestProductValues = ({
  currentProductId,
  validatorEnabled,
  validatorPatterns,
}: UseProductFormValidatorLatestProductValuesArgs): Record<string, unknown> | null => {
  const needsLatestProductSource = useMemo(
    () => validatorPatterns.some(hasLatestProductSourcePattern),
    [validatorPatterns]
  );
  const latestProductsQueryKey = QUERY_KEYS.products.validatorLatestProductSource();
  const latestProductsQuery = useListQueryV2({
    queryKey: latestProductsQueryKey,
    queryFn: () =>
      productsApi.getProducts(
        { page: 1, pageSize: 2, advancedFilter: undefined, baseExported: undefined },
        undefined,
        { fresh: true }
      ),
    enabled: validatorEnabled && needsLatestProductSource,
    staleTime: 0,
    meta: {
      source: 'products.hooks.useProductFormValidator',
      operation: 'list',
      resource: 'products.validator.latest-product-source',
      domain: 'products',
      queryKey: latestProductsQueryKey,
      tags: ['products', 'validator', 'latest-product-source'],
      description: 'Loads products validator latest product source.',
    },
  });

  return useMemo(
    () =>
      resolveLatestProductValidatorSourceValues({
        currentProductId,
        isFetching: latestProductsQuery.isFetching,
        products: latestProductsQuery.data,
      }),
    [currentProductId, latestProductsQuery.data, latestProductsQuery.isFetching]
  );
};
