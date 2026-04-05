'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

const {
  Context: CaseResolverTreeNodeRuntimeContext,
  useStrictContext: useCaseResolverTreeNodeRuntimeContext,
} = createStrictContext<CaseResolverTreeNodeRuntimeContextValue>({
  hookName: 'useCaseResolverTreeNodeRuntimeContext',
  providerName: 'a CaseResolverTreeNodeRuntimeProvider',
  displayName: 'CaseResolverTreeNodeRuntimeContext',
  errorFactory: internalError,
});

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

export { useCaseResolverTreeNodeRuntimeContext };
