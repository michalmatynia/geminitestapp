'use client';

import { createContext, useContext } from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import { internalError } from '@/shared/errors/app-error';

import type { CaseResolverTreeIconComponent as FolderIconComponent } from '../../tree-node-icon';

export type { FolderIconComponent };

export interface CaseListNodeRuntimeContextValue {
  // Data Maps
  filesById: Map<string, CaseResolverFile>;
  caseTagPathById: Map<string, string>;
  caseIdentifierPathById: Map<string, string>;
  caseCategoryPathById: Map<string, string>;

  // State
  renameDraft: string;
  heldCaseId: string | null;
  isHierarchyLocked: boolean;
  heldCaseFile: CaseResolverFile | null;

  // Actions
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
  isHeldCaseAncestorOf: (candidateCaseId: string) => boolean;

  // Icons
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
    throw internalError(
      'useCaseListNodeRuntimeContext must be used within a CaseListNodeRuntimeProvider'
    );
  }
  return context;
}
