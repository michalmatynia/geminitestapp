'use client';

import { createContext, useContext } from 'react';
import type { CaseResolverTreeIconComponent as CaseResolverTreeNodeIconComponent } from './tree-node-icon';

export type { CaseResolverTreeNodeIconComponent };

export interface CaseResolverTreeNodeRuntimeContextValue {
  armDragHandle: (nodeId: string) => void;
  releaseDragHandle: () => void;
  renameDraft: string;
  onUpdateRenameDraft: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  FolderClosedIcon: CaseResolverTreeNodeIconComponent;
  FolderOpenIcon: CaseResolverTreeNodeIconComponent;
  DefaultFileIcon: CaseResolverTreeNodeIconComponent;
  ScanCaseFileIcon: CaseResolverTreeNodeIconComponent;
  NodeFileIcon: CaseResolverTreeNodeIconComponent;
  ImageFileIcon: CaseResolverTreeNodeIconComponent;
  PdfFileIcon: CaseResolverTreeNodeIconComponent;
  DragHandleIcon: CaseResolverTreeNodeIconComponent;
}

const CaseResolverTreeNodeRuntimeContext =
  createContext<CaseResolverTreeNodeRuntimeContextValue | null>(null);

export function CaseResolverTreeNodeRuntimeProvider({
  value,
  children,
}: {
  value: CaseResolverTreeNodeRuntimeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <CaseResolverTreeNodeRuntimeContext.Provider value={value}>
      {children}
    </CaseResolverTreeNodeRuntimeContext.Provider>
  );
}

export function useCaseResolverTreeNodeRuntimeContext(): CaseResolverTreeNodeRuntimeContextValue {
  const context = useContext(CaseResolverTreeNodeRuntimeContext);
  if (!context) {
    throw new Error(
      'useCaseResolverTreeNodeRuntimeContext must be used within a CaseResolverTreeNodeRuntimeProvider'
    );
  }
  return context;
}
