'use client';

import React, { createContext, useContext, useMemo } from 'react';
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

const AdminFilemakerPersonEditPageStateContext =
  createContext<AdminFilemakerPersonEditPageStateContextValue | null>(null);
const AdminFilemakerPersonEditPageActionsContext =
  createContext<AdminFilemakerPersonEditPageActionsContextValue | null>(null);

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

export function useAdminFilemakerPersonEditPageStateContext(): AdminFilemakerPersonEditPageStateContextValue {
  const context = useContext(AdminFilemakerPersonEditPageStateContext);
  if (!context) {
    throw new Error(
      'useAdminFilemakerPersonEditPageStateContext must be used within AdminFilemakerPersonEditPageProvider'
    );
  }
  return context;
}

export function useAdminFilemakerPersonEditPageActionsContext(): AdminFilemakerPersonEditPageActionsContextValue {
  const context = useContext(AdminFilemakerPersonEditPageActionsContext);
  if (!context) {
    throw new Error(
      'useAdminFilemakerPersonEditPageActionsContext must be used within AdminFilemakerPersonEditPageProvider'
    );
  }
  return context;
}

export function useAdminFilemakerPersonEditPageContext(): AdminFilemakerPersonEditPageContextValue {
  const state = useAdminFilemakerPersonEditPageStateContext();
  const actions = useAdminFilemakerPersonEditPageActionsContext();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
