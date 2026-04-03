'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

export const useAdminFilemakerPageStateContext = useAdminFilemakerPageStateContextValue;
export const useAdminFilemakerPageActionsContext = useAdminFilemakerPageActionsContextValue;
