'use client';

import { createContext, useContext } from 'react';
import type { ValidatorPatternList } from '@/shared/contracts/validator';
import type { PromptEngineSettings } from '@/shared/contracts/prompt-engine';
import { parsePromptExploderSettings } from '../../settings';

export interface SettingsCoreState {
  settingsMap: Map<string, string>;
  validatorPatternLists: ValidatorPatternList[];
  promptSettings: PromptEngineSettings;
  promptExploderSettings: ReturnType<typeof parsePromptExploderSettings>;
  isBusy: boolean;
}

export const SettingsCoreContext = createContext<SettingsCoreState | null>(null);

export function useSettingsCore(): SettingsCoreState {
  const context = useContext(SettingsCoreContext);
  if (!context) throw new Error('useSettingsCore must be used within SettingsProvider');
  return context;
}
