'use client';

import React, { createContext, useContext } from 'react';

import type { MarkdownToolbarActionHandlers as MarkdownToolbarActionsContextValue } from '@/features/document-editor/components/MarkdownToolbar';
import { internalError } from '@/shared/errors/app-error';

export type { MarkdownToolbarActionsContextValue };

const MarkdownToolbarActionsContext = createContext<MarkdownToolbarActionsContextValue | null>(
  null
);

type MarkdownToolbarActionsProviderProps = {
  value: MarkdownToolbarActionsContextValue;
  children: React.ReactNode;
};

export function MarkdownToolbarActionsProvider({
  value,
  children,
}: MarkdownToolbarActionsProviderProps): React.JSX.Element {
  return (
    <MarkdownToolbarActionsContext.Provider value={value}>
      {children}
    </MarkdownToolbarActionsContext.Provider>
  );
}

export function useMarkdownToolbarActions(): MarkdownToolbarActionsContextValue {
  const context = useContext(MarkdownToolbarActionsContext);
  if (!context) {
    throw internalError(
      'useMarkdownToolbarActions must be used within MarkdownToolbarActionsProvider'
    );
  }
  return context;
}
