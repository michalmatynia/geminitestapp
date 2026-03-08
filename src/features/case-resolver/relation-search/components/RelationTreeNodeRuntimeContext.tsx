'use client';

import { createContext, useContext } from 'react';

import type { RelationBrowserMode, RelationTreeLookup } from '../types';
import { internalError } from '@/shared/errors/app-error';

export interface RelationTreeNodeRuntimeContextValue {
  mode: RelationBrowserMode;
  lookup: RelationTreeLookup;
  isLocked: boolean;
  selectedFileIds?: Set<string> | undefined;
  onToggleFileSelection?: ((fileId: string) => void) | undefined;
  onLinkFile?: ((fileId: string) => void) | undefined;
  onAddFile?: ((fileId: string) => void) | undefined;
  onPreviewFile?: ((fileId: string) => void) | undefined;
  onArmDragHandle?: ((fileId: string) => void) | undefined;
}

const RelationTreeNodeRuntimeContext = createContext<RelationTreeNodeRuntimeContextValue | null>(
  null
);

export function RelationTreeNodeRuntimeProvider({
  value,
  children,
}: {
  value: RelationTreeNodeRuntimeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <RelationTreeNodeRuntimeContext.Provider value={value}>
      {children}
    </RelationTreeNodeRuntimeContext.Provider>
  );
}

export function useRelationTreeNodeRuntimeContext(): RelationTreeNodeRuntimeContextValue {
  const context = useContext(RelationTreeNodeRuntimeContext);
  if (!context) {
    throw internalError(
      'useRelationTreeNodeRuntimeContext must be used within a RelationTreeNodeRuntimeProvider'
    );
  }
  return context;
}
