'use client';

import React, { createContext, useContext } from 'react';
import { useAdminCaseResolverPageState } from '../hooks/useAdminCaseResolverPageState';

export type AdminCaseResolverPageContextValue = ReturnType<typeof useAdminCaseResolverPageState>;

const AdminCaseResolverPageContext = createContext<AdminCaseResolverPageContextValue | null>(null);

export function AdminCaseResolverPageProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const value = useAdminCaseResolverPageState();
  return (
    <AdminCaseResolverPageContext.Provider value={value}>
      {children}
    </AdminCaseResolverPageContext.Provider>
  );
}

export function useAdminCaseResolverPageContext(): AdminCaseResolverPageContextValue {
  const context = useContext(AdminCaseResolverPageContext);
  if (!context) {
    throw new Error('useAdminCaseResolverPageContext must be used within AdminCaseResolverPageProvider');
  }
  return context;
}
