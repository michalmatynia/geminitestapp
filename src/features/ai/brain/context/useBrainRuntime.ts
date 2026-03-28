'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { BrainOperationsRange } from '@/shared/contracts/ai-brain';
import { useSettingsMap, useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';

import {
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_BRAIN_OVERRIDES_ENABLED,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  getAllowedProvidersForFeature,
  hasAnyBrainOrInsightsSetting,
} from './brain-runtime-shared';
import { useBrainDerivedState } from './useBrainDerivedState';
import { useBrainPersistence } from './useBrainPersistence';
import {
  defaultBrainProviderCatalog,
  defaultBrainSettings,
  getBrainCapabilityDefinition,
  resolveBrainAssignment,
  resolveBrainCapabilityAssignment,
  sanitizeBrainAssignmentForProviders,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
  type AiBrainProviderCatalog,
  type AiBrainSettings,
} from '../settings';

import type {
  BrainActionsContextType,
  BrainStateContextType,
  BrainTab,
} from './BrainContext.types';

interface BrainRuntimeResult {
  actionsValue: BrainActionsContextType;
  stateValue: BrainStateContextType;
}

export type {
  BrainModelsResponse,
  BrainOperationsOverviewResponse,
  InsightsSnapshot,
} from './useBrainDerivedState';

export function useBrainRuntime(): BrainRuntimeResult {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const [activeTab, setActiveTab] = useState<BrainTab>('routing');
  const [operationsRange, setOperationsRange] = useState<BrainOperationsRange>('1h');
  const [settings, setSettings] = useState<AiBrainSettings>(defaultBrainSettings);
  const [overridesEnabled, setOverridesEnabled] =
    useState<Record<AiBrainFeature, boolean>>(DEFAULT_BRAIN_OVERRIDES_ENABLED);
  const [providerCatalog, setProviderCatalog] = useState<AiBrainProviderCatalog>(
    defaultBrainProviderCatalog
  );

  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const [analyticsScheduleEnabled, setAnalyticsScheduleEnabled] = useState(true);
  const [analyticsScheduleMinutes, setAnalyticsScheduleMinutes] = useState(30);
  const [runtimeAnalyticsScheduleEnabled, setRuntimeAnalyticsScheduleEnabled] = useState(true);
  const [runtimeAnalyticsScheduleMinutes, setRuntimeAnalyticsScheduleMinutes] = useState(30);
  const [logsScheduleEnabled, setLogsScheduleEnabled] = useState(true);
  const [logsScheduleMinutes, setLogsScheduleMinutes] = useState(15);
  const [logsAutoOnError, setLogsAutoOnError] = useState(true);

  const [analyticsPromptSystem, setAnalyticsPromptSystem] = useState(
    DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT
  );
  const [runtimeAnalyticsPromptSystem, setRuntimeAnalyticsPromptSystem] = useState(
    DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT
  );
  const [logsPromptSystem, setLogsPromptSystem] = useState(DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT);

  const {
    agentQuickPicks,
    analyticsSummaryQuery,
    effectiveAssignments,
    effectiveCapabilityAssignments,
    insightsQuery,
    liveOllamaModels,
    logMetricsQuery,
    modelQuickPicks,
    ollamaModelsQuery,
    operationsOverviewQuery,
    runtimeAnalyticsLiveEnabled,
    runtimeAnalyticsQuery,
  } = useBrainDerivedState({
    operationsRange,
    providerCatalog,
    settings,
  });

  const {
    handleReset,
    handleSave,
    hydrateFromSettingsMap,
    saving,
    syncPlaywrightPersonas,
  } = useBrainPersistence({
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
    settingsMap: settingsQuery.data,
    toast,
    updateSetting,
    updateSettingsBulk,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    if (!hasAnyBrainOrInsightsSetting(settingsQuery.data)) return;
    hydrateFromSettingsMap(settingsQuery.data);
  }, [hydrateFromSettingsMap, settingsQuery.data, settingsQuery.dataUpdatedAt]);

  const handleDefaultChange = useCallback((next: AiBrainAssignment): void => {
    setSettings((prev: AiBrainSettings) => ({
      ...prev,
      defaults: sanitizeBrainAssignmentForProviders(next, ['model']),
    }));
  }, []);

  const handleOverrideChange = useCallback(
    (feature: AiBrainFeature, next: AiBrainAssignment): void => {
      setSettings((prev: AiBrainSettings) => ({
        ...prev,
        assignments: {
          ...prev.assignments,
          [feature]: sanitizeBrainAssignmentForProviders(
            next,
            getAllowedProvidersForFeature(feature)
          ),
        },
      }));
    },
    []
  );

  const handleCapabilityChange = useCallback(
    (capability: AiBrainCapabilityKey, next: AiBrainAssignment): void => {
      setSettings((prev: AiBrainSettings) => ({
        ...prev,
        capabilities: {
          ...prev.capabilities,
          [capability]: sanitizeBrainAssignmentForProviders(
            next,
            getBrainCapabilityDefinition(capability).policy === 'agent-or-model'
              ? ['model', 'agent']
              : ['model']
          ),
        },
      }));
    },
    []
  );

  const setCapabilityEnabled = useCallback(
    (capability: AiBrainCapabilityKey, enabled: boolean): void => {
      setSettings((prev: AiBrainSettings) => {
        const definition = getBrainCapabilityDefinition(capability);
        const allowedProviders =
          definition.policy === 'agent-or-model'
            ? (['model', 'agent'] as const)
            : (['model'] as const);
        const baseAssignment =
          prev.capabilities[capability] ?? resolveBrainCapabilityAssignment(prev, capability);
        const nextAssignment = sanitizeBrainAssignmentForProviders(
          {
            ...baseAssignment,
            enabled,
          },
          [...allowedProviders]
        );

        return {
          ...prev,
          capabilities: {
            ...prev.capabilities,
            [capability]: nextAssignment,
          },
        };
      });
    },
    []
  );

  const clearCapabilityOverride = useCallback((capability: AiBrainCapabilityKey): void => {
    setSettings((prev: AiBrainSettings) => {
      if (!prev.capabilities[capability]) {
        return prev;
      }
      const nextCapabilities = { ...prev.capabilities };
      delete nextCapabilities[capability];
      return {
        ...prev,
        capabilities: nextCapabilities,
      };
    });
  }, []);

  const toggleOverride = useCallback((feature: AiBrainFeature, enabled: boolean): void => {
    setOverridesEnabled((prev: Record<AiBrainFeature, boolean>) => ({
      ...prev,
      [feature]: enabled,
    }));
    if (!enabled) {
      setSettings((prev: AiBrainSettings) => {
        const nextAssignments = { ...prev.assignments };
        delete nextAssignments[feature];
        return { ...prev, assignments: nextAssignments };
      });
      return;
    }
    setSettings((prev: AiBrainSettings) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [feature]: prev.assignments[feature] ?? resolveBrainAssignment(prev, feature),
      },
    }));
  }, []);

  const toggleCapabilityOverride = useCallback(
    (capability: AiBrainCapabilityKey, enabled: boolean): void => {
      if (!enabled) {
        setSettings((prev: AiBrainSettings) => {
          const nextCapabilities = { ...prev.capabilities };
          delete nextCapabilities[capability];
          return {
            ...prev,
            capabilities: nextCapabilities,
          };
        });
        return;
      }

      setSettings((prev: AiBrainSettings) => ({
        ...prev,
        capabilities: {
          ...prev.capabilities,
          [capability]:
            prev.capabilities[capability] ?? resolveBrainCapabilityAssignment(prev, capability),
        },
      }));
    },
    []
  );

  const stateValue = useMemo(
    (): BrainStateContextType => ({
      activeTab,
      settings,
      overridesEnabled,
      providerCatalog,
      openaiApiKey,
      anthropicApiKey,
      geminiApiKey,
      analyticsScheduleEnabled,
      analyticsScheduleMinutes,
      runtimeAnalyticsScheduleEnabled,
      runtimeAnalyticsScheduleMinutes,
      logsScheduleEnabled,
      logsScheduleMinutes,
      logsAutoOnError,
      analyticsPromptSystem,
      runtimeAnalyticsPromptSystem,
      logsPromptSystem,
      ollamaModelsQuery,
      operationsRange,
      operationsOverviewQuery,
      analyticsSummaryQuery,
      logMetricsQuery,
      insightsQuery,
      runtimeAnalyticsQuery,
      modelQuickPicks,
      agentQuickPicks,
      effectiveAssignments,
      effectiveCapabilityAssignments,
      runtimeAnalyticsLiveEnabled,
      saving,
      liveOllamaModels,
    }),
    [
      activeTab,
      agentQuickPicks,
      analyticsPromptSystem,
      analyticsScheduleEnabled,
      analyticsScheduleMinutes,
      analyticsSummaryQuery,
      anthropicApiKey,
      effectiveAssignments,
      effectiveCapabilityAssignments,
      geminiApiKey,
      insightsQuery,
      liveOllamaModels,
      logMetricsQuery,
      logsAutoOnError,
      logsPromptSystem,
      logsScheduleEnabled,
      logsScheduleMinutes,
      modelQuickPicks,
      ollamaModelsQuery,
      openaiApiKey,
      operationsOverviewQuery,
      operationsRange,
      overridesEnabled,
      providerCatalog,
      runtimeAnalyticsLiveEnabled,
      runtimeAnalyticsPromptSystem,
      runtimeAnalyticsQuery,
      runtimeAnalyticsScheduleEnabled,
      runtimeAnalyticsScheduleMinutes,
      saving,
      settings,
    ]
  );

  const actionsValue = useMemo(
    (): BrainActionsContextType => ({
      setActiveTab,
      setSettings,
      setProviderCatalog,
      setOpenaiApiKey,
      setAnthropicApiKey,
      setGeminiApiKey,
      setAnalyticsScheduleEnabled,
      setAnalyticsScheduleMinutes,
      setRuntimeAnalyticsScheduleEnabled,
      setRuntimeAnalyticsScheduleMinutes,
      setLogsScheduleEnabled,
      setLogsScheduleMinutes,
      setLogsAutoOnError,
      setAnalyticsPromptSystem,
      setRuntimeAnalyticsPromptSystem,
      setLogsPromptSystem,
      setOperationsRange,
      handleSave,
      handleReset,
      handleDefaultChange,
      handleOverrideChange,
      handleCapabilityChange,
      setCapabilityEnabled,
      clearCapabilityOverride,
      toggleOverride,
      toggleCapabilityOverride,
      syncPlaywrightPersonas,
    }),
    [
      clearCapabilityOverride,
      handleCapabilityChange,
      handleDefaultChange,
      handleOverrideChange,
      handleReset,
      handleSave,
      setCapabilityEnabled,
      syncPlaywrightPersonas,
      toggleCapabilityOverride,
      toggleOverride,
    ]
  );

  return {
    actionsValue,
    stateValue,
  };
}
