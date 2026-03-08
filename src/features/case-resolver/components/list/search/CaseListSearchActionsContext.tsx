'use client';

import { createContext, useContext } from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import { internalError } from '@/shared/errors/app-error';

export interface CaseListSearchActionsContextValue {
  onPrefetchCase: (caseId: string) => void;
  onPrefetchFile: (file: CaseResolverFile) => void;
  onOpenCase: (caseId: string) => void;
  onOpenFile: (file: CaseResolverFile) => void;
}

const CaseListSearchActionsContext = createContext<CaseListSearchActionsContextValue | null>(null);

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

export function useCaseListSearchActionsContext(): CaseListSearchActionsContextValue {
  const context = useContext(CaseListSearchActionsContext);
  if (!context) {
    throw internalError(
      'useCaseListSearchActionsContext must be used within a CaseListSearchActionsProvider'
    );
  }
  return context;
}
