'use client';

// Splits the large ProductListProvider value into focused, memoized sub-context
// values so unrelated consumers do not re-render on every provider update.

import {
  useProductListActionsValue,
  useProductListAlertsValue,
  useProductListHeaderActionsValue,
  useProductListRowActionsValue,
  useProductListRowVisualsValue,
  useProductListSelectionValue,
  useProductListTableValue,
} from './useProductListSubContexts.core';
import { useProductListFiltersValue } from './useProductListSubContexts.filters';
import { useProductListModalsValue } from './useProductListSubContexts.modals';
import type {
  ProductListSubContexts,
  ProductListSubContextsInput,
} from './useProductListSubContexts.types';

export function useProductListSubContexts(
  value: ProductListSubContextsInput
): ProductListSubContexts {
  return {
    filtersValue: useProductListFiltersValue(value),
    selectionValue: useProductListSelectionValue(value),
    tableValue: useProductListTableValue(value),
    alertsValue: useProductListAlertsValue(value),
    actionsValue: useProductListActionsValue(value),
    headerActionsValue: useProductListHeaderActionsValue(value),
    rowActionsValue: useProductListRowActionsValue(value),
    rowVisualsValue: useProductListRowVisualsValue(value),
    modalsValue: useProductListModalsValue(value),
  };
}
