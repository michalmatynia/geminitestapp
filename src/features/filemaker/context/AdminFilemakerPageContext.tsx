'use client';

import React, { createContext, useContext } from 'react';
import { useAdminFilemakerPageState } from '../hooks/useAdminFilemakerPageState';

export type AdminFilemakerPageContextValue = ReturnType<typeof useAdminFilemakerPageState>;

const AdminFilemakerPageContext = createContext<AdminFilemakerPageContextValue | null>(null);

export function AdminFilemakerPageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdminFilemakerPageState();
  return (
    <AdminFilemakerPageContext.Provider value={value}>
      {children}
    </AdminFilemakerPageContext.Provider>
  );
}

export function useAdminFilemakerPageContext(): AdminFilemakerPageContextValue {
  const context = useContext(AdminFilemakerPageContext);
  if (!context) {
    throw new Error('useAdminFilemakerPageContext must be used within AdminFilemakerPageProvider');
  }
  return context;
}
