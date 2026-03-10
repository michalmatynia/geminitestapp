'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { SystemSetting } from '@/shared/contracts/settings';
import type { MutationResult, Toast } from '@/shared/contracts/ui';
import {
  appendCatalogPoolValues,
  catalogToEntries,
  hasCatalogPoolEntries,
  replaceCatalogPoolValues,
} from '@/shared/lib/ai-brain/catalog-entries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  AI_INSIGHTS_SETTINGS_KEYS,
  ALL_BRAIN_FEATURE_KEYS,
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_BRAIN_OVERRIDES_ENABLED,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
  REPORT_FEATURE_KEYS,
  getAllowedProvidersForFeature,
  parseBooleanSetting,
  parseNumberSetting,
  parsePlaywrightPersonaIds,
} from './brain-runtime-shared';
import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  AI_BRAIN_SETTINGS_KEY,
  BRAIN_CAPABILITY_KEYS,
  defaultBrainProviderCatalog,
  defaultBrainSettings,
  getBrainCapabilityDefinition,
  parseBrainProviderCatalog,
  parseBrainSettings,
  resolveBrainAssignment,
  sanitizeBrainAssignmentForProviders,
  sanitizeBrainProviderCatalog,
  toPersistedBrainProviderCatalog,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
  type AiBrainProviderCatalog,
  type AiBrainSettings,
} from '../settings';

interface BrainPersistenceParams {
  analyticsPromptSystem: string;
  analyticsScheduleEnabled: boolean;
  analyticsScheduleMinutes: number;
  anthropicApiKey: string;
  geminiApiKey: string;
  logsAutoOnError: boolean;
  logsPromptSystem: string;
  logsScheduleEnabled: boolean;
  logsScheduleMinutes: number;
  openaiApiKey: string;
  overridesEnabled: Record<AiBrainFeature, boolean>;
  providerCatalog: AiBrainProviderCatalog;
  runtimeAnalyticsPromptSystem: string;
  runtimeAnalyticsScheduleEnabled: boolean;
  runtimeAnalyticsScheduleMinutes: number;
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
  settings: AiBrainSettings;
  settingsMap: Map<string, string> | undefined;
  toast: Toast;
  updateSetting: MutationResult<SystemSetting, { key: string; value: string }>;
  updateSettingsBulk: MutationResult<SystemSetting[], Array<{ key: string; value: string }>>;
}

interface BrainPersistenceResult {
  handleReset: () => void;
  handleSave: () => Promise<void>;
  hydrateFromSettingsMap: (map: Map<string, string>) => void;
  saving: boolean;
  syncPlaywrightPersonas: () => void;
}

