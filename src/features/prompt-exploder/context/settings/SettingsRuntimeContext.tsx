'use client';

import { createContext, useContext } from 'react';
import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
import type { PromptValidationOrchestrationResult } from '../../prompt-validation-orchestrator';
import type { PromptExploderLearnedTemplate } from '../../types';
import type {
  PromptExploderRuntimeValidationScope,
  PromptExploderValidationRuleStack,
} from '@/shared/contracts/prompt-exploder';

import type { PromptExploderSegmentationReturnTarget } from '@/shared/contracts/prompt-exploder';

export interface SettingsRuntimeState {
  activeValidationScope: PromptExploderRuntimeValidationScope;
  activeValidationRuleStack: PromptExploderValidationRuleStack;
  scopedRules: PromptValidationRule[];
  effectiveRules: PromptValidationRule[];
  runtimeValidationRules: PromptValidationRule[];
  effectiveLearnedTemplates: PromptExploderLearnedTemplate[];
  runtimeLearnedTemplates: PromptExploderLearnedTemplate[];
  runtimeGuardrailIssue: string | null;
  returnTarget: PromptExploderSegmentationReturnTarget;
  applyToDrafts: boolean;
}

export const SettingsRuntimeContext = createContext<SettingsRuntimeState | null>(null);

export function useSettingsRuntime(): SettingsRuntimeState {
  const context = useContext(SettingsRuntimeContext);
  if (!context) throw new Error('useSettingsRuntime must be used within SettingsProvider');
  return context;
}
