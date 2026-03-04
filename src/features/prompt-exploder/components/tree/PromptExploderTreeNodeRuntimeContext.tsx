'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

type PromptExploderTreeNodeRuntimeContextValue = {
  armDragHandle: (nodeId: string) => void;
  releaseDragHandle: () => void;
};

const PromptExploderTreeNodeRuntimeContext =
  createContext<PromptExploderTreeNodeRuntimeContextValue | null>(null);

export function PromptExploderTreeNodeRuntimeProvider({
  value,
  children,
}: {
  value: PromptExploderTreeNodeRuntimeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <PromptExploderTreeNodeRuntimeContext.Provider value={value}>
      {children}
    </PromptExploderTreeNodeRuntimeContext.Provider>
  );
}

export function usePromptExploderTreeNodeRuntimeContext(): PromptExploderTreeNodeRuntimeContextValue {
  const context = useContext(PromptExploderTreeNodeRuntimeContext);
  if (!context) {
    throw internalError(
      'usePromptExploderTreeNodeRuntimeContext must be used within a PromptExploderTreeNodeRuntimeProvider'
    );
  }
  return context;
}
