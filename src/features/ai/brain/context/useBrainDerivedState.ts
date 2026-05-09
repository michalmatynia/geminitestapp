'use client';

import { useMemo } from 'react';

import type { AiPathRuntimeAnalyticsSummary } from '@/shared/contracts/ai-paths-analytics';
import type { AnalyticsSummary } from '@/shared/contracts/analytics';
import type {
  BrainModelDescriptor,
  BrainModelVendor,
  BrainOperationsRange,
} from '@/shared/contracts/ai-brain';
import type { SystemLogMetrics } from '@/shared/contracts/observability';
import type { SingleQuery } from '@/shared/contracts/ui/queries';
import {
  catalogToEntries,
  entriesToCatalogArrays,
} from '@/shared/lib/ai-brain/catalog-entries';
import {
  OPENAI_IMAGE_GENERATION_MODEL_DESCRIPTORS,
  OPENAI_IMAGE_GENERATION_MODEL_IDS,
} from '@/shared/lib/ai-brain/image-generation-models';
import { inferBrainModelVendor } from '@/shared/lib/ai-brain/model-vendor';
import {
  useBrainAnalyticsSummary,
  useBrainInsights,
  useBrainLogMetrics,
  useBrainModels,
  useBrainOperationsOverview,
  useBrainRuntimeAnalytics,
  type BrainModelsResponse,
  type BrainOperationsOverviewResponse,
  type InsightsSnapshot,
} from '../hooks/useBrainQueries';
import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';

import {
  ALL_BRAIN_FEATURE_KEYS,
} from './brain-runtime-shared';
import {
  BRAIN_CAPABILITY_KEYS,
  resolveBrainAssignment,
  resolveBrainCapabilityAssignment,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
  type AiBrainProviderCatalog,
  type AiBrainSettings,
} from '../settings';
import type { BrainTab } from './BrainContext.types';

interface BrainDerivedStateParams {
  activeTab: BrainTab;
  operationsRange: BrainOperationsRange;
  providerCatalog: AiBrainProviderCatalog;
  settings: AiBrainSettings;
}

interface BrainDerivedStateResult {
  agentQuickPicks: SelectSimpleOption[];
  analyticsSummaryQuery: SingleQuery<AnalyticsSummary>;
  effectiveAssignments: Record<AiBrainFeature, AiBrainAssignment>;
  effectiveCapabilityAssignments: Record<AiBrainCapabilityKey, AiBrainAssignment>;
  insightsQuery: SingleQuery<InsightsSnapshot>;
  liveOllamaModels: string[];
  logMetricsQuery: SingleQuery<SystemLogMetrics>;
  modelDescriptors: Record<string, BrainModelDescriptor>;
  modelQuickPicks: SelectSimpleOption[];
  ollamaModelsQuery: SingleQuery<BrainModelsResponse>;
  operationsOverviewQuery: SingleQuery<BrainOperationsOverviewResponse>;
  runtimeAnalyticsLiveEnabled: boolean;
  runtimeAnalyticsQuery: SingleQuery<AiPathRuntimeAnalyticsSummary>;
}

export type {
  BrainModelsResponse,
  BrainOperationsOverviewResponse,
  InsightsSnapshot,
};

const VENDOR_GROUP_LABELS: Record<BrainModelVendor, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  ollama: 'Ollama / Local',
};

interface RuntimeAnalyticsAssignments {
  aiPathsFeatureAssignment: AiBrainAssignment;
  aiPathsModelCapability: AiBrainAssignment;
  runtimeAnalyticsCapability: AiBrainAssignment;
  runtimeAnalyticsFeatureAssignment: AiBrainAssignment;
}

interface AppendOptionParams {
  description: string;
  includeVendorGroup?: boolean;
  options: SelectSimpleOption[];
  seen: Set<string>;
  values: readonly string[];
}

const buildEffectiveAssignments = (
  settings: AiBrainSettings
): Record<AiBrainFeature, AiBrainAssignment> =>
  Object.fromEntries(
    ALL_BRAIN_FEATURE_KEYS.map((key) => [key, resolveBrainAssignment(settings, key)])
  ) as Record<AiBrainFeature, AiBrainAssignment>;

const buildEffectiveCapabilityAssignments = (
  settings: AiBrainSettings
): Record<AiBrainCapabilityKey, AiBrainAssignment> =>
  Object.fromEntries(
    BRAIN_CAPABILITY_KEYS.map((key) => [key, resolveBrainCapabilityAssignment(settings, key)])
  ) as Record<AiBrainCapabilityKey, AiBrainAssignment>;

const resolveRuntimeAnalyticsAssignments = (
  settings: AiBrainSettings
): RuntimeAnalyticsAssignments => ({
  aiPathsFeatureAssignment: resolveBrainAssignment(settings, 'ai_paths'),
  aiPathsModelCapability: resolveBrainCapabilityAssignment(settings, 'ai_paths.model'),
  runtimeAnalyticsCapability: resolveBrainCapabilityAssignment(
    settings,
    'insights.runtime_analytics'
  ),
  runtimeAnalyticsFeatureAssignment: resolveBrainAssignment(settings, 'runtime_analytics'),
});

const getLiveOllamaModels = (data: BrainModelsResponse | undefined): string[] => {
  const liveOllamaModels = data?.sources?.liveOllamaModels;
  if (!Array.isArray(liveOllamaModels)) return [];
  return liveOllamaModels
    .map((model: string) => model.trim())
    .filter((model: string) => model.length > 0);
};

