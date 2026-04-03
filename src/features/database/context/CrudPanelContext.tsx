'use client';

import type { ReactNode } from 'react';

import type { DatabaseTableDetail } from '@/shared/contracts/database';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const { Context: CrudPanelStateContext, useStrictContext: useCrudPanelStateContext } =
  createStrictContext<CrudPanelStateContextValue>({
    hookName: 'useCrudPanelStateContext',
    providerName: 'a CrudPanelProvider',
    displayName: 'CrudPanelStateContext',
    errorFactory: internalError,
  });

const { Context: CrudPanelActionsContext, useStrictContext: useCrudPanelActionsContext } =
  createStrictContext<CrudPanelActionsContextValue>({
    hookName: 'useCrudPanelActionsContext',
    providerName: 'a CrudPanelProvider',
    displayName: 'CrudPanelActionsContext',
    errorFactory: internalError,
  });

export { useCrudPanelStateContext, useCrudPanelActionsContext };

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
