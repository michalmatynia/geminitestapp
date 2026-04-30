import type { useProductListCallbacks } from './useProductListState.callbacks';
import type { useProductListDataState } from './useProductListState.data';
import type { useProductListModalState } from './useProductListState.modals';
import type { useProductListRuntimeState } from './useProductListState.runtime';

export type ProductListCallbacks = ReturnType<typeof useProductListCallbacks>;
export type ProductListDataState = ReturnType<typeof useProductListDataState>;
export type ProductListModalState = ReturnType<typeof useProductListModalState>;
export type ProductListRuntimeState = ReturnType<typeof useProductListRuntimeState>;

export type ProductListValueInput = {
  callbacks: ProductListCallbacks;
  data: ProductListDataState;
  modal: ProductListModalState;
  runtime: ProductListRuntimeState;
};
