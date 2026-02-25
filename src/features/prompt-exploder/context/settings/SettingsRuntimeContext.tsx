'use client';

import { createContext, useContext } from 'react';
import type { PromptValidationRule } from '@/features/prompt-engine/settings';
import type { 
  PromptValidationOrchestrationResult 
} from '../../prompt-validation-orchestrator';
import type { 
  PromptExploderLearnedTemplate 
} from '../../types';
import type { 
  PromptExploderRuntimeValidationScope, 
  PromptExploderValidationRuleStack 
} from '../../validation-stack';

export interface SettingsRuntimeState {
  activeValidationScope: PromptExploderRuntimeValidationScope;
  activeValidationRuleStack: PromptExploderValidationRuleStack;
  runtimeSelection: PromptValidationOrchestrationResult;
  runtimeGuardrailIssue: string | null;
  scopedRules: PromptValidationRule[];
  effectiveRules: PromptValidationRule[];
  runtimeValidationRules: PromptValidationRule[];
  effectiveLearnedTemplates: PromptExploderLearnedTemplate[];
  runtimeLearnedTemplates: PromptExploderLearnedTemplate[];
  templateMergeThreshold: number;
}

export const SettingsRuntimeContext = createContext<SettingsRuntimeState | null>(null);

export function useSettingsRuntime(): SettingsRuntimeState {
  const context = useContext(SettingsRuntimeContext);
  if (!context) throw new Error('useSettingsRuntime must be used within SettingsProvider');
  return context;
}
