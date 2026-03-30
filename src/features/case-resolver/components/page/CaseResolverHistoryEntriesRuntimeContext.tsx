import React from 'react';

import type { CaseResolverDocumentHistoryEntry } from '@/shared/contracts/case-resolver';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type CaseResolverHistoryEntriesRuntimeValue = {
  entries: CaseResolverDocumentHistoryEntry[];
  formatTimestamp: (value: string) => string;
  onRestore: (entry: CaseResolverDocumentHistoryEntry) => void;
  isRestoreDisabled: boolean;
};

const {
  Context: CaseResolverHistoryEntriesRuntimeContext,
  useStrictContext: useCaseResolverHistoryEntriesRuntime,
  useOptionalContext: useOptionalCaseResolverHistoryEntriesRuntime,
} = createStrictContext<CaseResolverHistoryEntriesRuntimeValue>({
  hookName: 'useCaseResolverHistoryEntriesRuntime',
  providerName: 'CaseResolverHistoryEntriesRuntimeProvider',
  displayName: 'CaseResolverHistoryEntriesRuntimeContext',
});

export {
  CaseResolverHistoryEntriesRuntimeContext,
  useCaseResolverHistoryEntriesRuntime,
  useOptionalCaseResolverHistoryEntriesRuntime,
};

export function CaseResolverHistoryEntriesRuntimeProvider({
  value,
  children,
}: {
  value: CaseResolverHistoryEntriesRuntimeValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CaseResolverHistoryEntriesRuntimeContext.Provider value={value}>
      {children}
    </CaseResolverHistoryEntriesRuntimeContext.Provider>
  );
}