const buildModelDescriptors = (
  data: BrainModelsResponse | undefined
): Record<string, BrainModelDescriptor> => ({
  ...OPENAI_IMAGE_GENERATION_MODEL_DESCRIPTORS,
  ...(data?.descriptors ?? {}),
});

const appendUniqueOptions = ({
  description,
  includeVendorGroup = false,
  options,
  seen,
  values,
}: AppendOptionParams): void => {
  values.forEach((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) return;
    seen.add(trimmed);
    const vendor = inferBrainModelVendor(trimmed);
    options.push({
      value: trimmed,
      label: trimmed,
      description,
      group: includeVendorGroup ? VENDOR_GROUP_LABELS[vendor] : undefined,
    });
  });
};

const buildModelQuickPicks = (
  providerCatalog: AiBrainProviderCatalog,
  liveOllamaModels: string[]
): SelectSimpleOption[] => {
  const normalizedCatalogArrays = entriesToCatalogArrays(catalogToEntries(providerCatalog));
  const seen = new Set<string>();
  const options: SelectSimpleOption[] = [];
  appendUniqueOptions({
    values: normalizedCatalogArrays.modelPresets,
    description: 'preset',
    includeVendorGroup: true,
    seen,
    options,
  });
  appendUniqueOptions({
    values: OPENAI_IMAGE_GENERATION_MODEL_IDS,
    description: 'image generation',
    includeVendorGroup: true,
    seen,
    options,
  });
  appendUniqueOptions({
    values: normalizedCatalogArrays.paidModels,
    description: 'paid',
    includeVendorGroup: true,
    seen,
    options,
  });
  appendUniqueOptions({
    values: normalizedCatalogArrays.ollamaModels,
    description: 'configured',
    includeVendorGroup: true,
    seen,
    options,
  });
  appendUniqueOptions({
    values: liveOllamaModels,
    description: 'live',
    includeVendorGroup: true,
    seen,
    options,
  });
  return options;
};

const buildAgentQuickPicks = (providerCatalog: AiBrainProviderCatalog): SelectSimpleOption[] => {
  const normalizedCatalogArrays = entriesToCatalogArrays(catalogToEntries(providerCatalog));
  const seen = new Set<string>();
  const options: SelectSimpleOption[] = [];
  appendUniqueOptions({
    values: normalizedCatalogArrays.agentModels,
    description: 'agent',
    seen,
    options,
  });
  appendUniqueOptions({
    values: normalizedCatalogArrays.deepthinkingAgents,
    description: 'deepthinking',
    seen,
    options,
  });
  appendUniqueOptions({
    values: normalizedCatalogArrays.playwrightPersonas,
    description: 'playwright persona',
    seen,
    options,
  });
  return options;
};

export function useBrainDerivedState(params: BrainDerivedStateParams): BrainDerivedStateResult {
  const { activeTab, operationsRange, providerCatalog, settings } = params;
  const metricsTabActive = activeTab === 'metrics';
  const operationsTabActive = activeTab === 'operations';
  const effectiveAssignments = useMemo(() => buildEffectiveAssignments(settings), [settings]);
  const effectiveCapabilityAssignments = useMemo(
    () => buildEffectiveCapabilityAssignments(settings),
    [settings]
  );
  const runtimeAssignments = useMemo(
    () => resolveRuntimeAnalyticsAssignments(settings),
    [settings]
  );

  const ollamaModelsQuery = useBrainModels();
  const operationsOverviewQuery = useBrainOperationsOverview({
    range: operationsRange,
    enabled: operationsTabActive,
  });
  const liveOllamaModels = useMemo(
    () => getLiveOllamaModels(ollamaModelsQuery.data),
    [ollamaModelsQuery.data]
  );
  const modelDescriptors = useMemo(
    () => buildModelDescriptors(ollamaModelsQuery.data),
    [ollamaModelsQuery.data]
  );
  const modelQuickPicks = useMemo(
    () => buildModelQuickPicks(providerCatalog, liveOllamaModels),
    [liveOllamaModels, providerCatalog]
  );
  const agentQuickPicks = useMemo(() => buildAgentQuickPicks(providerCatalog), [providerCatalog]);
  const analyticsSummaryQuery: SingleQuery<AnalyticsSummary> =
    useBrainAnalyticsSummary(metricsTabActive);
  const logMetricsQuery: SingleQuery<SystemLogMetrics> = useBrainLogMetrics(metricsTabActive);
  const runtimeAnalyticsLiveEnabled =
    metricsTabActive &&
    runtimeAssignments.aiPathsFeatureAssignment.enabled &&
    runtimeAssignments.runtimeAnalyticsFeatureAssignment.enabled &&
    runtimeAssignments.runtimeAnalyticsCapability.enabled &&
    runtimeAssignments.aiPathsModelCapability.enabled;

  const insightsQuery: SingleQuery<InsightsSnapshot> =
    useBrainInsights(runtimeAnalyticsLiveEnabled, metricsTabActive);

  const runtimeAnalyticsQuery: SingleQuery<AiPathRuntimeAnalyticsSummary> =
    useBrainRuntimeAnalytics(runtimeAnalyticsLiveEnabled);

  return {
    agentQuickPicks,
    analyticsSummaryQuery,
    effectiveAssignments,
    effectiveCapabilityAssignments,
    insightsQuery,
    liveOllamaModels,
    logMetricsQuery,
    modelDescriptors,
    modelQuickPicks,
    ollamaModelsQuery,
    operationsOverviewQuery,
    runtimeAnalyticsLiveEnabled,
    runtimeAnalyticsQuery,
  };
}
