'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { PickActions, OmitState } from '@/shared/lib/react/types';

import { useAdminFilemakerPageState } from '../hooks/useAdminFilemakerPageState';

export type AdminFilemakerPageContextValue = ReturnType<typeof useAdminFilemakerPageState>;

export type AdminFilemakerPageStateContextValue = OmitState<AdminFilemakerPageContextValue>;

export type AdminFilemakerPageActionsContextValue = PickActions<AdminFilemakerPageContextValue>;

const {
  Context: AdminFilemakerPageStateContext,
  useStrictContext: useAdminFilemakerPageStateContextValue,
} = createStrictContext<AdminFilemakerPageStateContextValue>({
  hookName: 'useAdminFilemakerPageStateContext',
  providerName: 'AdminFilemakerPageProvider',
  errorFactory: internalError,
});
const {
  Context: AdminFilemakerPageActionsContext,
  useStrictContext: useAdminFilemakerPageActionsContextValue,
} = createStrictContext<AdminFilemakerPageActionsContextValue>({
  hookName: 'useAdminFilemakerPageActionsContext',
  providerName: 'AdminFilemakerPageProvider',
  errorFactory: internalError,
});

export function AdminFilemakerPageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdminFilemakerPageState();
  const stateValue = React.useMemo(() => value as AdminFilemakerPageStateContextValue, [value]);
  const actionsValue = React.useMemo(() => value as AdminFilemakerPageActionsContextValue, [value]);

  return (
    <AdminFilemakerPageActionsContext.Provider value={actionsValue}>
      <AdminFilemakerPageStateContext.Provider value={stateValue}>
        {children}
      </AdminFilemakerPageStateContext.Provider>
    </AdminFilemakerPageActionsContext.Provider>
  );
}

export const useAdminFilemakerPageStateContext = useAdminFilemakerPageStateContextValue;
export const useAdminFilemakerPageActionsContext = useAdminFilemakerPageActionsContextValue;
