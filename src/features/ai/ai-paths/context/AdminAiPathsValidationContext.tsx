'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useAdminAiPathsValidationState } from '../hooks/useAdminAiPathsValidationState';

export type AdminAiPathsValidationContextValue = ReturnType<typeof useAdminAiPathsValidationState>;

const {
  Context: AdminAiPathsValidationContext,
  useStrictContext: useAdminAiPathsValidationContext,
} = createStrictContext<AdminAiPathsValidationContextValue>({
  hookName: 'useAdminAiPathsValidationContext',
  providerName: 'AdminAiPathsValidationProvider',
  displayName: 'AdminAiPathsValidationContext',
  errorFactory: internalError,
});

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
export { useAdminAiPathsValidationContext };
