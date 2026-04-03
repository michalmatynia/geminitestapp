'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { PromptExploderListItem } from '../types';

export type PromptExploderHierarchyTreeContextValue = {
  items: PromptExploderListItem[];
  onChange: (nextItems: PromptExploderListItem[]) => void;
  emptyLabel: string;
  renderLogicalEditor?: (args: {
    item: PromptExploderListItem;
    onChange: (updater: (item: PromptExploderListItem) => PromptExploderListItem) => void;
  }) => React.ReactNode;
};

const {
  Context: PromptExploderHierarchyTreeContext,
  useStrictContext: usePromptExploderHierarchyTreeContext,
} = createStrictContext<PromptExploderHierarchyTreeContextValue>({
  hookName: 'usePromptExploderHierarchyTreeContext',
  providerName: 'PromptExploderHierarchyTreeProvider',
  displayName: 'PromptExploderHierarchyTreeContext',
  errorFactory: () =>
    internalError(
      'usePromptExploderHierarchyTreeContext must be used inside PromptExploderHierarchyTreeProvider'
    ),
});

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

export { usePromptExploderHierarchyTreeContext };
