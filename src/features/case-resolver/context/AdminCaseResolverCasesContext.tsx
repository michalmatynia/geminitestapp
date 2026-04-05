'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useAdminCaseResolverCasesRuntime } from './useAdminCaseResolverCasesRuntime';

import type {
  AdminCaseResolverCasesContextValue,
  AdminCaseResolverCasesActionsValue,
  AdminCaseResolverCasesStateValue,
} from './AdminCaseResolverCasesContext.types';

export type {
  AdminCaseResolverCasesContextValue,
  AdminCaseResolverCasesActionsValue,
  AdminCaseResolverCasesStateValue,
  CaseFileTypeFilter,
  CaseHierarchyFilter,
  CaseLockedFilter,
  CaseReferencesFilter,
  CaseSearchScope,
  CaseSentFilter,
  CaseSortKey,
  CaseSortOrder,
  CaseStatusFilter,
  CaseViewMode,
} from './AdminCaseResolverCasesContext.types';

export const {
  Context: AdminCaseResolverCasesStateContext,
  useStrictContext: useAdminCaseResolverCasesStateContext,
} = createStrictContext<AdminCaseResolverCasesStateValue>({
  hookName: 'useAdminCaseResolverCasesStateContext',
  providerName: 'AdminCaseResolverCasesProvider',
  displayName: 'AdminCaseResolverCasesStateContext',
  errorFactory: internalError,
});

export const {
  Context: AdminCaseResolverCasesActionsContext,
  useStrictContext: useAdminCaseResolverCasesActionsContext,
} = createStrictContext<AdminCaseResolverCasesActionsValue>({
  hookName: 'useAdminCaseResolverCasesActionsContext',
  providerName: 'AdminCaseResolverCasesProvider',
  displayName: 'AdminCaseResolverCasesActionsContext',
  errorFactory: internalError,
});

export function AdminCaseResolverCasesProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { actionsValue, stateValue } = useAdminCaseResolverCasesRuntime();

  return (
    <AdminCaseResolverCasesStateContext.Provider value={stateValue}>
      <AdminCaseResolverCasesActionsContext.Provider value={actionsValue}>
        {children}
      </AdminCaseResolverCasesActionsContext.Provider>
    </AdminCaseResolverCasesStateContext.Provider>
  );
}

export function useAdminCaseResolverCases(): AdminCaseResolverCasesContextValue {
  const state = useAdminCaseResolverCasesStateContext();
  const actions = useAdminCaseResolverCasesActionsContext();
  return { ...state, ...actions };
}
