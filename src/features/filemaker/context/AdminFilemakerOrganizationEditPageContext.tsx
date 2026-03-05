'use client';

import React, { createContext, useContext, useMemo } from 'react';
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

const AdminFilemakerOrganizationEditPageStateContext =
  createContext<AdminFilemakerOrganizationEditPageStateContextValue | null>(null);
const AdminFilemakerOrganizationEditPageActionsContext =
  createContext<AdminFilemakerOrganizationEditPageActionsContextValue | null>(null);

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

export function useAdminFilemakerOrganizationEditPageStateContext(): AdminFilemakerOrganizationEditPageStateContextValue {
  const context = useContext(AdminFilemakerOrganizationEditPageStateContext);
  if (!context) {
    throw new Error(
      'useAdminFilemakerOrganizationEditPageStateContext must be used within AdminFilemakerOrganizationEditPageProvider'
    );
  }
  return context;
}

export function useAdminFilemakerOrganizationEditPageActionsContext(): AdminFilemakerOrganizationEditPageActionsContextValue {
  const context = useContext(AdminFilemakerOrganizationEditPageActionsContext);
  if (!context) {
    throw new Error(
      'useAdminFilemakerOrganizationEditPageActionsContext must be used within AdminFilemakerOrganizationEditPageProvider'
    );
  }
  return context;
}

export function useAdminFilemakerOrganizationEditPageContext(): AdminFilemakerOrganizationEditPageContextValue {
  const state = useAdminFilemakerOrganizationEditPageStateContext();
  const actions = useAdminFilemakerOrganizationEditPageActionsContext();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
