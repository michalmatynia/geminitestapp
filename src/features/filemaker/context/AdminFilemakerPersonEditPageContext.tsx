'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import {
  useAdminFilemakerPersonEditPageState,
  type AdminFilemakerPersonEditPageContextValue,
} from '../hooks/useAdminFilemakerPersonEditPageState';

type AdminFilemakerPersonEditPageFunctionKeys = {
  [Key in keyof AdminFilemakerPersonEditPageContextValue]-?: AdminFilemakerPersonEditPageContextValue[Key] extends (
    ...args: never[]
  ) => unknown
    ? Key
    : never;
}[keyof AdminFilemakerPersonEditPageContextValue];

type AdminFilemakerPersonEditPageDataKeys = Exclude<
  keyof AdminFilemakerPersonEditPageContextValue,
  AdminFilemakerPersonEditPageFunctionKeys
>;

export type AdminFilemakerPersonEditPageStateContextValue = Pick<
  AdminFilemakerPersonEditPageContextValue,
  AdminFilemakerPersonEditPageDataKeys
>;

export type AdminFilemakerPersonEditPageActionsContextValue = Pick<
  AdminFilemakerPersonEditPageContextValue,
  AdminFilemakerPersonEditPageFunctionKeys
>;

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
  const {
    setPersonDraft,
    setEditableAddresses,
    setEmailExtractionText,
    setPhoneNumberExtractionText,
    handleSave,
    handleExtractEmails,
    ...stateValue
  } = value;

  const actionsValue: AdminFilemakerPersonEditPageActionsContextValue = {
    setPersonDraft,
    setEditableAddresses,
    setEmailExtractionText,
    setPhoneNumberExtractionText,
    handleSave,
    handleExtractEmails,
  };

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
