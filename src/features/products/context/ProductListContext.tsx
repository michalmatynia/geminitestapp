'use client';

// ProductListContext: central composition root for product list UI state.
// - Composes many small contexts (filters, selection, table, actions, alerts,
//   modals, row visuals, row runtime store) into a single Provider to avoid
//   deep prop-drilling and to keep render boundaries explicit.
// - Uses a global registry when creating contexts to preserve context
//   identity across hot-reloads and bundler/loader boundaries (prevents
//   "must be used within a Provider" errors when modules are re-evaluated).
// - The row runtime store is a lightweight, external store created once per
//   provider instance; consumers use useSyncExternalStore (via
//   useProductListRowRuntime) to subscribe to fine-grained per-row snapshots
//   without forcing whole-list re-renders.

import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import { useIntegrationListingBadges } from '@/features/integrations/product-integrations-adapter';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useProductListListingStatuses } from '../hooks/product-list/useProductListListingStatuses';

import { useProductListSubContexts } from './hooks/useProductListSubContexts';
import {
  createProductListRowRuntimeStore,
  EMPTY_PRODUCT_LIST_ROW_RUNTIME_SNAPSHOT,
  type ProductListRowRuntimeStore,
} from './hooks/useProductListRowRuntimeStore';
import type {
  ProductListActionsContextType,
  ProductListAlertsContextType,
  ProductListContextType,
  ProductListFiltersContextType,
  ProductListHeaderActionsContextType,
  ProductListModalsContextType,
  ProductListRowActionsContextType,
  ProductListRowRuntimeContextType,
  ProductListRowVisualsContextType,
  ProductListSelectionContextType,
  ProductListTableContextType,
} from './ProductListContext.types';

export type {
  ProductListActionsContextType,
  ProductListAlertsContextType,
  ProductListContextType,
  ProductListFiltersContextType,
  ProductListHeaderActionsContextType,
  ProductListModalsContextType,
  ProductListRowActionsContextType,
  ProductListRowRuntimeContextType,
  ProductListRowVisualsContextType,
  ProductListSelectionContextType,
  ProductListTableContextType,
} from './ProductListContext.types';

type ProductListProviderValue = ProductListContextType & {
  rowRuntimeReady?: boolean;
  triggerListingStatusHighlight?: (productId: string) => void;
};

type ProductListProviderProps = {
  value: ProductListProviderValue;
  children: React.ReactNode;
};

const createProductListStrictContext = <T,>(hookName: string, displayName: string) => {
  // Use a global registry to ensure that even if this module is executed multiple times
  // (e.g., due to dynamic imports in some bundlers like Turbopack), the context objects
  // remain stable. This prevents \"must be used within a Provider\" errors caused by
  // context object identity mismatches.
  const registryKey = `__PRODUCT_LIST_CONTEXT_${hookName}`;
  const globalObj = (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : (global as unknown as Record<string, unknown>));
  
  if (globalObj[registryKey]) {
    return globalObj[registryKey] as ReturnType<typeof createStrictContext<T>>;
  }

  const result = createStrictContext<T>({
    hookName,
    providerName: 'a ProductListProvider',
    displayName,
    errorFactory: internalError,
  });

  globalObj[registryKey] = result;
  return result;
};

export const {
  Context: ProductListFiltersContext,
  useStrictContext: useProductListFiltersContext,
} = createProductListStrictContext<ProductListFiltersContextType>(
  'useProductListFiltersContext',
  'ProductListFiltersContext'
);

export const {
  Context: ProductListSelectionContext,
  useStrictContext: useProductListSelectionContext,
} = createProductListStrictContext<ProductListSelectionContextType>(
  'useProductListSelectionContext',
  'ProductListSelectionContext'
);

export const {
  Context: ProductListTableContext,
  useStrictContext: useProductListTableContext,
} = createProductListStrictContext<ProductListTableContextType>(
  'useProductListTableContext',
  'ProductListTableContext'
);

export const {
  Context: ProductListAlertsContext,
  useStrictContext: useProductListAlertsContext,
} = createProductListStrictContext<ProductListAlertsContextType>(
  'useProductListAlertsContext',
  'ProductListAlertsContext'
);

export const {
  Context: ProductListActionsContext,
  useStrictContext: useProductListActionsContext,
} = createProductListStrictContext<ProductListActionsContextType>(
  'useProductListActionsContext',
  'ProductListActionsContext'
);

export const {
  Context: ProductListHeaderActionsContext,
  useStrictContext: useProductListHeaderActionsContext,
} = createProductListStrictContext<ProductListHeaderActionsContextType>(
  'useProductListHeaderActionsContext',
  'ProductListHeaderActionsContext'
);

export const {
  Context: ProductListRowActionsContext,
  useStrictContext: useProductListRowActionsContext,
} = createProductListStrictContext<ProductListRowActionsContextType>(
  'useProductListRowActionsContext',
  'ProductListRowActionsContext'
);

export const {
  Context: ProductListRowVisualsContext,
  useStrictContext: useProductListRowVisualsContext,
} = createProductListStrictContext<ProductListRowVisualsContextType>(
  'useProductListRowVisualsContext',
  'ProductListRowVisualsContext'
);

