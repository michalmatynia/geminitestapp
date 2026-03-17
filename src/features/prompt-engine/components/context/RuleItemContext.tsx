'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';
import type {
  PromptValidationRule,
  PromptValidationSimilarPattern,
  PromptAutofixOperation,
} from '@/shared/lib/prompt-engine/settings';

import { usePromptEngineActions } from '../../context/PromptEngineContext';
import {
  updateSimilarInRule,
  removeSimilarFromRule,
  addSimilarToRule,
  updateAutofixOperationInRule,
  removeAutofixOperationFromRule,
  addAutofixOperationToRule,
} from '../rule-item-mutations';

import type { RuleDraft } from '../../context/prompt-engine-context-utils';


interface RuleItemStateContextValue {
  draft: RuleDraft;
  rule: PromptValidationRule | null;
}

interface RuleItemActionsContextValue {
  patchRule: (patch: Partial<PromptValidationRule>) => void;
  updateSimilar: (index: number, patch: Partial<PromptValidationSimilarPattern>) => void;
  removeSimilar: (index: number) => void;
  addSimilar: () => void;
  updateAutofixOperation: (index: number, operation: PromptAutofixOperation) => void;
  removeAutofixOperation: (index: number) => void;
  addAutofixOperation: (kind: PromptAutofixOperation['kind']) => void;
}

type RuleItemContextValue = RuleItemStateContextValue & RuleItemActionsContextValue;

const RuleItemStateContext = createContext<RuleItemStateContextValue | null>(null);
const RuleItemActionsContext = createContext<RuleItemActionsContextValue | null>(null);

export function useRuleItemState(): RuleItemStateContextValue {
  const context = useContext(RuleItemStateContext);
  if (!context) {
    throw internalError('useRuleItemState must be used within a RuleItemProvider');
  }
  return context;
}

export function useRuleItemActions(): RuleItemActionsContextValue {
  const context = useContext(RuleItemActionsContext);
  if (!context) {
    throw internalError('useRuleItemActions must be used within a RuleItemProvider');
  }
  return context;
}

export function useRuleItemContext(): RuleItemContextValue {
  const state = useRuleItemState();
  const actions = useRuleItemActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
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

  const stateValue = useMemo(
    (): RuleItemStateContextValue => ({
      draft,
      rule,
    }),
    [draft, rule]
  );
  const actionsValue = useMemo(
    (): RuleItemActionsContextValue => ({
      patchRule,
      updateSimilar,
      removeSimilar,
      addSimilar,
      updateAutofixOperation,
      removeAutofixOperation,
      addAutofixOperation,
    }),
    [
      patchRule,
      updateSimilar,
      removeSimilar,
      addSimilar,
      updateAutofixOperation,
      removeAutofixOperation,
      addAutofixOperation,
    ]
  );

  return (
    <RuleItemActionsContext.Provider value={actionsValue}>
      <RuleItemStateContext.Provider value={stateValue}>{children}</RuleItemStateContext.Provider>
    </RuleItemActionsContext.Provider>
  );
}
