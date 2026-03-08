'use client';

import React, { createContext, useContext } from 'react';
import { internalError } from '@/shared/errors/app-error';
import { useAdminAiPathsValidationState } from '../hooks/useAdminAiPathsValidationState';

export type AdminAiPathsValidationContextValue = ReturnType<typeof useAdminAiPathsValidationState>;

const AdminAiPathsValidationContext = createContext<AdminAiPathsValidationContextValue | null>(
  null
);

export function AdminAiPathsValidationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useAdminAiPathsValidationState();
  return (
    <AdminAiPathsValidationContext.Provider value={value}>
      {children}
    </AdminAiPathsValidationContext.Provider>
  );
}

export function useAdminAiPathsValidationContext(): AdminAiPathsValidationContextValue {
  const context = useContext(AdminAiPathsValidationContext);
  if (!context) {
    throw internalError(
      'useAdminAiPathsValidationContext must be used within AdminAiPathsValidationProvider'
    );
  }
  return context;
}
