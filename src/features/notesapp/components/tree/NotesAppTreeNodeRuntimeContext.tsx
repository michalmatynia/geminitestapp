'use client';

import React, { createContext, useContext } from 'react';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import { internalError } from '@/shared/errors/app-error';

export type NotesAppTreeNodeRuntimeContextValue = {
  controller: MasterFolderTreeController;
  FolderClosedIcon: React.ComponentType<{ className?: string }>;
  FolderOpenIcon: React.ComponentType<{ className?: string }>;
  FileIcon: React.ComponentType<{ className?: string }>;
  DragHandleIcon: React.ComponentType<{ className?: string }>;
};

const NotesAppTreeNodeRuntimeContext = createContext<NotesAppTreeNodeRuntimeContextValue | null>(
  null
);

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

export function useNotesAppTreeNodeRuntimeContext(): NotesAppTreeNodeRuntimeContextValue {
  const context = useContext(NotesAppTreeNodeRuntimeContext);
  if (!context) {
    throw internalError(
      'useNotesAppTreeNodeRuntimeContext must be used within a NotesAppTreeNodeRuntimeProvider'
    );
  }
  return context;
}
