'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { type PickActions, type OmitState } from '@/shared/lib/react/types';

import {
  useAdminFilemakerOrganizationEditPageState,
  type AdminFilemakerOrganizationEditPageContextValue,
} from '../hooks/useAdminFilemakerOrganizationEditPageState';

export type AdminFilemakerOrganizationEditPageStateContextValue =
  OmitState<AdminFilemakerOrganizationEditPageContextValue>;

export type AdminFilemakerOrganizationEditPageActionsContextValue =
  PickActions<AdminFilemakerOrganizationEditPageContextValue>;

const {
  Context: AdminFilemakerOrganizationEditPageStateContext,
  useStrictContext: useAdminFilemakerOrganizationEditPageStateContextValue,
} = createStrictContext<AdminFilemakerOrganizationEditPageStateContextValue>({
  hookName: 'useAdminFilemakerOrganizationEditPageStateContext',
  providerName: 'AdminFilemakerOrganizationEditPageProvider',
  errorFactory: internalError,
});
const {
  Context: AdminFilemakerOrganizationEditPageActionsContext,
  useStrictContext: useAdminFilemakerOrganizationEditPageActionsContextValue,
} = createStrictContext<AdminFilemakerOrganizationEditPageActionsContextValue>({
  hookName: 'useAdminFilemakerOrganizationEditPageActionsContext',
  providerName: 'AdminFilemakerOrganizationEditPageProvider',
  errorFactory: internalError,
});

export function AdminFilemakerOrganizationEditPageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdminFilemakerOrganizationEditPageState();
  const stateValue = React.useMemo(
    () => value as AdminFilemakerOrganizationEditPageStateContextValue,
    [value]
  );
  const actionsValue = React.useMemo(
    () => value as AdminFilemakerOrganizationEditPageActionsContextValue,
    [value]
  );

  return (
    <AdminFilemakerOrganizationEditPageActionsContext.Provider value={actionsValue}>
      <AdminFilemakerOrganizationEditPageStateContext.Provider value={stateValue}>
        {children}
      </AdminFilemakerOrganizationEditPageStateContext.Provider>
    </AdminFilemakerOrganizationEditPageActionsContext.Provider>
  );
}

export const useAdminFilemakerOrganizationEditPageStateContext =
  useAdminFilemakerOrganizationEditPageStateContextValue;
export const useAdminFilemakerOrganizationEditPageActionsContext =
  useAdminFilemakerOrganizationEditPageActionsContextValue;
