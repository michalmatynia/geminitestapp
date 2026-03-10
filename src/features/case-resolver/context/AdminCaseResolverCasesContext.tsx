'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

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

const AdminCaseResolverCasesStateContext = createContext<AdminCaseResolverCasesStateValue | null>(
  null
);
const AdminCaseResolverCasesActionsContext =
  createContext<AdminCaseResolverCasesActionsValue | null>(null);

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

export function useAdminCaseResolverCasesStateContext(): AdminCaseResolverCasesStateValue {
  const context = useContext(AdminCaseResolverCasesStateContext);
  if (!context) {
    throw internalError(
      'useAdminCaseResolverCasesStateContext must be used within AdminCaseResolverCasesProvider'
    );
  }
  return context;
}

export function useAdminCaseResolverCasesActionsContext(): AdminCaseResolverCasesActionsValue {
  const context = useContext(AdminCaseResolverCasesActionsContext);
  if (!context) {
    throw internalError(
      'useAdminCaseResolverCasesActionsContext must be used within AdminCaseResolverCasesProvider'
    );
  }
  return context;
}

export function useAdminCaseResolverCases(): AdminCaseResolverCasesContextValue {
  const state = useAdminCaseResolverCasesStateContext();
  const actions = useAdminCaseResolverCasesActionsContext();
  return { ...state, ...actions };
}
