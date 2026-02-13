'use client';

import React from 'react';

import type { PromptExploderParserTuningRuleDraft } from '@/features/prompt-exploder/parser-tuning';

type PromptExploderParserTuningContextValue = {
  drafts: PromptExploderParserTuningRuleDraft[];
  onPatchDraft: (
    ruleId: PromptExploderParserTuningRuleDraft['id'],
    patch: Partial<PromptExploderParserTuningRuleDraft>
  ) => void;
  onSave: () => void;
  onResetToPackDefaults: () => void;
  onOpenValidationPatterns: () => void;
  isBusy: boolean;
};

const PromptExploderParserTuningContext = React.createContext<PromptExploderParserTuningContextValue | null>(null);

export function PromptExploderParserTuningProvider({
  value,
  children,
}: {
  value: PromptExploderParserTuningContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <PromptExploderParserTuningContext.Provider value={value}>
      {children}
    </PromptExploderParserTuningContext.Provider>
  );
}

export function usePromptExploderParserTuningContext(): PromptExploderParserTuningContextValue {
  const context = React.useContext(PromptExploderParserTuningContext);
  if (!context) {
    throw new Error('usePromptExploderParserTuningContext must be used inside PromptExploderParserTuningProvider');
  }
  return context;
}
