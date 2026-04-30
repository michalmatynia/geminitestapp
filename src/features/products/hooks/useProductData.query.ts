'use client';

import { useMemo } from 'react';

import { resolveLoadError } from './useProductData.helpers';
import type { ProductDataQueryMeta } from './useProductData.types';

export const useProductDataQueryMeta = ({
  effectivePageSize,
  error,
  total,
}: {
  effectivePageSize: number;
  error: unknown;
  total: number;
}): ProductDataQueryMeta => {
  const loadError = useMemo((): Error | null => resolveLoadError(error), [error]);
  const totalPages = useMemo(
    (): number => Math.ceil(total / effectivePageSize),
    [effectivePageSize, total]
  );
  return { loadError, totalPages };
};
