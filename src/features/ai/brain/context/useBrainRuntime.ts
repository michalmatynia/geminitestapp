'use client';

import { useEffect, useMemo } from 'react';

import { useSettingsMap, useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';

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

interface BrainRuntimeResult {
  actionsValue: BrainActionsContextType;
  stateValue: BrainStateContextType;
}

export function useBrainRuntime(): BrainRuntimeResult {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
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
    handleReset, handleSave, hydrateFromSettingsMap, saving, syncPlaywrightPersonas,
  } = useBrainPersistence({
    ...state, settingsMap: settingsQuery.data, toast, updateSetting, updateSettingsBulk,
  });

  useEffect(() => {
    if (settingsQuery.data && hasAnyBrainOrInsightsSetting(settingsQuery.data)) {
      hydrateFromSettingsMap(settingsQuery.data);
    }
  }, [hydrateFromSettingsMap, settingsQuery.data, settingsQuery.dataUpdatedAt]);

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
