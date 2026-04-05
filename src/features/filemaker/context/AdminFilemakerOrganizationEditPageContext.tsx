'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import {
  useAdminFilemakerOrganizationEditPageState,
  type AdminFilemakerOrganizationEditPageContextValue,
} from '../hooks/useAdminFilemakerOrganizationEditPageState';

type AdminFilemakerOrganizationEditPageFunctionKeys = {
  [Key in keyof AdminFilemakerOrganizationEditPageContextValue]-?: AdminFilemakerOrganizationEditPageContextValue[Key] extends (
    ...args: never[]
  ) => unknown
    ? Key
    : never;
}[keyof AdminFilemakerOrganizationEditPageContextValue];

type AdminFilemakerOrganizationEditPageDataKeys = Exclude<
  keyof AdminFilemakerOrganizationEditPageContextValue,
  AdminFilemakerOrganizationEditPageFunctionKeys
>;

export type AdminFilemakerOrganizationEditPageStateContextValue = Pick<
  AdminFilemakerOrganizationEditPageContextValue,
  AdminFilemakerOrganizationEditPageDataKeys
>;

export type AdminFilemakerOrganizationEditPageActionsContextValue = Pick<
  AdminFilemakerOrganizationEditPageContextValue,
  AdminFilemakerOrganizationEditPageFunctionKeys
>;

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
  const {
    setOrgDraft,
    setEditableAddresses,
    setEmailExtractionText,
    setPhoneNumberExtractionText,
    setLinkedEventIds,
    handleSave,
    handleExtractEmails,
    ...stateValue
  } = value;

  const actionsValue: AdminFilemakerOrganizationEditPageActionsContextValue = {
    setOrgDraft,
    setEditableAddresses,
    setEmailExtractionText,
    setPhoneNumberExtractionText,
    setLinkedEventIds,
    handleSave,
    handleExtractEmails,
  };

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
