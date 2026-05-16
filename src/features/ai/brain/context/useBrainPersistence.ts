'use client';

import { type Dispatch, type SetStateAction } from 'react';

import type { SystemSetting } from '@/shared/contracts/settings';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import type { Toast } from '@/shared/contracts/ui/base';

import { useBrainHydration } from './useBrainHydration';
import { useBrainSaveAction } from './useBrainSaveAction';
import { useBrainResetAction } from './useBrainResetAction';
import { useBrainSyncPersonas } from './useBrainSyncPersonas';

import type {
  AiBrainFeature,
  AiBrainProviderCatalog,
  AiBrainSettings,
} from '../settings';

export interface BrainPersistenceParams {
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

export function useBrainPersistence(params: BrainPersistenceParams): BrainPersistenceResult {
  const { hydrateFromSettingsMap } = useBrainHydration(params);
  const { handleSave } = useBrainSaveAction(params);
  const { handleReset } = useBrainResetAction({ ...params, hydrateFromSettingsMap });
  const { syncPlaywrightPersonas } = useBrainSyncPersonas(params);

  return {
    handleReset,
    handleSave,
    hydrateFromSettingsMap,
    saving: params.updateSetting.isPending || params.updateSettingsBulk.isPending,
    syncPlaywrightPersonas,
  };
}
