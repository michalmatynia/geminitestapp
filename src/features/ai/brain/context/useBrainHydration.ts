'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  catalogToEntries,
  hasCatalogPoolEntries,
  appendCatalogPoolValues,
} from '@/shared/lib/ai-brain/catalog-entries';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { type Toast } from '@/shared/contracts/ui/base';

import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  parseBrainProviderCatalog,
  sanitizeBrainProviderCatalog,
  type AiBrainFeature,
  type AiBrainProviderCatalog,
  type AiBrainSettings,
} from '../settings';

import {
  AI_INSIGHTS_SETTINGS_KEYS,
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
  buildBrainOverridesEnabled,
  parseNumberSetting,
  parsePlaywrightPersonaIds,
} from './brain-runtime-shared';

interface BrainHydrationParams {
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
  toast: Toast;
}

interface BrainHydrationResult {
  hydrateBrainRoutingSettings: (settings: AiBrainSettings) => void;
  hydrateFromSettingsMap: (map: Map<string, string>) => void;
}

export function useBrainHydration(params: BrainHydrationParams): BrainHydrationResult {
  const { toast, setSettings, setProviderCatalog, setOverridesEnabled } = params;

  const hydrateBrainRoutingSettings = useCallback((settings: AiBrainSettings): void => {
    setSettings(settings);
    setOverridesEnabled(buildBrainOverridesEnabled(settings));
  }, [setSettings, setOverridesEnabled]);

  const parseAndSetCatalog = useCallback((raw: string | null, map: Map<string, string>): void => {
    try {
      const parsed = parseBrainProviderCatalog(raw);
      const ids = parsePlaywrightPersonaIds(map.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY));
      const entries = catalogToEntries(parsed);
      const merged = !hasCatalogPoolEntries(entries, 'playwrightPersonas') && ids.length > 0
        ? appendCatalogPoolValues(entries, 'playwrightPersonas', ids) : entries;
      setProviderCatalog(sanitizeBrainProviderCatalog({ ...parsed, entries: merged }));
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'BrainContext', action: 'hydrateProviderCatalog', settingKey: AI_BRAIN_PROVIDER_CATALOG_KEY,
      });
      toast(error instanceof Error ? error.message : 'Invalid provider catalog.', { variant: 'error' });
    }
  }, [setProviderCatalog, toast]);

  const hydrateInsights = useCallback((map: Map<string, string>): void => {
    params.setAnalyticsScheduleEnabled(false);
    params.setAnalyticsScheduleMinutes((p) => parseNumberSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes), p, 5));
    params.setRuntimeAnalyticsScheduleEnabled(false);
    params.setRuntimeAnalyticsScheduleMinutes((p) => parseNumberSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleMinutes), p, 5));
    params.setLogsScheduleEnabled(false);
    params.setLogsScheduleMinutes((p) => parseNumberSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes), p, 5));
    params.setLogsAutoOnError(false);
    params.setAnalyticsPromptSystem(map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem) ?? DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
    params.setRuntimeAnalyticsPromptSystem(map.get(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem) ?? DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
    params.setLogsPromptSystem(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem) ?? DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT);
  }, [params]);

  const hydrateFromSettingsMap = useCallback((map: Map<string, string>): void => {
    parseAndSetCatalog(map.get(AI_BRAIN_PROVIDER_CATALOG_KEY) ?? null, map);
    params.setOpenaiApiKey(map.get('openai_api_key') ?? '');
    params.setAnthropicApiKey(map.get('anthropic_api_key') ?? '');
    params.setGeminiApiKey(map.get('gemini_api_key') ?? '');
    hydrateInsights(map);
  }, [params, parseAndSetCatalog, hydrateInsights]);

  return { hydrateBrainRoutingSettings, hydrateFromSettingsMap };
}
