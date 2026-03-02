import { createContext, useContext, type ReactNode } from 'react';

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

const CrudPanelContext = createContext<CrudPanelContextValue | null>(null);

export function useCrudPanelContext(): CrudPanelContextValue {
  const context = useContext(CrudPanelContext);
  if (!context) {
    throw new Error('useCrudPanelContext must be used within a CrudPanelProvider');
  }
  return context;
}

export function CrudPanelProvider({
  value,
  children,
}: {
  value: CrudPanelContextValue;
  children: ReactNode;
}): React.JSX.Element {
  return <CrudPanelContext.Provider value={value}>{children}</CrudPanelContext.Provider>;
}

