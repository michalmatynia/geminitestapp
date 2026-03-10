'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { useAdminFilemakerPageState } from '../hooks/useAdminFilemakerPageState';

export type AdminFilemakerPageContextValue = ReturnType<typeof useAdminFilemakerPageState>;

type AdminFilemakerPageFunctionKeys = {
  [Key in keyof AdminFilemakerPageContextValue]-?: AdminFilemakerPageContextValue[Key] extends (
    ...args: never[]
  ) => unknown
    ? Key
    : never;
}[keyof AdminFilemakerPageContextValue];

type AdminFilemakerPageDataKeys = Exclude<
  keyof AdminFilemakerPageContextValue,
  AdminFilemakerPageFunctionKeys
>;

export type AdminFilemakerPageStateContextValue = Pick<
  AdminFilemakerPageContextValue,
  AdminFilemakerPageDataKeys
>;

export type AdminFilemakerPageActionsContextValue = Pick<
  AdminFilemakerPageContextValue,
  AdminFilemakerPageFunctionKeys
>;

const AdminFilemakerPageStateContext = createContext<AdminFilemakerPageStateContextValue | null>(
  null
);
const AdminFilemakerPageActionsContext =
  createContext<AdminFilemakerPageActionsContextValue | null>(null);

export function AdminFilemakerPageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdminFilemakerPageState();
  const {
    setActiveTab,
    setSearchQuery,
    setIsPersonModalOpen,
    setPersonDraft,
    openCreatePerson,
    handleStartEditPerson,
    handleDeletePerson,
    setIsOrgModalOpen,
    setOrgDraft,
    openCreateOrg,
    handleStartEditOrg,
    handleDeleteOrganization,
    setIsEmailModalOpen,
    setEmailDraft,
    openCreateEmail,
    handleStartEditEmail,
    handleDeleteEmail,
    setIsEventModalOpen,
    setEventDraft,
    openCreateEvent,
    handleStartEditEvent,
    handleDeleteEvent,
    handleCreateEvent,
    ...stateValue
  } = value;

  const actionsValue: AdminFilemakerPageActionsContextValue = {
    setActiveTab,
    setSearchQuery,
    setIsPersonModalOpen,
    setPersonDraft,
    openCreatePerson,
    handleStartEditPerson,
    handleDeletePerson,
    setIsOrgModalOpen,
    setOrgDraft,
    openCreateOrg,
    handleStartEditOrg,
    handleDeleteOrganization,
    setIsEmailModalOpen,
    setEmailDraft,
    openCreateEmail,
    handleStartEditEmail,
    handleDeleteEmail,
    setIsEventModalOpen,
    setEventDraft,
    openCreateEvent,
    handleStartEditEvent,
    handleDeleteEvent,
    handleCreateEvent,
  };

  return (
    <AdminFilemakerPageActionsContext.Provider value={actionsValue}>
      <AdminFilemakerPageStateContext.Provider value={stateValue}>
        {children}
      </AdminFilemakerPageStateContext.Provider>
    </AdminFilemakerPageActionsContext.Provider>
  );
}

export function useAdminFilemakerPageStateContext(): AdminFilemakerPageStateContextValue {
  const context = useContext(AdminFilemakerPageStateContext);
  if (!context) {
    throw internalError(
      'useAdminFilemakerPageStateContext must be used within AdminFilemakerPageProvider'
    );
  }
  return context;
}

export function useAdminFilemakerPageActionsContext(): AdminFilemakerPageActionsContextValue {
  const context = useContext(AdminFilemakerPageActionsContext);
  if (!context) {
    throw internalError(
      'useAdminFilemakerPageActionsContext must be used within AdminFilemakerPageProvider'
    );
  }
  return context;
}
