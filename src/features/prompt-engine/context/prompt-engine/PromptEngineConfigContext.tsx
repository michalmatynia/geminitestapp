'use client';

import { createContext, useContext } from 'react';
import type { PromptEngineSettings } from '@/shared/lib/prompt-engine/settings';
import { internalError } from '@/shared/errors/app-error';

export type PatternCollectionTab = 'core' | 'prompt_exploder';
export type ExploderPatternSubTab =
  | 'prompt_exploder_rules'
  | 'image_studio_rules'
  | 'case_resolver_rules';

export interface PromptEngineConfig {
  promptEngineSettings: PromptEngineSettings;
  patternTab: PatternCollectionTab;
  exploderSubTab: ExploderPatternSubTab;
  patternTabLocked: boolean;
  exploderSubTabLocked: boolean;
  scopeLocked: boolean;
  isUsingDefaults: boolean;
}

export const ConfigContext = createContext<PromptEngineConfig | null>(null);

export const usePromptEngineConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) throw internalError('usePromptEngineConfig must be used within PromptEngineProvider');
  return context;
};
