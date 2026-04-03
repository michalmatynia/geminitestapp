'use client';

import React from 'react';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type NotesAppTreeNodeRuntimeContextValue = {
  controller: MasterFolderTreeController;
  FolderClosedIcon: React.ComponentType<{ className?: string }>;
  FolderOpenIcon: React.ComponentType<{ className?: string }>;
  FileIcon: React.ComponentType<{ className?: string }>;
  DragHandleIcon: React.ComponentType<{ className?: string }>;
};

const {
  Context: NotesAppTreeNodeRuntimeContext,
  useStrictContext: useNotesAppTreeNodeRuntimeContext,
} = createStrictContext<NotesAppTreeNodeRuntimeContextValue>({
  hookName: 'useNotesAppTreeNodeRuntimeContext',
  providerName: 'a NotesAppTreeNodeRuntimeProvider',
  displayName: 'NotesAppTreeNodeRuntimeContext',
  errorFactory: internalError,
});

export function NotesAppTreeNodeRuntimeProvider({
  value,
  children,
}: {
  value: NotesAppTreeNodeRuntimeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <NotesAppTreeNodeRuntimeContext.Provider value={value}>
      {children}
    </NotesAppTreeNodeRuntimeContext.Provider>
  );
}

export { useNotesAppTreeNodeRuntimeContext };
