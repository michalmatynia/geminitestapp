'use client';

import React, { createContext, useContext } from 'react';
import type { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';
import type { MasterFolderTreeProps } from './MasterFolderTree';

export type MasterFolderTreeContextValue = MasterFolderTreeProps & {
  resolveDraggedNode: (event: React.DragEvent<HTMLElement>) => string | null;
  resolveDropAllowance: (
    draggedNodeId: string,
    targetId: string | null,
    position: 'before' | 'after' | 'inside'
  ) => boolean;
  resolveNodeDropPosition: (
    event: React.DragEvent<HTMLDivElement>,
    draggedNodeId: string,
    targetNode: MasterTreeViewNode
  ) => 'before' | 'after' | 'inside' | null;
  clearAllDragState: () => void;
  applyRootDrop: (draggedNodeId: string, rootDropZone?: 'top' | 'bottom') => Promise<void>;
  setExternalDraggedNodeId: (id: string | null) => void;
  setRootDropHoverZone: (zone: 'top' | 'bottom' | null) => void;
  rootDropHoverZone: 'top' | 'bottom' | null;
  clearDragIndicators: () => void;
};

const MasterFolderTreeContext = createContext<MasterFolderTreeContextValue | null>(null);

export function MasterFolderTreeProvider({
  value,
  children,
}: {
  value: MasterFolderTreeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <MasterFolderTreeContext.Provider value={value}>
      {children}
    </MasterFolderTreeContext.Provider>
  );
}

export function useMasterFolderTreeContext(): MasterFolderTreeContextValue {
  const context = useContext(MasterFolderTreeContext);
  if (!context) {
    throw new Error('useMasterFolderTreeContext must be used within MasterFolderTreeProvider');
  }
  return context;
}
