'use client';

import { useMemo } from 'react';

import type { AiPathRuntimeAnalyticsSummary, AnalyticsSummary } from '@/shared/contracts';
import type { BrainOperationsRange } from '@/shared/contracts/ai-brain';
import type { SystemLogMetrics } from '@/shared/contracts/observability';
import type { SingleQuery } from '@/shared/contracts/ui';
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
} from '@/shared/lib/ai-brain/hooks/useBrainQueries';
import { type SelectSimpleOption } from '@/shared/ui';

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
import {
  catalogToEntries,
  entriesToCatalogArrays,
} from '@/shared/lib/ai-brain/catalog-entries';

interface BrainDerivedStateParams {
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

export function useBrainDerivedState({
  operationsRange,
  providerCatalog,
  settings,
}: BrainDerivedStateParams): BrainDerivedStateResult {
  const effectiveAssignments = useMemo((): Record<AiBrainFeature, AiBrainAssignment> => {
    return ALL_BRAIN_FEATURE_KEYS.reduce<Record<AiBrainFeature, AiBrainAssignment>>(
      (acc: Record<AiBrainFeature, AiBrainAssignment>, key: AiBrainFeature) => {
        acc[key] = resolveBrainAssignment(settings, key);
        return acc;
      },
      {} as Record<AiBrainFeature, AiBrainAssignment>
    );
  }, [settings]);

  const effectiveCapabilityAssignments = useMemo(
    (): Record<AiBrainCapabilityKey, AiBrainAssignment> =>
      BRAIN_CAPABILITY_KEYS.reduce<Record<AiBrainCapabilityKey, AiBrainAssignment>>(
        (acc, key) => {
          acc[key] = resolveBrainCapabilityAssignment(settings, key);
          return acc;
        },
        {} as Record<AiBrainCapabilityKey, AiBrainAssignment>
      ),
    [settings]
  );

  const ollamaModelsQuery = useBrainModels();
  const operationsOverviewQuery = useBrainOperationsOverview({ range: operationsRange });

  const runtimeAnalyticsCapability = useMemo(
    (): AiBrainAssignment =>
      resolveBrainCapabilityAssignment(settings, 'insights.runtime_analytics'),
    [settings]
  );
  const aiPathsModelCapability = useMemo(
    (): AiBrainAssignment => resolveBrainCapabilityAssignment(settings, 'ai_paths.model'),
    [settings]
  );

  const liveOllamaModels = useMemo((): string[] => {
    const models = Array.isArray(ollamaModelsQuery.data?.sources?.liveOllamaModels)
      ? (ollamaModelsQuery.data?.sources?.liveOllamaModels ?? [])
      : [];
    return models.map((model: string) => model.trim()).filter((model: string) => model.length > 0);
  }, [ollamaModelsQuery.data?.sources?.liveOllamaModels]);

  const modelQuickPicks = useMemo((): SelectSimpleOption[] => {
    const normalizedCatalogArrays = entriesToCatalogArrays(catalogToEntries(providerCatalog));
    const seen = new Set<string>();
    const options: SelectSimpleOption[] = [];
    const append = (values: string[], source: string): void => {
      values.forEach((value: string) => {
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) return;
        seen.add(trimmed);
        options.push({
          value: trimmed,
          label: trimmed,
          description: source,
        });
      });
    };
    append(normalizedCatalogArrays.modelPresets, 'model preset');
    append(normalizedCatalogArrays.paidModels, 'paid model');
    append(normalizedCatalogArrays.ollamaModels, 'ollama');
    append(liveOllamaModels, 'ollama (live)');
    return options;
  }, [liveOllamaModels, providerCatalog]);

  const agentQuickPicks = useMemo((): SelectSimpleOption[] => {
    const normalizedCatalogArrays = entriesToCatalogArrays(catalogToEntries(providerCatalog));
    const seen = new Set<string>();
    const options: SelectSimpleOption[] = [];
    const append = (values: string[], source: string): void => {
      values.forEach((value: string) => {
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) return;
        seen.add(trimmed);
        options.push({
          value: trimmed,
          label: trimmed,
          description: source,
        });
      });
    };
    append(normalizedCatalogArrays.agentModels, 'agent');
    append(normalizedCatalogArrays.deepthinkingAgents, 'deepthinking');
    append(normalizedCatalogArrays.playwrightPersonas, 'playwright persona');
    return options;
  }, [providerCatalog]);

  const analyticsSummaryQuery: SingleQuery<AnalyticsSummary> = useBrainAnalyticsSummary();
  const logMetricsQuery: SingleQuery<SystemLogMetrics> = useBrainLogMetrics();
  const insightsQuery: SingleQuery<InsightsSnapshot> = useBrainInsights();

  const runtimeAnalyticsLiveEnabled =
    runtimeAnalyticsCapability.enabled && aiPathsModelCapability.enabled;
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
    modelQuickPicks,
    ollamaModelsQuery,
    operationsOverviewQuery,
    runtimeAnalyticsLiveEnabled,
    runtimeAnalyticsQuery,
  };
}
