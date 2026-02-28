'use client';

import React, { createContext, useContext } from 'react';
import {
  useAdminFilemakerOrganizationEditPageState,
  type AdminFilemakerOrganizationEditPageContextValue,
} from '../hooks/useAdminFilemakerOrganizationEditPageState';

const AdminFilemakerOrganizationEditPageContext =
  createContext<AdminFilemakerOrganizationEditPageContextValue | null>(null);

export function AdminFilemakerOrganizationEditPageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdminFilemakerOrganizationEditPageState();
  return (
    <AdminFilemakerOrganizationEditPageContext.Provider value={value}>
      {children}
    </AdminFilemakerOrganizationEditPageContext.Provider>
  );
}

export function useAdminFilemakerOrganizationEditPageContext(): AdminFilemakerOrganizationEditPageContextValue {
  const context = useContext(AdminFilemakerOrganizationEditPageContext);
  if (!context) {
    throw new Error(
      'useAdminFilemakerOrganizationEditPageContext must be used within AdminFilemakerOrganizationEditPageProvider'
    );
  }
  return context;
}
