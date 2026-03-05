'use client';

import { createContext } from 'react';
import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
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
