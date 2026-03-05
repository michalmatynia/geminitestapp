'use client';

import { createContext, useContext } from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import type { CaseResolverTreeIconComponent as FolderIconComponent } from '../../tree-node-icon';

export type { FolderIconComponent };

export interface CaseListNodeRuntimeContextValue {
  filesById: Map<string, CaseResolverFile>;
  caseTagPathById: Map<string, string>;
  caseIdentifierPathById: Map<string, string>;
  caseCategoryPathById: Map<string, string>;
  renameDraft: string;
  onUpdateRenameDraft: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  handleToggleCaseStatus: (id: string) => Promise<void>;
  handleToggleHeldCase: (caseId: string) => void;
  handleNestHeldCase: (targetCaseId: string) => void;
  handlePrefetchCase: (id: string) => void;
  handlePrefetchFile: (id: string) => void;
  handleOpenCase: (id: string) => void;
  handleOpenFile: (id: string) => void;
  handleCreateCase: (parentId: string | null) => void;
  handleDeleteCase: (id: string) => void;
  FolderClosedIcon: FolderIconComponent;
  FolderOpenIcon: FolderIconComponent;
}

const CaseListNodeRuntimeContext = createContext<CaseListNodeRuntimeContextValue | null>(null);

export function CaseListNodeRuntimeProvider({
  value,
  children,
}: {
  value: CaseListNodeRuntimeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CaseListNodeRuntimeContext.Provider value={value}>
      {children}
    </CaseListNodeRuntimeContext.Provider>
  );
}

export function useCaseListNodeRuntimeContext(): CaseListNodeRuntimeContextValue {
  const context = useContext(CaseListNodeRuntimeContext);
  if (!context) {
    throw new Error(
      'useCaseListNodeRuntimeContext must be used within a CaseListNodeRuntimeProvider'
    );
  }
  return context;
}
