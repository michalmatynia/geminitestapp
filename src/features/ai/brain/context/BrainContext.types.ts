import type { AiPathRuntimeAnalyticsSummary } from '@/shared/contracts/ai-paths-analytics';
import type { AnalyticsSummary } from '@/shared/contracts/analytics';
import type { BrainOperationsRange } from '@/shared/contracts/ai-brain';
import type { SystemLogMetrics } from '@/shared/contracts/observability';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';
import type { SingleQuery } from '@/shared/contracts/ui/queries';
import type { BrainTab } from '@/shared/lib/ai-brain/context/BrainContext.types';
import type {
  BrainModelsResponse,
  BrainOperationsOverviewResponse,
  InsightsSnapshot,
} from '../hooks/useBrainQueries';

import type {
  AiBrainAssignment,
  AiBrainCapabilityKey,
  AiBrainFeature,
  AiBrainProviderCatalog,
  AiBrainSettings,
} from '../settings';
import type { Dispatch, SetStateAction } from 'react';

export type { BrainTab };

export interface BrainStateContextType {
  activeTab: BrainTab;
  settings: AiBrainSettings;
  overridesEnabled: Record<AiBrainFeature, boolean>;
  providerCatalog: AiBrainProviderCatalog;
  openaiApiKey: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  analyticsScheduleEnabled: boolean;
  analyticsScheduleMinutes: number;
  runtimeAnalyticsScheduleEnabled: boolean;
  runtimeAnalyticsScheduleMinutes: number;
  logsScheduleEnabled: boolean;
  logsScheduleMinutes: number;
  logsAutoOnError: boolean;
  analyticsPromptSystem: string;
  runtimeAnalyticsPromptSystem: string;
  logsPromptSystem: string;
  ollamaModelsQuery: SingleQuery<BrainModelsResponse>;
  operationsRange: BrainOperationsRange;
  operationsOverviewQuery: SingleQuery<BrainOperationsOverviewResponse>;
  analyticsSummaryQuery: SingleQuery<AnalyticsSummary>;
  logMetricsQuery: SingleQuery<SystemLogMetrics>;
  insightsQuery: SingleQuery<InsightsSnapshot>;
  runtimeAnalyticsQuery: SingleQuery<AiPathRuntimeAnalyticsSummary>;
  modelQuickPicks: SelectSimpleOption[];
  agentQuickPicks: SelectSimpleOption[];
  effectiveAssignments: Record<AiBrainFeature, AiBrainAssignment>;
  effectiveCapabilityAssignments: Record<AiBrainCapabilityKey, AiBrainAssignment>;
  runtimeAnalyticsLiveEnabled: boolean;
  saving: boolean;
  liveOllamaModels: string[];
}

export interface BrainActionsContextType {
  setActiveTab: (tab: BrainTab) => void;
  setSettings: Dispatch<SetStateAction<AiBrainSettings>>;
  setProviderCatalog: Dispatch<SetStateAction<AiBrainProviderCatalog>>;
  setOpenaiApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setAnalyticsScheduleEnabled: (enabled: boolean) => void;
  setAnalyticsScheduleMinutes: (min: number) => void;
  setRuntimeAnalyticsScheduleEnabled: (enabled: boolean) => void;
  setRuntimeAnalyticsScheduleMinutes: (min: number) => void;
  setLogsScheduleEnabled: (enabled: boolean) => void;
  setLogsScheduleMinutes: (min: number) => void;
  setLogsAutoOnError: (auto: boolean) => void;
  setAnalyticsPromptSystem: (prompt: string) => void;
  setRuntimeAnalyticsPromptSystem: (prompt: string) => void;
  setLogsPromptSystem: (prompt: string) => void;
  setOperationsRange: (range: BrainOperationsRange) => void;
  handleSave: () => Promise<void>;
  handleReset: () => void;
  handleDefaultChange: (next: AiBrainAssignment) => void;
  handleOverrideChange: (feature: AiBrainFeature, next: AiBrainAssignment) => void;
  handleCapabilityChange: (capability: AiBrainCapabilityKey, next: AiBrainAssignment) => void;
  setFeatureEnabled: (feature: AiBrainFeature, enabled: boolean) => void;
  setCapabilityEnabled: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  clearCapabilityOverride: (capability: AiBrainCapabilityKey) => void;
  toggleOverride: (feature: AiBrainFeature, enabled: boolean) => void;
  toggleCapabilityOverride: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  syncPlaywrightPersonas: () => void;
}

export type BrainContextType = BrainStateContextType & BrainActionsContextType;
