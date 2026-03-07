'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type CaseResolverPartyFieldRuntimeValue = {
  options: Array<{ value: string; label: string; description?: string | undefined }>;
  disabled: boolean;
};

const {
  Context: CaseResolverPartyFieldRuntimeContext,
  useStrictContext: useCaseResolverPartyFieldRuntime,
  useOptionalContext: useOptionalCaseResolverPartyFieldRuntime,
} = createStrictContext<CaseResolverPartyFieldRuntimeValue>({
  hookName: 'useCaseResolverPartyFieldRuntime',
  providerName: 'CaseResolverPartyFieldRuntimeProvider',
  displayName: 'CaseResolverPartyFieldRuntimeContext',
});

export {
  CaseResolverPartyFieldRuntimeContext,
  useCaseResolverPartyFieldRuntime,
  useOptionalCaseResolverPartyFieldRuntime,
};

export function CaseResolverPartyFieldRuntimeProvider({
  value,
  children,
}: {
  value: CaseResolverPartyFieldRuntimeValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CaseResolverPartyFieldRuntimeContext.Provider value={value}>
      {children}
    </CaseResolverPartyFieldRuntimeContext.Provider>
  );
}
