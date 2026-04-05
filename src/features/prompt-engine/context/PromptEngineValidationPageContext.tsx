'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { PromptValidationScope } from '@/shared/lib/prompt-engine/settings';

import type { ExploderPatternSubTab, PatternCollectionTab } from './PromptEngineContext';

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

export const {
  Context: PromptEngineValidationPageContext,
  useOptionalContext: useOptionalPromptEngineValidationPageContext,
} = createStrictContext<PromptEngineValidationPageContextValue>({
  hookName: 'usePromptEngineValidationPageContext',
  providerName: 'a PromptEngineValidationPageProvider',
  displayName: 'PromptEngineValidationPageContext',
});

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
