'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import type { RuleDraft } from '../../context/prompt-engine-context-utils';
import type {
  PromptValidationRule,
  PromptValidationSimilarPattern,
  PromptAutofixOperation,
} from '@/shared/lib/prompt-engine/settings';
import {
  updateSimilarInRule,
  removeSimilarFromRule,
  addSimilarToRule,
  updateAutofixOperationInRule,
  removeAutofixOperationFromRule,
  addAutofixOperationToRule,
} from '../rule-item-mutations';
import { usePromptEngineActions } from '../../context/prompt-engine/PromptEngineActionsContext';

interface RuleItemContextValue {
  draft: RuleDraft;
  rule: PromptValidationRule | null;
  patchRule: (patch: Partial<PromptValidationRule>) => void;
  updateSimilar: (index: number, patch: Partial<PromptValidationSimilarPattern>) => void;
  removeSimilar: (index: number) => void;
  addSimilar: () => void;
  updateAutofixOperation: (index: number, operation: PromptAutofixOperation) => void;
  removeAutofixOperation: (index: number) => void;
  addAutofixOperation: (kind: PromptAutofixOperation['kind']) => void;
}

const RuleItemContext = createContext<RuleItemContextValue | null>(null);

export function useRuleItemContext(): RuleItemContextValue {
  const context = useContext(RuleItemContext);
  if (!context) {
    throw new Error('useRuleItemContext must be used within a RuleItemProvider');
  }
  return context;
}

interface RuleItemProviderProps {
  draft: RuleDraft;
  children: React.ReactNode;
}

export function RuleItemProvider({ draft, children }: RuleItemProviderProps): React.JSX.Element {
  const { handlePatchRule } = usePromptEngineActions();
  const rule = draft.parsed;

  const patchRule = useCallback(
    (patch: Partial<PromptValidationRule>): void => {
      if (!rule) return;
      handlePatchRule(draft.uid, patch);
    },
    [draft.uid, handlePatchRule, rule]
  );

  const updateSimilar = useCallback(
    (index: number, patch: Partial<PromptValidationSimilarPattern>): void => {
      updateSimilarInRule(rule, patchRule, index, patch);
    },
    [rule, patchRule]
  );

  const removeSimilar = useCallback(
    (index: number): void => {
      removeSimilarFromRule(rule, patchRule, index);
    },
    [rule, patchRule]
  );

  const addSimilar = useCallback((): void => {
    addSimilarToRule(rule, patchRule);
  }, [rule, patchRule]);

  const updateAutofixOperation = useCallback(
    (index: number, operation: PromptAutofixOperation): void => {
      updateAutofixOperationInRule(rule, patchRule, index, operation);
    },
    [rule, patchRule]
  );

  const removeAutofixOperation = useCallback(
    (index: number): void => {
      removeAutofixOperationFromRule(rule, patchRule, index);
    },
    [rule, patchRule]
  );

  const addAutofixOperation = useCallback(
    (kind: PromptAutofixOperation['kind']): void => {
      addAutofixOperationToRule(rule, patchRule, kind);
    },
    [rule, patchRule]
  );

  const value = useMemo(
    () => ({
      draft,
      rule,
      patchRule,
      updateSimilar,
      removeSimilar,
      addSimilar,
      updateAutofixOperation,
      removeAutofixOperation,
      addAutofixOperation,
    }),
    [
      draft,
      rule,
      patchRule,
      updateSimilar,
      removeSimilar,
      addSimilar,
      updateAutofixOperation,
      removeAutofixOperation,
      addAutofixOperation,
    ]
  );

  return <RuleItemContext.Provider value={value}>{children}</RuleItemContext.Provider>;
}
