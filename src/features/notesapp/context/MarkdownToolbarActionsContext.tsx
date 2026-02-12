'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

export type MarkdownToolbarActionsContextValue = {
  onApplyWrap: (prefix: string, suffix: string, placeholder: string) => void;
  onApplyLinePrefix: (prefix: string) => void;
  onInsertAtCursor: (value: string) => void;
  onApplyBulletList: () => void;
  onApplyChecklist: () => void;
  onApplySpanStyle: (color: string, font: string) => void;
};

const MarkdownToolbarActionsContext = createContext<MarkdownToolbarActionsContextValue | null>(null);

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
    throw internalError('useMarkdownToolbarActions must be used within MarkdownToolbarActionsProvider');
  }
  return context;
}
