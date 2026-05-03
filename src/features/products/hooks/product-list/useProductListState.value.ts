'use client';

import { useMemo } from 'react';

import type { ProductListStateReturn } from './useProductListState.types';
import { buildActionValue } from './useProductListState.value.actions';
import { buildFilterValue } from './useProductListState.value.filters';
import { buildModalValue } from './useProductListState.value.modals';
import { buildRuntimeValue } from './useProductListState.value.runtime';
import { buildTableValue } from './useProductListState.value.table';
import type { ProductListValueInput } from './useProductListState.value.types';

export const useProductListStateValue = (
  input: ProductListValueInput
): ProductListStateReturn =>
  useMemo(
    () => ({
      ...buildFilterValue(input),
      ...buildTableValue(input),
      ...buildActionValue(input),
      ...buildRuntimeValue(input),
      ...buildModalValue(input),
    }),
    [input]
  );
