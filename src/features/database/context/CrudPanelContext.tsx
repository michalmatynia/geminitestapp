import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { DatabaseTableDetail } from '@/shared/contracts/database';

export interface CrudPanelContextValue {
  selectedTable: string;
  setSelectedTable: (table: string) => void;
  tableDetails: DatabaseTableDetail[];
  onRefresh: () => void;
  onAddRow: () => void;
  isFetching: boolean;
  setPage: (page: number) => void;
  setMutationError: (error: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
}

export type CrudPanelStateContextValue = Omit<
  CrudPanelContextValue,
  | 'setSelectedTable'
  | 'onRefresh'
  | 'onAddRow'
  | 'setPage'
  | 'setMutationError'
  | 'setSuccessMessage'
>;

export type CrudPanelActionsContextValue = Pick<
  CrudPanelContextValue,
  | 'setSelectedTable'
  | 'onRefresh'
  | 'onAddRow'
  | 'setPage'
  | 'setMutationError'
  | 'setSuccessMessage'
>;

const CrudPanelStateContext = createContext<CrudPanelStateContextValue | null>(null);
const CrudPanelActionsContext = createContext<CrudPanelActionsContextValue | null>(null);

export function useCrudPanelStateContext(): CrudPanelStateContextValue {
  const context = useContext(CrudPanelStateContext);
  if (!context) {
    throw new Error('useCrudPanelStateContext must be used within a CrudPanelProvider');
  }
  return context;
}

export function useCrudPanelActionsContext(): CrudPanelActionsContextValue {
  const context = useContext(CrudPanelActionsContext);
  if (!context) {
    throw new Error('useCrudPanelActionsContext must be used within a CrudPanelProvider');
  }
  return context;
}

export function useCrudPanelContext(): CrudPanelContextValue {
  const state = useCrudPanelStateContext();
  const actions = useCrudPanelActionsContext();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

export function CrudPanelProvider({
  stateValue,
  actionsValue,
  children,
}: {
  stateValue: CrudPanelStateContextValue;
  actionsValue: CrudPanelActionsContextValue;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <CrudPanelActionsContext.Provider value={actionsValue}>
      <CrudPanelStateContext.Provider value={stateValue}>{children}</CrudPanelStateContext.Provider>
    </CrudPanelActionsContext.Provider>
  );
}
