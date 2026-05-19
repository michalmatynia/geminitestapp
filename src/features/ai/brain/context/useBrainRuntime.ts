'use client';

import { useEffect, useMemo } from 'react';

import { useSettingsMap, useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';

import {
  useBrainRoutingSettings,
  useUpdateBrainRoutingSettings,
} from '../hooks/useBrainQueries';
import { hasAnyBrainOrInsightsSetting } from './brain-runtime-shared';
import { useBrainDerivedState } from './useBrainDerivedState';
import { useBrainPersistence } from './useBrainPersistence';
import { useBrainState } from './useBrainState';
import { useBrainAssignmentHandlers } from './useBrainAssignmentHandlers';
import { useBrainFeatureToggleHandlers } from './useBrainFeatureToggleHandlers';
import { useBrainCapabilityToggleHandlers } from './useBrainCapabilityToggleHandlers';

import type {
  BrainActionsContextType,
  BrainStateContextType,
} from './BrainContext.types';
import type { AiBrainSettings } from '../settings';

interface BrainRuntimeResult {
  actionsValue: BrainActionsContextType;
  stateValue: BrainStateContextType;
}

interface BrainRuntimeHydrationParams {
  hydrateBrainRoutingSettings: (settings: AiBrainSettings) => void;
  hydrateFromSettingsMap: (map: Map<string, string>) => void;
  routingDataUpdatedAt: number;
  routingSettings: AiBrainSettings | undefined;
  settingsDataUpdatedAt: number;
  settingsMap: Map<string, string> | undefined;
}

function useBrainRuntimeHydration(params: BrainRuntimeHydrationParams): void {
  useEffect(() => {
    if (params.routingSettings !== undefined) {
      params.hydrateBrainRoutingSettings(params.routingSettings);
    }
  }, [
    params.hydrateBrainRoutingSettings,
    params.routingDataUpdatedAt,
    params.routingSettings,
  ]);

  useEffect(() => {
    if (params.settingsMap !== undefined && hasAnyBrainOrInsightsSetting(params.settingsMap)) {
      params.hydrateFromSettingsMap(params.settingsMap);
    }
  }, [params.hydrateFromSettingsMap, params.settingsDataUpdatedAt, params.settingsMap]);
}

export function useBrainRuntime(): BrainRuntimeResult {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const brainRoutingQuery = useBrainRoutingSettings();
  const updateBrainRouting = useUpdateBrainRoutingSettings();
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const state = useBrainState();
  const assignments = useBrainAssignmentHandlers({ setSettings: state.setSettings });
  const featureToggles = useBrainFeatureToggleHandlers({
    setSettings: state.setSettings, setOverridesEnabled: state.setOverridesEnabled,
  });
  const capabilityToggles = useBrainCapabilityToggleHandlers({ setSettings: state.setSettings });

  const derived = useBrainDerivedState({
    activeTab: state.activeTab, operationsRange: state.operationsRange,
    providerCatalog: state.providerCatalog, settings: state.settings,
  });

  const {
    handleReset,
    handleSave,
    hydrateBrainRoutingSettings,
    hydrateFromSettingsMap,
    saving,
    syncPlaywrightPersonas,
  } = useBrainPersistence({
    ...state,
    settingsMap: settingsQuery.data,
    storedRoutingSettings: brainRoutingQuery.data?.settings,
    toast,
    updateBrainRouting,
    updateSetting,
    updateSettingsBulk,
  });

  useBrainRuntimeHydration({
    hydrateBrainRoutingSettings,
    hydrateFromSettingsMap,
    routingDataUpdatedAt: brainRoutingQuery.dataUpdatedAt,
    routingSettings: brainRoutingQuery.data?.settings,
    settingsDataUpdatedAt: settingsQuery.dataUpdatedAt,
    settingsMap: settingsQuery.data,
  });

  const stateValue = useMemo((): BrainStateContextType => ({
    ...state, ...derived, saving,
  }), [state, derived, saving]);

  const actionsValue = useMemo((): BrainActionsContextType => ({
    ...assignments, ...featureToggles, ...capabilityToggles,
    setActiveTab: state.setActiveTab, setSettings: state.setSettings, setProviderCatalog: state.setProviderCatalog,
    setOpenaiApiKey: (k) => state.setOpenaiApiKey(k), setAnthropicApiKey: (k) => state.setAnthropicApiKey(k), setGeminiApiKey: (k) => state.setGeminiApiKey(k),
    setAnalyticsScheduleEnabled: (e) => state.setAnalyticsScheduleEnabled(e), setAnalyticsScheduleMinutes: (m) => state.setAnalyticsScheduleMinutes(m),
    setRuntimeAnalyticsScheduleEnabled: (e) => state.setRuntimeAnalyticsScheduleEnabled(e), setRuntimeAnalyticsScheduleMinutes: (m) => state.setRuntimeAnalyticsScheduleMinutes(m),
    setLogsScheduleEnabled: (e) => state.setLogsScheduleEnabled(e), setLogsScheduleMinutes: (m) => state.setLogsScheduleMinutes(m),
    setLogsAutoOnError: (a) => state.setLogsAutoOnError(a),
    setAnalyticsPromptSystem: (p) => state.setAnalyticsPromptSystem(p), setRuntimeAnalyticsPromptSystem: (p) => state.setRuntimeAnalyticsPromptSystem(p), setLogsPromptSystem: (p) => state.setLogsPromptSystem(p),
    setOperationsRange: (r) => state.setOperationsRange(r),
    handleSave, handleReset, syncPlaywrightPersonas,
  }), [assignments, featureToggles, capabilityToggles, state, handleSave, handleReset, syncPlaywrightPersonas]);

  return { actionsValue, stateValue };
}
