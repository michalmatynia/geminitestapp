'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { BrainOperationsRange } from '@/shared/contracts/ai-brain';
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
import type { BrainTab } from './BrainContext.types';

export interface BrainState {
  activeTab: BrainTab;
  setActiveTab: Dispatch<SetStateAction<BrainTab>>;
  operationsRange: BrainOperationsRange;
  setOperationsRange: Dispatch<SetStateAction<BrainOperationsRange>>;
  settings: AiBrainSettings;
  setSettings: Dispatch<SetStateAction<AiBrainSettings>>;
  overridesEnabled: Record<AiBrainFeature, boolean>;
  setOverridesEnabled: Dispatch<SetStateAction<Record<AiBrainFeature, boolean>>>;
  providerCatalog: AiBrainProviderCatalog;
  setProviderCatalog: Dispatch<SetStateAction<AiBrainProviderCatalog>>;
  openaiApiKey: string;
  setOpenaiApiKey: Dispatch<SetStateAction<string>>;
  anthropicApiKey: string;
  setAnthropicApiKey: Dispatch<SetStateAction<string>>;
  geminiApiKey: string;
  setGeminiApiKey: Dispatch<SetStateAction<string>>;
  analyticsScheduleEnabled: boolean;
  setAnalyticsScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  analyticsScheduleMinutes: number;
  setAnalyticsScheduleMinutes: Dispatch<SetStateAction<number>>;
  runtimeAnalyticsScheduleEnabled: boolean;
  setRuntimeAnalyticsScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  runtimeAnalyticsScheduleMinutes: number;
  setRuntimeAnalyticsScheduleMinutes: Dispatch<SetStateAction<number>>;
  logsScheduleEnabled: boolean;
  setLogsScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  logsScheduleMinutes: number;
  setLogsScheduleMinutes: Dispatch<SetStateAction<number>>;
  logsAutoOnError: boolean;
  setLogsAutoOnError: Dispatch<SetStateAction<boolean>>;
  analyticsPromptSystem: string;
  setAnalyticsPromptSystem: Dispatch<SetStateAction<string>>;
  runtimeAnalyticsPromptSystem: string;
  setRuntimeAnalyticsPromptSystem: Dispatch<SetStateAction<string>>;
  logsPromptSystem: string;
  setLogsPromptSystem: Dispatch<SetStateAction<string>>;
}

export function useBrainState(): BrainState {
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

  const [analyticsScheduleEnabled, setAnalyticsScheduleEnabled] = useState(false);
  const [analyticsScheduleMinutes, setAnalyticsScheduleMinutes] = useState(30);
  const [runtimeAnalyticsScheduleEnabled, setRuntimeAnalyticsScheduleEnabled] = useState(false);
  const [runtimeAnalyticsScheduleMinutes, setRuntimeAnalyticsScheduleMinutes] = useState(30);
  const [logsScheduleEnabled, setLogsScheduleEnabled] = useState(false);
  const [logsScheduleMinutes, setLogsScheduleMinutes] = useState(15);
  const [logsAutoOnError, setLogsAutoOnError] = useState(false);

  const [analyticsPromptSystem, setAnalyticsPromptSystem] = useState(
    DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT
  );
  const [runtimeAnalyticsPromptSystem, setRuntimeAnalyticsPromptSystem] = useState(
    DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT
  );
  const [logsPromptSystem, setLogsPromptSystem] = useState(DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT);

  return {
    activeTab, setActiveTab,
    operationsRange, setOperationsRange,
    settings, setSettings,
    overridesEnabled, setOverridesEnabled,
    providerCatalog, setProviderCatalog,
    openaiApiKey, setOpenaiApiKey,
    anthropicApiKey, setAnthropicApiKey,
    geminiApiKey, setGeminiApiKey,
    analyticsScheduleEnabled, setAnalyticsScheduleEnabled,
    analyticsScheduleMinutes, setAnalyticsScheduleMinutes,
    runtimeAnalyticsScheduleEnabled, setRuntimeAnalyticsScheduleEnabled,
    runtimeAnalyticsScheduleMinutes, setRuntimeAnalyticsScheduleMinutes,
    logsScheduleEnabled, setLogsScheduleEnabled,
    logsScheduleMinutes, setLogsScheduleMinutes,
    logsAutoOnError, setLogsAutoOnError,
    analyticsPromptSystem, setAnalyticsPromptSystem,
    runtimeAnalyticsPromptSystem, setRuntimeAnalyticsPromptSystem,
    logsPromptSystem, setLogsPromptSystem,
  };
}