export function useBrainPersistence({
  analyticsPromptSystem,
  analyticsScheduleEnabled,
  analyticsScheduleMinutes,
  anthropicApiKey,
  geminiApiKey,
  logsAutoOnError,
  logsPromptSystem,
  logsScheduleEnabled,
  logsScheduleMinutes,
  openaiApiKey,
  overridesEnabled,
  providerCatalog,
  runtimeAnalyticsPromptSystem,
  runtimeAnalyticsScheduleEnabled,
  runtimeAnalyticsScheduleMinutes,
  setAnalyticsPromptSystem,
  setAnalyticsScheduleEnabled,
  setAnalyticsScheduleMinutes,
  setAnthropicApiKey,
  setGeminiApiKey,
  setLogsAutoOnError,
  setLogsPromptSystem,
  setLogsScheduleEnabled,
  setLogsScheduleMinutes,
  setOpenaiApiKey,
  setOverridesEnabled,
  setProviderCatalog,
  setRuntimeAnalyticsPromptSystem,
  setRuntimeAnalyticsScheduleEnabled,
  setRuntimeAnalyticsScheduleMinutes,
  setSettings,
  settings,
  settingsMap,
  toast,
  updateSetting,
  updateSettingsBulk,
}: BrainPersistenceParams): BrainPersistenceResult {
  const hydrateFromSettingsMap = useCallback(
    (map: Map<string, string>): void => {
      const rawBrainSettings = map.get(AI_BRAIN_SETTINGS_KEY) ?? null;
      let parsedBrain = defaultBrainSettings;
      try {
        parsedBrain = parseBrainSettings(rawBrainSettings);
      } catch (error: unknown) {
        logClientError(error, {
          context: {
            source: 'BrainContext',
            action: 'hydrateSettings',
            settingKey: AI_BRAIN_SETTINGS_KEY,
          },
        });
        toast(
          error instanceof Error
            ? error.message
            : 'AI Brain settings are invalid and could not be loaded.',
          { variant: 'error' }
        );
        if (rawBrainSettings?.trim()) {
          return;
        }
      }

      const rawProviderCatalog = map.get(AI_BRAIN_PROVIDER_CATALOG_KEY) ?? null;
      let parsedCatalog = defaultBrainProviderCatalog;
      try {
        parsedCatalog = parseBrainProviderCatalog(rawProviderCatalog);
      } catch (error: unknown) {
        logClientError(error, {
          context: {
            source: 'BrainContext',
            action: 'hydrateProviderCatalog',
            settingKey: AI_BRAIN_PROVIDER_CATALOG_KEY,
          },
        });
        toast(
          error instanceof Error
            ? error.message
            : 'AI Brain provider catalog is invalid and could not be loaded.',
          { variant: 'error' }
        );
      }

      const playwrightPersonaIds = parsePlaywrightPersonaIds(
        map.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY)
      );
      const parsedEntries = catalogToEntries(parsedCatalog);
      const mergedEntries =
        !hasCatalogPoolEntries(parsedEntries, 'playwrightPersonas') &&
        playwrightPersonaIds.length > 0
          ? appendCatalogPoolValues(parsedEntries, 'playwrightPersonas', playwrightPersonaIds)
          : parsedEntries;
      const mergedCatalog = sanitizeBrainProviderCatalog({
        ...parsedCatalog,
        entries: mergedEntries,
      });

      setSettings(parsedBrain);
      setProviderCatalog(mergedCatalog);
      setOverridesEnabled({
        ...DEFAULT_BRAIN_OVERRIDES_ENABLED,
        cms_builder: Boolean(parsedBrain.assignments.cms_builder),
        image_studio: Boolean(parsedBrain.assignments.image_studio),
        prompt_engine: Boolean(parsedBrain.assignments.prompt_engine),
        ai_paths: Boolean(parsedBrain.assignments.ai_paths),
        chatbot: Boolean(parsedBrain.assignments.chatbot),
        kangur_ai_tutor: Boolean(parsedBrain.assignments.kangur_ai_tutor),
        products: Boolean(parsedBrain.assignments.products),
        case_resolver: Boolean(parsedBrain.assignments.case_resolver),
        agent_runtime: Boolean(parsedBrain.assignments.agent_runtime),
        agent_teaching: Boolean(parsedBrain.assignments.agent_teaching),
      });

      setOpenaiApiKey(map.get('openai_api_key') ?? '');
      setAnthropicApiKey(map.get('anthropic_api_key') ?? '');
      setGeminiApiKey(map.get('gemini_api_key') ?? '');

      setAnalyticsScheduleEnabled((prev: boolean) =>
        parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled), prev)
      );
      setAnalyticsScheduleMinutes((prev: number) =>
        parseNumberSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes), prev, 5)
      );
      setRuntimeAnalyticsScheduleEnabled((prev: boolean) =>
        parseBooleanSetting(
          map.get(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled),
          prev
        )
      );
      setRuntimeAnalyticsScheduleMinutes((prev: number) =>
        parseNumberSetting(
          map.get(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleMinutes),
          prev,
          5
        )
      );
      setLogsScheduleEnabled((prev: boolean) =>
        parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled), prev)
      );
      setLogsScheduleMinutes((prev: number) =>
        parseNumberSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes), prev, 5)
      );
      setLogsAutoOnError((prev: boolean) =>
        parseBooleanSetting(map.get(AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError), prev)
      );

      setAnalyticsPromptSystem(
        map.get(AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem) ??
          DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT
      );
      setRuntimeAnalyticsPromptSystem(
        map.get(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem) ??
          DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT
      );
      setLogsPromptSystem(
        map.get(AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem) ?? DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT
      );
    },
    [
      setAnalyticsPromptSystem,
      setAnalyticsScheduleEnabled,
      setAnalyticsScheduleMinutes,
      setAnthropicApiKey,
      setGeminiApiKey,
      setLogsAutoOnError,
      setLogsPromptSystem,
      setLogsScheduleEnabled,
      setLogsScheduleMinutes,
      setOpenaiApiKey,
      setOverridesEnabled,
      setProviderCatalog,
      setRuntimeAnalyticsPromptSystem,
      setRuntimeAnalyticsScheduleEnabled,
      setRuntimeAnalyticsScheduleMinutes,
      setSettings,
      toast,
    ]
  );

  const handleSave = useCallback(async (): Promise<void> => {
    if (
      analyticsScheduleMinutes < 5 ||
      runtimeAnalyticsScheduleMinutes < 5 ||
      logsScheduleMinutes < 5
    ) {
      toast('Schedule interval must be at least 5 minutes.', { variant: 'error' });
      return;
    }

    const nextAssignments = ALL_BRAIN_FEATURE_KEYS.reduce<
      Record<AiBrainFeature, AiBrainAssignment | undefined>
    >(
      (acc: Record<AiBrainFeature, AiBrainAssignment | undefined>, key: AiBrainFeature) => {
        if (!overridesEnabled[key] && !REPORT_FEATURE_KEYS.has(key)) return acc;
        const assignment = settings.assignments[key] ?? resolveBrainAssignment(settings, key);
        acc[key] = sanitizeBrainAssignmentForProviders(
          assignment,
          getAllowedProvidersForFeature(key)
        );
        return acc;
      },
      Object.fromEntries(
        ALL_BRAIN_FEATURE_KEYS.map(
          (key: AiBrainFeature): [AiBrainFeature, undefined] => [key, undefined]
        )
      ) as Record<AiBrainFeature, AiBrainAssignment | undefined>
    );

    const nextSettings: AiBrainSettings = {
      ...settings,
      defaults: sanitizeBrainAssignmentForProviders(settings.defaults, ['model']),
      assignments: nextAssignments,
      capabilities: BRAIN_CAPABILITY_KEYS.reduce<
        Record<AiBrainCapabilityKey, AiBrainAssignment | undefined>
      >(
        (acc, key) => {
          const assignment = settings.capabilities[key];
          acc[key] = assignment
            ? sanitizeBrainAssignmentForProviders(
              assignment,
              getBrainCapabilityDefinition(key).policy === 'agent-or-model'
                ? ['model', 'agent']
                : ['model']
            )
            : undefined;
          return acc;
        },
        Object.fromEntries(
          BRAIN_CAPABILITY_KEYS.map(
            (key): [AiBrainCapabilityKey, undefined] => [key, undefined]
          )
        ) as Record<AiBrainCapabilityKey, AiBrainAssignment | undefined>
      ),
    };

    const analyticsAssignment = resolveBrainAssignment(nextSettings, 'analytics');
    const runtimeAnalyticsAssignment = resolveBrainAssignment(nextSettings, 'runtime_analytics');
    const logsAssignment = resolveBrainAssignment(nextSettings, 'system_logs');

    try {
      await updateSetting.mutateAsync({
        key: AI_BRAIN_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      await updateSetting.mutateAsync({
        key: AI_BRAIN_PROVIDER_CATALOG_KEY,
        value: serializeSetting(
          toPersistedBrainProviderCatalog(sanitizeBrainProviderCatalog(providerCatalog))
        ),
      });

      await updateSettingsBulk.mutateAsync([
        { key: 'openai_api_key', value: openaiApiKey.trim() },
        { key: 'anthropic_api_key', value: anthropicApiKey.trim() },
        { key: 'gemini_api_key', value: geminiApiKey.trim() },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsProvider, value: analyticsAssignment.provider },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsModel, value: analyticsAssignment.modelId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsAgentId, value: analyticsAssignment.agentId },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsProvider,
          value: runtimeAnalyticsAssignment.provider,
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsModel,
          value: runtimeAnalyticsAssignment.modelId,
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsAgentId,
          value: runtimeAnalyticsAssignment.agentId,
        },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsProvider, value: logsAssignment.provider },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsModel, value: logsAssignment.modelId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsAgentId, value: logsAssignment.agentId },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled,
          value: String(analyticsScheduleEnabled),
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes,
          value: String(analyticsScheduleMinutes),
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled,
          value: String(runtimeAnalyticsScheduleEnabled),
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleMinutes,
          value: String(runtimeAnalyticsScheduleMinutes),
        },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled, value: String(logsScheduleEnabled) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes, value: String(logsScheduleMinutes) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError, value: String(logsAutoOnError) },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem,
          value: analyticsPromptSystem.trim(),
        },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem,
          value: runtimeAnalyticsPromptSystem.trim(),
        },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem, value: logsPromptSystem.trim() },
      ]);

      toast('Brain settings saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminBrainPage', action: 'save' } });
      toast('Failed to save Brain settings.', { variant: 'error' });
    }
  }, [
    analyticsPromptSystem,
    analyticsScheduleEnabled,
    analyticsScheduleMinutes,
    anthropicApiKey,
    geminiApiKey,
    logsAutoOnError,
    logsPromptSystem,
    logsScheduleEnabled,
    logsScheduleMinutes,
    openaiApiKey,
    overridesEnabled,
    providerCatalog,
    runtimeAnalyticsPromptSystem,
    runtimeAnalyticsScheduleEnabled,
    runtimeAnalyticsScheduleMinutes,
    settings,
    toast,
    updateSetting,
    updateSettingsBulk,
  ]);

  const handleReset = useCallback((): void => {
    if (settingsMap) {
      hydrateFromSettingsMap(settingsMap);
      return;
    }
    setSettings(defaultBrainSettings);
    setOverridesEnabled(DEFAULT_BRAIN_OVERRIDES_ENABLED);
    setProviderCatalog(defaultBrainProviderCatalog);
    setOpenaiApiKey('');
    setAnthropicApiKey('');
    setGeminiApiKey('');
    setAnalyticsScheduleEnabled(true);
    setAnalyticsScheduleMinutes(30);
    setRuntimeAnalyticsScheduleEnabled(true);
    setRuntimeAnalyticsScheduleMinutes(30);
    setLogsScheduleEnabled(true);
    setLogsScheduleMinutes(15);
    setLogsAutoOnError(true);
    setAnalyticsPromptSystem(DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
    setRuntimeAnalyticsPromptSystem(DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT);
    setLogsPromptSystem(DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT);
  }, [
    hydrateFromSettingsMap,
    setAnalyticsPromptSystem,
    setAnalyticsScheduleEnabled,
    setAnalyticsScheduleMinutes,
    setAnthropicApiKey,
    setGeminiApiKey,
    setLogsAutoOnError,
    setLogsPromptSystem,
    setLogsScheduleEnabled,
    setLogsScheduleMinutes,
    setOpenaiApiKey,
    setOverridesEnabled,
    setProviderCatalog,
    setRuntimeAnalyticsPromptSystem,
    setRuntimeAnalyticsScheduleEnabled,
    setRuntimeAnalyticsScheduleMinutes,
    setSettings,
    settingsMap,
  ]);

  const syncPlaywrightPersonas = useCallback((): void => {
    if (!settingsMap) {
      toast('Settings are still loading.', { variant: 'error' });
      return;
    }
    const ids = parsePlaywrightPersonaIds(settingsMap.get(PLAYWRIGHT_PERSONA_SETTINGS_KEY));
    if (ids.length === 0) {
      toast('No Playwright personas found to sync.', { variant: 'error' });
      return;
    }
    setProviderCatalog((prev: AiBrainProviderCatalog) => {
      const baseEntries = catalogToEntries(prev);
      const nextEntries = replaceCatalogPoolValues(baseEntries, 'playwrightPersonas', ids);
      return sanitizeBrainProviderCatalog({
        ...prev,
        entries: nextEntries,
      });
    });
    toast('Playwright personas synced into Brain provider catalog.', { variant: 'success' });
  }, [setProviderCatalog, settingsMap, toast]);

  const saving = updateSetting.isPending || updateSettingsBulk.isPending;

  return {
    handleReset,
    handleSave,
    hydrateFromSettingsMap,
    saving,
    syncPlaywrightPersonas,
  };
}
