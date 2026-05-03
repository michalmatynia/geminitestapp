'use client';
'use no memo';

import {
  applyProductListAdvancedFilterState,
  applyProductListPageSizeChange,
  scheduleDeferredProductListDraftBootstrap,
  shouldEnableProductListBackgroundSync,
  shouldEnableProductListBackgroundSyncRuntime,
} from './product-list/productListStateHelpers';
import { useProductListCallbacks } from './product-list/useProductListState.callbacks';
import { useProductListDataState } from './product-list/useProductListState.data';
import { useProductListModalState } from './product-list/useProductListState.modals';
import { useProductListRuntimeState } from './product-list/useProductListState.runtime';
import type { ProductListStateReturn } from './product-list/useProductListState.types';
import { useProductListStateValue } from './product-list/useProductListState.value';

export { shouldAdoptIncomingEditProductDetail } from './product-list/useProductEditHydration';
export {
  applyProductListAdvancedFilterState,
  applyProductListPageSizeChange,
  scheduleDeferredProductListDraftBootstrap,
  shouldEnableProductListBackgroundSync,
  shouldEnableProductListBackgroundSyncRuntime,
};

export function useProductListState(): ProductListStateReturn {
  const runtime = useProductListRuntimeState();
  const data = useProductListDataState({
    draftsReady: runtime.draftsReady,
    isMounted: runtime.isMounted,
    refreshTrigger: runtime.refreshTrigger,
    rowRuntimeReady: runtime.rowRuntimeReady,
    searchParams: runtime.searchParams,
  });
  const modal = useProductListModalState({
    queuedProductIds: data.queuedProductIds,
    setRefreshTrigger: runtime.setRefreshTrigger,
    visibleData: data.visibleData,
    visibleProductIdSet: data.visibleProductIdSet,
  });
  const callbacks = useProductListCallbacks(data, modal, runtime);
  return useProductListStateValue({ callbacks, data, modal, runtime });
}
