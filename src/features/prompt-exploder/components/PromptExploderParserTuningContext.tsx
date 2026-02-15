'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  SettingsActionsContext,
  SettingsStateContext,
} from '@/features/prompt-exploder/context/SettingsContext';
import type { PromptExploderParserTuningRuleDraft } from '@/features/prompt-exploder/parser-tuning';
import { promptExploderValidatorScopeFromStack } from '@/features/prompt-exploder/validation-stack';

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
  value?: PromptExploderParserTuningContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const settingsState = React.useContext(SettingsStateContext);
  const settingsActions = React.useContext(SettingsActionsContext);

  const resolvedValue = React.useMemo<PromptExploderParserTuningContextValue>(() => {
    if (value) return value;

    if (!settingsState || !settingsActions) {
      throw new Error(
        'PromptExploderParserTuningProvider requires either an explicit value prop or SettingsProvider context.'
      );
    }

    return {
      drafts: settingsState.parserTuningDrafts,
      onPatchDraft: settingsActions.patchParserTuningDraft,
      onSave: () => {
        void settingsActions.handleSaveParserTuningRules();
      },
      onResetToPackDefaults: settingsActions.handleResetParserTuningDrafts,
      onOpenValidationPatterns: () => {
        const validatorScope = promptExploderValidatorScopeFromStack(
          settingsState.activeValidationRuleStack
        );
        router.push(`/admin/validator?scope=${validatorScope}`);
      },
      isBusy: settingsState.isBusy,
    };
  }, [router, settingsActions, settingsState, value]);

  return (
    <PromptExploderParserTuningContext.Provider value={resolvedValue}>
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
