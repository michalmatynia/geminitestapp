'use client';

import { createContext } from 'react';

import type { PromptEngineSettings } from '@/shared/contracts/prompt-engine';
import type {
  PromptExploderRuntimeValidationScope,
  PromptExploderValidationRuleStack,
  PromptExploderSegmentationLibraryState,
} from '@/shared/contracts/prompt-exploder';
import type { ValidatorPatternList } from '@/shared/contracts/validator';

import {
  parsePromptExploderSettings,
  type PromptExploderSettingsValidationError,
} from '../../settings';


export interface SettingsCoreState {
  promptSettings: PromptEngineSettings;
  promptExploderSettings: ReturnType<typeof parsePromptExploderSettings>;
  promptExploderSettingsValidationError: PromptExploderSettingsValidationError | null;
  validatorPatternLists: ValidatorPatternList[];
  incomingBridgeSource: string | null;
  activeValidationScope: PromptExploderRuntimeValidationScope;
  activeValidationRuleStack: PromptExploderValidationRuleStack;
  segmentationLibrary: PromptExploderSegmentationLibraryState;
  isInitialLoading: boolean;
  isRefreshing: boolean;
}

export const SettingsCoreContext = createContext<SettingsCoreState | null>(null);
