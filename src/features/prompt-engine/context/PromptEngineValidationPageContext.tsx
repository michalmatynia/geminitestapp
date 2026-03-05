'use client';

import React from 'react';

import type { ExploderPatternSubTab, PatternCollectionTab } from './PromptEngineContext';
import type { PromptValidationScope } from '@/shared/lib/prompt-engine/settings';

type PromptEngineScopeFilter = PromptValidationScope | 'all';

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
  initialScope?: PromptEngineScopeFilter;
  lockedScope?: PromptEngineScopeFilter;
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

export function useOptionalPromptEngineValidationPageContext(): PromptEngineValidationPageContextValue | null {
  return React.useContext(PromptEngineValidationPageContext);
}
