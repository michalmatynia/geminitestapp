'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useAdminCaseResolverPageState } from '../hooks/useAdminCaseResolverPageState';
import { internalError } from '@/shared/errors/app-error';

export type AdminCaseResolverPageContextValue = ReturnType<typeof useAdminCaseResolverPageState>;

type FunctionKey<T> = {
  [K in keyof T]-?: T[K] extends (...args: infer _Args) => infer _Return ? K : never;
}[keyof T];

type AdminCaseResolverPageActionKey = FunctionKey<AdminCaseResolverPageContextValue>;

export type AdminCaseResolverPageActionsValue = Pick<
  AdminCaseResolverPageContextValue,
  AdminCaseResolverPageActionKey
>;
export type AdminCaseResolverPageStateValue = Omit<
  AdminCaseResolverPageContextValue,
  AdminCaseResolverPageActionKey
>;

const AdminCaseResolverPageStateContext = createContext<AdminCaseResolverPageStateValue | null>(
  null
);
const AdminCaseResolverPageActionsContext = createContext<AdminCaseResolverPageActionsValue | null>(
  null
);

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

export function useAdminCaseResolverPageStateContext(): AdminCaseResolverPageStateValue {
  const context = useContext(AdminCaseResolverPageStateContext);
  if (!context) {
    throw internalError(
      'useAdminCaseResolverPageStateContext must be used within AdminCaseResolverPageProvider'
    );
  }
  return context;
}

export function useAdminCaseResolverPageActionsContext(): AdminCaseResolverPageActionsValue {
  const context = useContext(AdminCaseResolverPageActionsContext);
  if (!context) {
    throw internalError(
      'useAdminCaseResolverPageActionsContext must be used within AdminCaseResolverPageProvider'
    );
  }
  return context;
}
