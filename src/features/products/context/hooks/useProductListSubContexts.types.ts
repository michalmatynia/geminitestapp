import type {
  ProductListActionsContextType,
  ProductListAlertsContextType,
  ProductListContextType,
  ProductListFiltersContextType,
  ProductListHeaderActionsContextType,
  ProductListModalsContextType,
  ProductListRowActionsContextType,
  ProductListRowVisualsContextType,
  ProductListSelectionContextType,
  ProductListTableContextType,
} from '../ProductListContext.types';

export type ProductListSubContextsInput = ProductListContextType & {
  rowRuntimeReady?: boolean;
};

export type ProductListSubContexts = {
  filtersValue: ProductListFiltersContextType;
  selectionValue: ProductListSelectionContextType;
  tableValue: ProductListTableContextType;
  alertsValue: ProductListAlertsContextType;
  actionsValue: ProductListActionsContextType;
  headerActionsValue: ProductListHeaderActionsContextType;
  rowActionsValue: ProductListRowActionsContextType;
  rowVisualsValue: ProductListRowVisualsContextType;
  modalsValue: ProductListModalsContextType;
};
