'use client';

import { createContext } from 'react';
import type { ValidatorPatternList } from '@/shared/contracts/validator';
import type { PromptEngineSettings } from '@/shared/contracts/prompt-engine';
import {
  parsePromptExploderSettings,
  type PromptExploderSettingsValidationError,
} from '../../settings';

import type {
  PromptExploderRuntimeValidationScope,
  PromptExploderValidationRuleStack,
  PromptExploderSegmentationLibraryState,
} from '@/shared/contracts/prompt-exploder';

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
