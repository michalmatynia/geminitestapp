'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_BRAIN_OVERRIDES_ENABLED,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from './brain-runtime-shared';
import {
  defaultBrainProviderCatalog,
  defaultBrainSettings,
  type AiBrainFeature,
  type AiBrainProviderCatalog,
  type AiBrainSettings,
} from '../settings';

interface BrainResetParams {
  hydrateFromSettingsMap: (map: Map<string, string>) => void;
  setAnalyticsPromptSystem: Dispatch<SetStateAction<string>>;
  setAnalyticsScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  setAnalyticsScheduleMinutes: Dispatch<SetStateAction<number>>;
  setAnthropicApiKey: Dispatch<SetStateAction<string>>;
  setGeminiApiKey: Dispatch<SetStateAction<string>>;
  setLogsAutoOnError: Dispatch<SetStateAction<boolean>>;
  setLogsPromptSystem: Dispatch<SetStateAction<string>>;
  setLogsScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  setLogsScheduleMinutes: Dispatch<SetStateAction<number>>;
  setOpenaiApiKey: Dispatch<SetStateAction<string>>;
  setOverridesEnabled: Dispatch<SetStateAction<Record<AiBrainFeature, boolean>>>;
  setProviderCatalog: Dispatch<SetStateAction<AiBrainProviderCatalog>>;
  setRuntimeAnalyticsPromptSystem: Dispatch<SetStateAction<string>>;
  setRuntimeAnalyticsScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  setRuntimeAnalyticsScheduleMinutes: Dispatch<SetStateAction<number>>;
  setSettings: Dispatch<SetStateAction<AiBrainSettings>>;
  settingsMap: Map<string, string> | undefined;
}

interface BrainResetResult {
  handleReset: () => void;
}

export function useBrainResetAction(params: BrainResetParams): BrainResetResult {
  const handleReset = useCallback((): void => {
    if (params.settingsMap) {
      params.hydrateFromSettingsMap(params.settingsMap);
      return;
    }
    params.setSettings(defaultBrainSettings);
    params.setOverridesEnabled(DEFAULT_BRAIN_OVERRIDES_ENABLED);
    params.setProviderCatalog(defaultBrainProviderCatalog);
    params.setOpenaiApiKey('');
    params.setAnthropicApiKey('');
    params.setGeminiApiKey('');
    params.setAnalyticsScheduleEnabled(true);
    params.setAnalyticsScheduleMinutes(30);
    params.setRuntimeAnalyticsScheduleEnabled(true);
    params.setRuntimeAnalyticsScheduleMinutes(30);
    params.setLogsScheduleEnabled(true);
    params.setLogsScheduleMinutes(15);
    params.setLogsAutoOnError(true);
    params.setAnalyticsPromptSystem(DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
    params.setRuntimeAnalyticsPromptSystem(DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
    params.setLogsPromptSystem(DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT);
  }, [params]);

  return { handleReset };
}
