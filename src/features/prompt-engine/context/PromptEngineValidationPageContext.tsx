'use client';

import React from 'react';

import type { ExploderPatternSubTab, PatternCollectionTab } from './PromptEngineContext';

export type PromptEngineValidationPageContextValue = {
  embedded?: boolean;
  onSaved?: () => void;
  eyebrow?: string;
  backLinkHref?: string;
  backLinkLabel?: string;
  initialPatternTab?: PatternCollectionTab;
  initialExploderSubTab?: ExploderPatternSubTab;
  lockedPatternTab?: PatternCollectionTab;
  lockedExploderSubTab?: ExploderPatternSubTab;
};

const PromptEngineValidationPageContext =
  React.createContext<PromptEngineValidationPageContextValue | null>(null);

type PromptEngineValidationPageProviderProps = {
  value: PromptEngineValidationPageContextValue;
  children: React.ReactNode;
};

export function PromptEngineValidationPageProvider({
  value,
  children,
}: PromptEngineValidationPageProviderProps): React.JSX.Element {
  return (
    <PromptEngineValidationPageContext.Provider value={value}>
      {children}
    </PromptEngineValidationPageContext.Provider>
  );
}

export function usePromptEngineValidationPageContext(): PromptEngineValidationPageContextValue {
  const context = React.useContext(PromptEngineValidationPageContext);
  if (!context) {
    throw new Error(
      'usePromptEngineValidationPageContext must be used within PromptEngineValidationPageProvider'
    );
  }
  return context;
}
