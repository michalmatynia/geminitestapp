'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { useIntegrationListingBadges } from '@/features/integrations/public';
import { useProductListListingStatuses } from '@/features/products/hooks/product-list/useProductListListingStatuses';
import { internalError } from '@/shared/errors/app-error';

import {
  createProductListRowRuntimeStore,
  type ProductListRowRuntimeStore,
} from './hooks/useProductListRowRuntimeStore';
import { useProductListSubContexts } from './hooks/useProductListSubContexts';
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

const ProductListFiltersContext = createContext<ProductListFiltersContextType | null>(null);
const ProductListSelectionContext = createContext<ProductListSelectionContextType | null>(null);
const ProductListTableContext = createContext<ProductListTableContextType | null>(null);
const ProductListAlertsContext = createContext<ProductListAlertsContextType | null>(null);
const ProductListActionsContext = createContext<ProductListActionsContextType | null>(null);
const ProductListHeaderActionsContext = createContext<ProductListHeaderActionsContextType | null>(
  null
);
const ProductListRowActionsContext = createContext<ProductListRowActionsContextType | null>(null);
const ProductListRowVisualsContext = createContext<ProductListRowVisualsContextType | null>(null);
const ProductListRowRuntimeStoreContext = createContext<ProductListRowRuntimeStore | null>(null);
const ProductListModalsContext = createContext<ProductListModalsContextType | null>(null);

type ProductListProviderValue = ProductListContextType & {
  triggerListingStatusHighlight: (productId: string) => void;
  rowRuntimeReady: boolean;
};

type ProductListRuntimeBridgeProps = {
  data: ProductListContextType['data'];
  queuedProductIds: ProductListContextType['queuedProductIds'];
  productAiRunStatusByProductId: ProductListContextType['productAiRunStatusByProductId'];
  rowRuntimeStore: ProductListRowRuntimeStore;
  triggerListingStatusHighlight: (productId: string) => void;
  enabled: boolean;
};

const createRequiredProductListContextHook = <T,>(
  context: React.Context<T | null>,
  hookName: string
): (() => T) => {
  return (): T => {
    const value = useContext(context);
    if (!value) {
      throw internalError(`${hookName} must be used within a ProductListProvider`);
    }
    return value;
  };
};

type ProductListProviderTreeProps = {
  actionsValue: ProductListActionsContextType;
  alertsValue: ProductListAlertsContextType;
  children: ReactNode;
  filtersValue: ProductListFiltersContextType;
  headerActionsValue: ProductListHeaderActionsContextType;
  modalsValue: ProductListModalsContextType;
  rowActionsValue: ProductListRowActionsContextType;
  rowRuntimeStore: ProductListRowRuntimeStore;
  rowVisualsValue: ProductListRowVisualsContextType;
  selectionValue: ProductListSelectionContextType;
  tableValue: ProductListTableContextType;
};

function useProductListRuntimeBridge({
  data,
  queuedProductIds,
  productAiRunStatusByProductId,
  rowRuntimeStore,
  triggerListingStatusHighlight,
  enabled,
}: ProductListRuntimeBridgeProps): void {
  const visibleProductIds = useMemo(
    () =>
      data
        .map((product) => product.id.trim())
        .filter((productId) => productId.length > 0),
    [data]
  );
  const visibleProductIdSet = useMemo(() => new Set(visibleProductIds), [visibleProductIds]);
  const {
    integrationBadgeIds,
    integrationBadgeStatuses,
    traderaBadgeIds,
    traderaBadgeStatuses,
    playwrightProgrammableBadgeIds,
    playwrightProgrammableBadgeStatuses,
  } = useIntegrationListingBadges(visibleProductIds, { enabled });

  useProductListListingStatuses({
    data,
    integrationBadgeStatuses,
    traderaBadgeStatuses,
    playwrightProgrammableBadgeStatuses,
    visibleProductIdSet,
    triggerJobCompletionHighlight: triggerListingStatusHighlight,
  });

  useEffect(() => {
    rowRuntimeStore.setState({
      integrationBadgeIds,
      integrationBadgeStatuses,
      traderaBadgeIds,
      traderaBadgeStatuses,
      playwrightProgrammableBadgeIds,
      playwrightProgrammableBadgeStatuses,
      queuedProductIds,
      productAiRunStatusByProductId,
    });
  }, [
    integrationBadgeIds,
    integrationBadgeStatuses,
    playwrightProgrammableBadgeIds,
    playwrightProgrammableBadgeStatuses,
    productAiRunStatusByProductId,
    queuedProductIds,
    rowRuntimeStore,
    traderaBadgeIds,
    traderaBadgeStatuses,
  ]);
}

export const useProductListFiltersContext = createRequiredProductListContextHook(
  ProductListFiltersContext,
  'useProductListFiltersContext'
);

export const useProductListSelectionContext = createRequiredProductListContextHook(
  ProductListSelectionContext,
  'useProductListSelectionContext'
);

