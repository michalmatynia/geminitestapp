'use client';

import React from 'react';

import type { PromptExploderListItem } from '../types';
import { internalError } from '@/shared/errors/app-error';

type PromptExploderHierarchyTreeContextValue = {
  items: PromptExploderListItem[];
  onChange: (nextItems: PromptExploderListItem[]) => void;
  emptyLabel: string;
  renderLogicalEditor?: (args: {
    item: PromptExploderListItem;
    onChange: (updater: (item: PromptExploderListItem) => PromptExploderListItem) => void;
  }) => React.ReactNode;
};

const PromptExploderHierarchyTreeContext =
  React.createContext<PromptExploderHierarchyTreeContextValue | null>(null);

export function PromptExploderHierarchyTreeProvider({
  value,
  children,
}: {
  value: PromptExploderHierarchyTreeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <PromptExploderHierarchyTreeContext.Provider value={value}>
      {children}
    </PromptExploderHierarchyTreeContext.Provider>
  );
}

export function usePromptExploderHierarchyTreeContext(): PromptExploderHierarchyTreeContextValue {
  const context = React.useContext(PromptExploderHierarchyTreeContext);
  if (!context) {
    throw internalError(
      'usePromptExploderHierarchyTreeContext must be used inside PromptExploderHierarchyTreeProvider'
    );
  }
  return context;
}