export const {
  Context: ProductListModalsContext,
  useStrictContext: useProductListModalsContext,
} = createProductListStrictContext<ProductListModalsContextType>(
  'useProductListModalsContext',
  'ProductListModalsContext'
);

const {
  Context: ProductListRowRuntimeStoreContext,
  useStrictContext: useProductListRowRuntimeStoreContext,
} = createProductListStrictContext<ProductListRowRuntimeStore>(
  'useProductListRowRuntimeStoreContext',
  'ProductListRowRuntimeStoreContext'
);

const NOOP_TRIGGER_LISTING_STATUS_HIGHLIGHT = (_productId: string): void => {};

export function ProductListProvider({
  value,
  children,
}: ProductListProviderProps): React.JSX.Element {
  const {
    filtersValue,
    selectionValue,
    tableValue,
    alertsValue,
    actionsValue,
    headerActionsValue,
    rowActionsValue,
    rowVisualsValue,
    modalsValue,
  } = useProductListSubContexts(value);

  const productIds = useMemo(() => value.data.map((product) => product.id), [value.data]);
  const visibleProductIdSet = useMemo(() => new Set(productIds), [productIds]);

  const badgeState = useIntegrationListingBadges(productIds, {
    enabled: value.rowRuntimeReady ?? true,
  });

  useProductListListingStatuses({
    data: value.data,
    integrationBadgeStatuses: badgeState.integrationBadgeStatuses,
    traderaBadgeStatuses: badgeState.traderaBadgeStatuses,
    playwrightProgrammableBadgeStatuses: badgeState.playwrightProgrammableBadgeStatuses,
    vintedBadgeStatuses: badgeState.vintedBadgeStatuses,
    visibleProductIdSet,
    triggerJobCompletionHighlight:
      value.triggerListingStatusHighlight ?? NOOP_TRIGGER_LISTING_STATUS_HIGHLIGHT,
  });

  const rowRuntimeStoreState = useMemo(
    () => ({
      integrationBadgeIds: badgeState.integrationBadgeIds,
      integrationBadgeStatuses: badgeState.integrationBadgeStatuses,
      traderaBadgeIds: badgeState.traderaBadgeIds,
      traderaBadgeStatuses: badgeState.traderaBadgeStatuses,
      playwrightProgrammableBadgeIds: badgeState.playwrightProgrammableBadgeIds,
      playwrightProgrammableBadgeStatuses: badgeState.playwrightProgrammableBadgeStatuses,
      vintedBadgeIds: badgeState.vintedBadgeIds,
      vintedBadgeStatuses: badgeState.vintedBadgeStatuses,
      queuedProductIds: value.queuedProductIds,
      productAiRunStatusByProductId: value.productAiRunStatusByProductId,
      productScanRunStatusByProductId: value.productScanRunStatusByProductId,
    }),
    [
      badgeState.integrationBadgeIds,
      badgeState.integrationBadgeStatuses,
      badgeState.traderaBadgeIds,
      badgeState.traderaBadgeStatuses,
      badgeState.playwrightProgrammableBadgeIds,
      badgeState.playwrightProgrammableBadgeStatuses,
      value.queuedProductIds,
      value.productAiRunStatusByProductId,
      value.productScanRunStatusByProductId,
    ]
  );

  const rowRuntimeStoreRef = useRef<ProductListRowRuntimeStore | null>(null);
  if (!rowRuntimeStoreRef.current) {
    rowRuntimeStoreRef.current = createProductListRowRuntimeStore(rowRuntimeStoreState);
  }

  useEffect(() => {
    rowRuntimeStoreRef.current?.setState(rowRuntimeStoreState);
  }, [rowRuntimeStoreState]);

  return (
    <ProductListAlertsContext.Provider value={alertsValue}>
      <ProductListFiltersContext.Provider value={filtersValue}>
        <ProductListSelectionContext.Provider value={selectionValue}>
          <ProductListTableContext.Provider value={tableValue}>
            <ProductListActionsContext.Provider value={actionsValue}>
              <ProductListHeaderActionsContext.Provider value={headerActionsValue}>
                <ProductListRowActionsContext.Provider value={rowActionsValue}>
                  <ProductListRowVisualsContext.Provider value={rowVisualsValue}>
                    <ProductListRowRuntimeStoreContext.Provider value={rowRuntimeStoreRef.current}>
                      <ProductListModalsContext.Provider value={modalsValue}>
                        {children}
                      </ProductListModalsContext.Provider>
                    </ProductListRowRuntimeStoreContext.Provider>
                  </ProductListRowVisualsContext.Provider>
                </ProductListRowActionsContext.Provider>
              </ProductListHeaderActionsContext.Provider>
            </ProductListActionsContext.Provider>
          </ProductListTableContext.Provider>
        </ProductListSelectionContext.Provider>
      </ProductListFiltersContext.Provider>
    </ProductListAlertsContext.Provider>
  );
}

export function useProductListRowRuntime(
  productId: string,
  baseProductId: string | null | undefined
): ProductListRowRuntimeContextType {
  const store = useProductListRowRuntimeStoreContext();

  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot(productId, baseProductId),
    () => EMPTY_PRODUCT_LIST_ROW_RUNTIME_SNAPSHOT
  );
}
