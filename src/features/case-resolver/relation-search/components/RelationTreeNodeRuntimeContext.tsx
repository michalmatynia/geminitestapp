'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { RelationBrowserMode, RelationTreeLookup } from '../types';

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

const {
  Context: RelationTreeNodeRuntimeContext,
  useStrictContext: useRelationTreeNodeRuntimeContext,
} = createStrictContext<RelationTreeNodeRuntimeContextValue>({
  hookName: 'useRelationTreeNodeRuntimeContext',
  providerName: 'a RelationTreeNodeRuntimeProvider',
  displayName: 'RelationTreeNodeRuntimeContext',
  errorFactory: internalError,
});

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

export { useRelationTreeNodeRuntimeContext };
