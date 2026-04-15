'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { type PickActions, type OmitState } from '@/shared/lib/react/types';

import {
  useAdminFilemakerPersonEditPageState,
  type AdminFilemakerPersonEditPageContextValue,
} from '../hooks/useAdminFilemakerPersonEditPageState';

export type AdminFilemakerPersonEditPageStateContextValue =
  OmitState<AdminFilemakerPersonEditPageContextValue>;

export type AdminFilemakerPersonEditPageActionsContextValue =
  PickActions<AdminFilemakerPersonEditPageContextValue>;

const {
  Context: AdminFilemakerPersonEditPageStateContext,
  useStrictContext: useAdminFilemakerPersonEditPageStateContextValue,
} = createStrictContext<AdminFilemakerPersonEditPageStateContextValue>({
  hookName: 'useAdminFilemakerPersonEditPageStateContext',
  providerName: 'AdminFilemakerPersonEditPageProvider',
  errorFactory: internalError,
});
const {
  Context: AdminFilemakerPersonEditPageActionsContext,
  useStrictContext: useAdminFilemakerPersonEditPageActionsContextValue,
} = createStrictContext<AdminFilemakerPersonEditPageActionsContextValue>({
  hookName: 'useAdminFilemakerPersonEditPageActionsContext',
  providerName: 'AdminFilemakerPersonEditPageProvider',
  errorFactory: internalError,
});

export function AdminFilemakerPersonEditPageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdminFilemakerPersonEditPageState();
  const stateValue = React.useMemo(
    () => value as AdminFilemakerPersonEditPageStateContextValue,
    [value]
  );
  const actionsValue = React.useMemo(
    () => value as AdminFilemakerPersonEditPageActionsContextValue,
    [value]
  );

  return (
    <AdminFilemakerPersonEditPageActionsContext.Provider value={actionsValue}>
      <AdminFilemakerPersonEditPageStateContext.Provider value={stateValue}>
        {children}
      </AdminFilemakerPersonEditPageStateContext.Provider>
    </AdminFilemakerPersonEditPageActionsContext.Provider>
  );
}

export const useAdminFilemakerPersonEditPageStateContext =
  useAdminFilemakerPersonEditPageStateContextValue;
export const useAdminFilemakerPersonEditPageActionsContext =
  useAdminFilemakerPersonEditPageActionsContextValue;
