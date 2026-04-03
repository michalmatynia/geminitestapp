'use client';

import React from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export interface CaseListSearchActionsContextValue {
  onPrefetchCase: (caseId: string) => void;
  onPrefetchFile: (file: CaseResolverFile) => void;
  onOpenCase: (caseId: string) => void;
  onOpenFile: (file: CaseResolverFile) => void;
}

const {
  Context: CaseListSearchActionsContext,
  useStrictContext: useCaseListSearchActionsContext,
} = createStrictContext<CaseListSearchActionsContextValue>({
  hookName: 'useCaseListSearchActionsContext',
  providerName: 'a CaseListSearchActionsProvider',
  displayName: 'CaseListSearchActionsContext',
  errorFactory: internalError,
});

export function CaseListSearchActionsProvider({
  value,
  children,
}: {
  value: CaseListSearchActionsContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CaseListSearchActionsContext.Provider value={value}>
      {children}
    </CaseListSearchActionsContext.Provider>
  );
}

export { useCaseListSearchActionsContext };
