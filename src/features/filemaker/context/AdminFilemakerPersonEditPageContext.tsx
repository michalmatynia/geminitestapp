'use client';

import React, { createContext, useContext } from 'react';
import {
  useAdminFilemakerPersonEditPageState,
  type AdminFilemakerPersonEditPageContextValue,
} from '../hooks/useAdminFilemakerPersonEditPageState';

const AdminFilemakerPersonEditPageContext =
  createContext<AdminFilemakerPersonEditPageContextValue | null>(null);

export function AdminFilemakerPersonEditPageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdminFilemakerPersonEditPageState();
  return (
    <AdminFilemakerPersonEditPageContext.Provider value={value}>
      {children}
    </AdminFilemakerPersonEditPageContext.Provider>
  );
}

export function useAdminFilemakerPersonEditPageContext(): AdminFilemakerPersonEditPageContextValue {
  const context = useContext(AdminFilemakerPersonEditPageContext);
  if (!context) {
    throw new Error(
      'useAdminFilemakerPersonEditPageContext must be used within AdminFilemakerPersonEditPageProvider'
    );
  }
  return context;
}
