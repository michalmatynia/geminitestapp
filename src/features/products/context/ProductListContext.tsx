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
};

type ProductListRuntimeBridgeProps = {
  data: ProductListContextType['data'];
  queuedProductIds: ProductListContextType['queuedProductIds'];
  productAiRunStatusByProductId: ProductListContextType['productAiRunStatusByProductId'];
  rowRuntimeStore: ProductListRowRuntimeStore;
  triggerListingStatusHighlight: (productId: string) => void;
};

function ProductListRuntimeBridge({
  data,
  queuedProductIds,
  productAiRunStatusByProductId,
  rowRuntimeStore,
  triggerListingStatusHighlight,
}: ProductListRuntimeBridgeProps): null {
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
  } = useIntegrationListingBadges(visibleProductIds);

  useProductListListingStatuses({
    data,
    integrationBadgeStatuses,
    traderaBadgeStatuses,
    visibleProductIdSet,
    triggerJobCompletionHighlight: triggerListingStatusHighlight,
  });

  useEffect(() => {
    rowRuntimeStore.setState({
      integrationBadgeIds,
      integrationBadgeStatuses,
      traderaBadgeIds,
      traderaBadgeStatuses,
      queuedProductIds,
      productAiRunStatusByProductId,
    });
  }, [
    integrationBadgeIds,
    integrationBadgeStatuses,
    productAiRunStatusByProductId,
    queuedProductIds,
    rowRuntimeStore,
    traderaBadgeIds,
    traderaBadgeStatuses,
  ]);

  return null;
}

export const useProductListFiltersContext = (): ProductListFiltersContextType => {
  const context = useContext(ProductListFiltersContext);
  if (!context) {
    throw internalError('useProductListFiltersContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListSelectionContext = (): ProductListSelectionContextType => {
  const context = useContext(ProductListSelectionContext);
  if (!context) {
    throw internalError('useProductListSelectionContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListTableContext = (): ProductListTableContextType => {
  const context = useContext(ProductListTableContext);
  if (!context) {
    throw internalError('useProductListTableContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListAlertsContext = (): ProductListAlertsContextType => {
  const context = useContext(ProductListAlertsContext);
  if (!context) {
    throw internalError('useProductListAlertsContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListActionsContext = (): ProductListActionsContextType => {
  const context = useContext(ProductListActionsContext);
  if (!context) {
    throw internalError('useProductListActionsContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListHeaderActionsContext = (): ProductListHeaderActionsContextType => {
  const context = useContext(ProductListHeaderActionsContext);
  if (!context) {
    throw internalError(
      'useProductListHeaderActionsContext must be used within a ProductListProvider'
    );
  }
  return context;
};

export const useProductListRowActionsContext = (): ProductListRowActionsContextType => {
  const context = useContext(ProductListRowActionsContext);
  if (!context) {
    throw internalError(
      'useProductListRowActionsContext must be used within a ProductListProvider'
    );
  }
  return context;
};

export const useProductListRowVisualsContext = (): ProductListRowVisualsContextType => {
  const context = useContext(ProductListRowVisualsContext);
  if (!context) {
    throw internalError(
      'useProductListRowVisualsContext must be used within a ProductListProvider'
    );
  }
  return context;
};

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

  return (
    <ProductListFiltersContext.Provider value={filtersValue}>
      <ProductListSelectionContext.Provider value={selectionValue}>
        <ProductListAlertsContext.Provider value={alertsValue}>
          <ProductListTableContext.Provider value={tableValue}>
            <ProductListActionsContext.Provider value={actionsValue}>
              <ProductListHeaderActionsContext.Provider value={headerActionsValue}>
                <ProductListRowActionsContext.Provider value={rowActionsValue}>
                  <ProductListRowRuntimeStoreContext.Provider value={rowRuntimeStore}>
                    <ProductListRuntimeBridge
                      data={value.data}
                      queuedProductIds={value.queuedProductIds}
                      productAiRunStatusByProductId={value.productAiRunStatusByProductId}
                      rowRuntimeStore={rowRuntimeStore}
                      triggerListingStatusHighlight={value.triggerListingStatusHighlight}
                    />
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
