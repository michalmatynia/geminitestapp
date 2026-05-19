'use client';

import { useCallback } from 'react';

import type { SystemSetting } from '@/shared/contracts/settings';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import type { Toast } from '@/shared/contracts/ui/base';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  AI_INSIGHTS_SETTINGS_KEYS,
  ALL_BRAIN_FEATURE_KEYS,
  REPORT_FEATURE_KEYS,
  getAllowedProvidersForFeature,
} from './brain-runtime-shared';
import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  BRAIN_CAPABILITY_KEYS,
  getBrainCapabilityDefinition,
  resolveBrainAssignment,
  sanitizeBrainAssignmentForProviders,
  sanitizeBrainProviderCatalog,
  toPersistedBrainProviderCatalog,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
  type AiBrainProviderCatalog,
  type AiBrainRoutingResponse,
  type AiBrainSettings,
} from '../settings';

interface BrainSaveParams {
  analyticsPromptSystem: string;
  analyticsScheduleMinutes: number;
  anthropicApiKey: string;
  geminiApiKey: string;
  logsPromptSystem: string;
  logsScheduleMinutes: number;
  openaiApiKey: string;
  overridesEnabled: Record<AiBrainFeature, boolean>;
  providerCatalog: AiBrainProviderCatalog;
  runtimeAnalyticsPromptSystem: string;
  runtimeAnalyticsScheduleMinutes: number;
  settings: AiBrainSettings;
  toast: Toast;
  updateBrainRouting: MutationResult<AiBrainRoutingResponse, AiBrainSettings>;
  updateSetting: MutationResult<SystemSetting, { key: string; value: string }>;
  updateSettingsBulk: MutationResult<SystemSetting[], Array<{ key: string; value: string }>>;
}

interface BrainSaveResult {
  handleSave: () => Promise<void>;
}

function buildNextAssignments(
  settings: AiBrainSettings,
  overridesEnabled: Record<AiBrainFeature, boolean>
): Record<AiBrainFeature, AiBrainAssignment | undefined> {
  const initial = Object.fromEntries(
    ALL_BRAIN_FEATURE_KEYS.map((key) => [key, undefined])
  ) as Record<AiBrainFeature, AiBrainAssignment | undefined>;

  return ALL_BRAIN_FEATURE_KEYS.reduce((acc, key) => {
    if (!overridesEnabled[key] && !REPORT_FEATURE_KEYS.has(key)) return acc;
    const assignment = settings.assignments[key] ?? resolveBrainAssignment(settings, key);
    return {
      ...acc,
      [key]: sanitizeBrainAssignmentForProviders(assignment, getAllowedProvidersForFeature(key)),
    };
  }, initial);
}

function buildNextCapabilities(
  settings: AiBrainSettings
): Record<AiBrainCapabilityKey, AiBrainAssignment | undefined> {
  const initial = Object.fromEntries(
    BRAIN_CAPABILITY_KEYS.map((key) => [key, undefined])
  ) as Record<AiBrainCapabilityKey, AiBrainAssignment | undefined>;

  return BRAIN_CAPABILITY_KEYS.reduce((acc, key) => {
    const assignment = settings.capabilities[key];
    if (!assignment) return acc;
    const allowed: Array<'model' | 'agent'> =
      getBrainCapabilityDefinition(key).policy === 'agent-or-model' ? ['model', 'agent'] : ['model'];
    return {
      ...acc,
      [key]: sanitizeBrainAssignmentForProviders(assignment, allowed),
    };
  }, initial);
}

export function useBrainSaveAction(params: BrainSaveParams): BrainSaveResult {
  const handleSave = useCallback(async (): Promise<void> => {
    const {
      settings,
      overridesEnabled,
      providerCatalog,
      toast,
      updateBrainRouting,
      updateSetting,
      updateSettingsBulk,
    } = params;
    const nextSettings: AiBrainSettings = {
      ...settings,
      defaults: sanitizeBrainAssignmentForProviders(settings.defaults, ['model']),
      assignments: buildNextAssignments(settings, overridesEnabled),
      capabilities: buildNextCapabilities(settings),
    };

    const analytics = resolveBrainAssignment(nextSettings, 'analytics');
    const runtime = resolveBrainAssignment(nextSettings, 'runtime_analytics');
    const logs = resolveBrainAssignment(nextSettings, 'system_logs');

    try {
      await updateBrainRouting.mutateAsync(nextSettings);
      await updateSetting.mutateAsync({
        key: AI_BRAIN_PROVIDER_CATALOG_KEY,
        value: serializeSetting(toPersistedBrainProviderCatalog(sanitizeBrainProviderCatalog(providerCatalog))),
      });

      await updateSettingsBulk.mutateAsync([
        { key: 'openai_api_key', value: params.openaiApiKey.trim() },
        { key: 'anthropic_api_key', value: params.anthropicApiKey.trim() },
        { key: 'gemini_api_key', value: params.geminiApiKey.trim() },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsProvider, value: analytics.provider },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsModel, value: analytics.modelId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsAgentId, value: analytics.agentId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsProvider, value: runtime.provider },
        { key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsModel, value: runtime.modelId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsAgentId, value: runtime.agentId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsProvider, value: logs.provider },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsModel, value: logs.modelId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsAgentId, value: logs.agentId },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled, value: 'false' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes, value: String(params.analyticsScheduleMinutes) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled, value: 'false' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleMinutes, value: String(params.runtimeAnalyticsScheduleMinutes) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled, value: 'false' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes, value: String(params.logsScheduleMinutes) },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError, value: 'false' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem, value: params.analyticsPromptSystem.trim() },
        { key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem, value: params.runtimeAnalyticsPromptSystem.trim() },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem, value: params.logsPromptSystem.trim() },
      ]);
      toast('Brain settings saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientCatch(error, { source: 'AdminBrainPage', action: 'save' });
      toast('Failed to save Brain settings.', { variant: 'error' });
    }
  }, [params]);

  return { handleSave };
}