export const useProductListTableContext = createRequiredProductListContextHook(
  ProductListTableContext,
  'useProductListTableContext'
);

export const useProductListAlertsContext = createRequiredProductListContextHook(
  ProductListAlertsContext,
  'useProductListAlertsContext'
);

export const useProductListActionsContext = createRequiredProductListContextHook(
  ProductListActionsContext,
  'useProductListActionsContext'
);

export const useProductListHeaderActionsContext = createRequiredProductListContextHook(
  ProductListHeaderActionsContext,
  'useProductListHeaderActionsContext'
);

export const useProductListRowActionsContext = createRequiredProductListContextHook(
  ProductListRowActionsContext,
  'useProductListRowActionsContext'
);

export const useProductListRowVisualsContext = createRequiredProductListContextHook(
  ProductListRowVisualsContext,
  'useProductListRowVisualsContext'
);

export const useProductListRowRuntime = (
  productId: string,
  baseProductId: string | null | undefined
): ProductListRowRuntimeContextType => {
  const store = useContext(ProductListRowRuntimeStoreContext);
  if (!store) {
    throw internalError('useProductListRowRuntime must be used within a ProductListProvider');
  }

  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot(productId, baseProductId),
    () => store.getSnapshot(productId, baseProductId)
  );
};

export const useProductListModalsContext = (): ProductListModalsContextType => {
  const context = useContext(ProductListModalsContext);
  if (!context) {
    throw internalError('useProductListModalsContext must be used within a ProductListProvider');
  }
  return context;
};

function ProductListProviderTree({
  actionsValue,
  alertsValue,
  children,
  filtersValue,
  headerActionsValue,
  modalsValue,
  rowActionsValue,
  rowRuntimeStore,
  rowVisualsValue,
  selectionValue,
  tableValue,
}: ProductListProviderTreeProps): React.JSX.Element {
  return (
    <ProductListFiltersContext.Provider value={filtersValue}>
      <ProductListSelectionContext.Provider value={selectionValue}>
        <ProductListAlertsContext.Provider value={alertsValue}>
          <ProductListTableContext.Provider value={tableValue}>
            <ProductListActionsContext.Provider value={actionsValue}>
              <ProductListHeaderActionsContext.Provider value={headerActionsValue}>
                <ProductListRowActionsContext.Provider value={rowActionsValue}>
                  <ProductListRowRuntimeStoreContext.Provider value={rowRuntimeStore}>
                    <ProductListRowVisualsContext.Provider value={rowVisualsValue}>
                      <ProductListModalsContext.Provider value={modalsValue}>
                        {children}
                      </ProductListModalsContext.Provider>
                    </ProductListRowVisualsContext.Provider>
                  </ProductListRowRuntimeStoreContext.Provider>
                </ProductListRowActionsContext.Provider>
              </ProductListHeaderActionsContext.Provider>
            </ProductListActionsContext.Provider>
          </ProductListTableContext.Provider>
        </ProductListAlertsContext.Provider>
      </ProductListSelectionContext.Provider>
    </ProductListFiltersContext.Provider>
  );
}

export function ProductListProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ProductListProviderValue;
}) {
  const rowRuntimeStoreRef = useRef<ProductListRowRuntimeStore | null>(null);
  if (!rowRuntimeStoreRef.current) {
    rowRuntimeStoreRef.current = createProductListRowRuntimeStore({
      integrationBadgeIds: value.integrationBadgeIds,
      integrationBadgeStatuses: value.integrationBadgeStatuses,
      traderaBadgeIds: value.traderaBadgeIds,
      traderaBadgeStatuses: value.traderaBadgeStatuses,
      playwrightProgrammableBadgeIds: value.playwrightProgrammableBadgeIds,
      playwrightProgrammableBadgeStatuses: value.playwrightProgrammableBadgeStatuses,
      queuedProductIds: value.queuedProductIds,
      productAiRunStatusByProductId: value.productAiRunStatusByProductId,
    });
  }
  const rowRuntimeStore = rowRuntimeStoreRef.current;

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
  useProductListRuntimeBridge({
    data: value.data,
    queuedProductIds: value.queuedProductIds,
    productAiRunStatusByProductId: value.productAiRunStatusByProductId,
    rowRuntimeStore,
    triggerListingStatusHighlight: value.triggerListingStatusHighlight,
    enabled: value.rowRuntimeReady,
  });

  return (
    <ProductListProviderTree
      actionsValue={actionsValue}
      alertsValue={alertsValue}
      filtersValue={filtersValue}
      headerActionsValue={headerActionsValue}
      modalsValue={modalsValue}
      rowActionsValue={rowActionsValue}
      rowRuntimeStore={rowRuntimeStore}
      rowVisualsValue={rowVisualsValue}
      selectionValue={selectionValue}
      tableValue={tableValue}
    >
      {children}
    </ProductListProviderTree>
  );
}
