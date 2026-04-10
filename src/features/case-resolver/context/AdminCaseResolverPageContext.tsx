'use client';

import React, { useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type {
  FunctionKey,
  OmitState,
  PickActions,
} from '@/shared/lib/react/types';

import { useAdminCaseResolverPageState } from '../hooks/useAdminCaseResolverPageState';

export type AdminCaseResolverPageContextValue = ReturnType<typeof useAdminCaseResolverPageState>;

type AdminCaseResolverPageActionKey = FunctionKey<AdminCaseResolverPageContextValue>;

export type AdminCaseResolverPageActionsValue = PickActions<AdminCaseResolverPageContextValue>;
export type AdminCaseResolverPageStateValue = OmitState<AdminCaseResolverPageContextValue>;

export const {
  Context: AdminCaseResolverPageStateContext,
  useStrictContext: useAdminCaseResolverPageStateContext,
} = createStrictContext<AdminCaseResolverPageStateValue>({
  hookName: 'useAdminCaseResolverPageStateContext',
  providerName: 'AdminCaseResolverPageProvider',
  displayName: 'AdminCaseResolverPageStateContext',
  errorFactory: internalError,
});

export const {
  Context: AdminCaseResolverPageActionsContext,
  useStrictContext: useAdminCaseResolverPageActionsContext,
} = createStrictContext<AdminCaseResolverPageActionsValue>({
  hookName: 'useAdminCaseResolverPageActionsContext',
  providerName: 'AdminCaseResolverPageProvider',
  displayName: 'AdminCaseResolverPageActionsContext',
  errorFactory: internalError,
});

export function AdminCaseResolverPageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdminCaseResolverPageState();
  const stateValue = useMemo(() => value as AdminCaseResolverPageStateValue, [value]);
  const actionsValue = useMemo(() => value as AdminCaseResolverPageActionsValue, [value]);

  return (
    <AdminCaseResolverPageStateContext.Provider value={stateValue}>
      <AdminCaseResolverPageActionsContext.Provider value={actionsValue}>
        {children}
      </AdminCaseResolverPageActionsContext.Provider>
    </AdminCaseResolverPageStateContext.Provider>
  );
}
