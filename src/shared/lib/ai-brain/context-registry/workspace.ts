import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type { AnalyticsSummary } from '@/shared/contracts/analytics';
import type {
  BrainOperationsDomainOverview,
  BrainOperationsOverviewResponse,
  BrainOperationsRange,
  InsightsSnapshot,
} from '@/shared/contracts/ai-brain';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import type { AiPathRuntimeAnalyticsSummary } from '@/shared/contracts/ai-paths';
import type { SystemLogMetrics } from '@/shared/contracts/observability';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/shared/lib/ai-context-registry/page-context-shared';

import type { BrainTab } from '../context/BrainContext.types';
import type {
  AiBrainAssignment,
  AiBrainCapabilityKey,
  AiBrainFeature,
} from '../settings';

export const AI_BRAIN_CONTEXT_ROOT_IDS = [
  'page:brain',
  'component:brain-state-overview',
  'component:brain-operations-overview',
  'component:brain-routing-controls',
  'component:brain-provider-credentials',
  'component:brain-report-controls',
  'component:brain-metrics-dashboard',
] as const;

export const AI_BRAIN_CONTEXT_RUNTIME_REF = {
  id: 'runtime:brain:workspace',
  kind: 'runtime_document' as const,
  providerId: 'brain-page-local',
  entityType: 'ai_brain_workspace_state',
};

const AI_BRAIN_CONTEXT_RELATED_NODE_IDS = [
  ...AI_BRAIN_CONTEXT_ROOT_IDS,
  'page:analytics',
  'page:ai-insights',
  'page:system-logs',
  'page:ai-paths',
  'page:admin-chatbot',
  'page:admin-image-studio',
  'page:agent-teaching-chat',
  'collection:analytics-events',
  'collection:ai-insights-history',
  'collection:system-logs',
  'collection:ai-path-runs',
  'collection:chatbot-sessions',
  'collection:image-studio-runs',
] as const;

type BuildAiBrainWorkspaceContextBundleInput = {
  activeTab: BrainTab;
  operationsRange: BrainOperationsRange;
  saving: boolean;
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
  runtimeAnalyticsLiveEnabled: boolean;
  liveOllamaModels: string[];
  modelQuickPickCount: number;
  agentQuickPickCount: number;
  overridesEnabled: Record<AiBrainFeature, boolean>;
  featureOverrides: Partial<Record<AiBrainFeature, AiBrainAssignment | undefined>>;
  capabilityOverrides: Partial<Record<AiBrainCapabilityKey, AiBrainAssignment | undefined>>;
  effectiveAssignments: Record<AiBrainFeature, AiBrainAssignment>;
  effectiveCapabilityAssignments: Record<AiBrainCapabilityKey, AiBrainAssignment>;
  analyticsSummary: AnalyticsSummary | null | undefined;
  logMetrics: SystemLogMetrics | null | undefined;
  insights: InsightsSnapshot | null | undefined;
  runtimeAnalytics: AiPathRuntimeAnalyticsSummary | null | undefined;
  operationsOverview: BrainOperationsOverviewResponse | null | undefined;
};

const trimText = (value: string | null | undefined, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
};

const countDefinedValues = <T extends object>(record: Partial<Record<string, T | undefined>>): number =>
  Object.values(record).filter((value) => value !== undefined).length;

const summarizeAssignment = (key: string, assignment: AiBrainAssignment): Record<string, unknown> => ({
  key,
  enabled: assignment.enabled,
  provider: assignment.provider,
  target:
    assignment.provider === 'agent'
      ? assignment.agentId?.trim() || null
      : assignment.modelId?.trim() || null,
  hasSystemPrompt: Boolean(assignment.systemPrompt?.trim()),
  temperature: assignment.temperature ?? null,
  maxTokens: assignment.maxTokens ?? null,
  notes: trimText(assignment.notes ?? null, 160),
});

const summarizeInsight = (
  insight: AiInsightRecord,
  bucket: 'analytics' | 'runtime' | 'logs'
): Record<string, unknown> => ({
  id: insight.id,
  bucket,
  createdAt: insight.createdAt ?? null,
  status: insight.status,
  source: insight.source,
  summary: trimText(insight.summary ?? null, 220),
});

const getLatestInsights = (
  insights: InsightsSnapshot | null | undefined
): Record<string, unknown>[] =>
  [
    ...(insights?.analytics ?? []).slice(0, 2).map((insight) => summarizeInsight(insight, 'analytics')),
    ...(insights?.runtimeAnalytics ?? [])
      .slice(0, 2)
      .map((insight) => summarizeInsight(insight, 'runtime')),
    ...(insights?.logs ?? []).slice(0, 2).map((insight) => summarizeInsight(insight, 'logs')),
  ]
    .sort((left, right) => {
      const leftTime = new Date(String(left['createdAt'] ?? 0)).getTime();
      const rightTime = new Date(String(right['createdAt'] ?? 0)).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 6);

const summarizeOperationsDomain = (
  domain: BrainOperationsDomainOverview
): Record<string, unknown> => ({
  key: domain.key,
  label: domain.label,
  state: domain.state,
  sampleSize: domain.sampleSize,
  updatedAt: domain.updatedAt,
  metricCount: domain.metrics.length,
  recentEventCount: domain.recentEvents.length,
  trendDirection: domain.trend?.direction ?? 'unknown',
  trendDelta: domain.trend?.delta ?? 0,
  message: trimText(domain.message ?? null, 180),
});

const summarizeLiveModel = (model: string): Record<string, unknown> => ({
  source: 'live_ollama',
  model,
});

export const buildAiBrainWorkspaceRuntimeDocument = (
  input: BuildAiBrainWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const enabledFeatureAssignments = (
    Object.entries(input.effectiveAssignments) as Array<[AiBrainFeature, AiBrainAssignment]>
  )
    .filter(([, assignment]) => assignment.enabled)
    .slice(0, 12)
    .map(([feature, assignment]) => ({
      feature,
      overrideEnabled: input.overridesEnabled[feature] ?? false,
      ...summarizeAssignment(feature, assignment),
    }));

  const capabilityOverrideEntries = (
    Object.entries(input.capabilityOverrides) as Array<
      [AiBrainCapabilityKey, AiBrainAssignment | undefined]
    >
  )
    .filter(([, assignment]): assignment is AiBrainAssignment => Boolean(assignment))
    .slice(0, 14)
    .map(([capability, assignment]) => summarizeAssignment(capability, assignment));

  const latestInsights = getLatestInsights(input.insights);
  const operationsDomains = input.operationsOverview
    ? (Object.values(input.operationsOverview.domains) as BrainOperationsDomainOverview[]).map(
        summarizeOperationsDomain
      )
    : [];

  const telemetryItems: Record<string, unknown>[] = [];
  if (input.analyticsSummary) {
    telemetryItems.push({
      source: 'analytics',
      events: input.analyticsSummary.totals.events,
      pageviews: input.analyticsSummary.totals.pageviews,
      visitors: input.analyticsSummary.visitors,
      sessions: input.analyticsSummary.sessions,
      topPage: input.analyticsSummary.topPages[0]?.path ?? null,
    });
  }
  if (input.logMetrics) {
    telemetryItems.push({
      source: 'system_logs',
      total: input.logMetrics.total,
      last24Hours: input.logMetrics.last24Hours,
      last7Days: input.logMetrics.last7Days,
      topSource: input.logMetrics.topSources[0]?.source ?? null,
    });
  }
  if (input.runtimeAnalytics) {
    telemetryItems.push({
      source: 'runtime_analytics',
      range: input.runtimeAnalytics.range,
      totalRuns: input.runtimeAnalytics.runs.total,
      queuedRuns: input.runtimeAnalytics.runs.queued,
      failedRuns: input.runtimeAnalytics.runs.failed,
      successRate: input.runtimeAnalytics.runs.successRate,
      avgDurationMs: input.runtimeAnalytics.runs.avgDurationMs,
      p95DurationMs: input.runtimeAnalytics.runs.p95DurationMs,
    });
  }

  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Workspace snapshot',
      items: [
        {
          activeTab: input.activeTab,
          operationsRange: input.operationsRange,
          saving: input.saving,
          runtimeAnalyticsLiveEnabled: input.runtimeAnalyticsLiveEnabled,
          enabledFeatureCount: Object.values(input.effectiveAssignments).filter(
            (assignment) => assignment.enabled
          ).length,
          enabledCapabilityCount: Object.values(input.effectiveCapabilityAssignments).filter(
            (assignment) => assignment.enabled
          ).length,
          featureOverrideCount: countDefinedValues(input.featureOverrides),
          capabilityOverrideCount: countDefinedValues(input.capabilityOverrides),
          overrideEnabledFeatureCount: Object.values(input.overridesEnabled).filter(Boolean).length,
          liveOllamaModelCount: input.liveOllamaModels.length,
          modelQuickPickCount: input.modelQuickPickCount,
          agentQuickPickCount: input.agentQuickPickCount,
          visibleInsightCount: latestInsights.length,
          operationsDomainCount: operationsDomains.length,
        },
      ],
    },
    {
      kind: 'items',
      title: 'Report automation and prompts',
      summary:
        'Current Brain-controlled schedules and prompt steering for analytics, runtime analytics, and system log reports.',
      items: [
        {
          report: 'analytics',
          scheduleEnabled: input.analyticsScheduleEnabled,
          scheduleMinutes: input.analyticsScheduleMinutes,
          systemPromptPreview: trimText(input.analyticsPromptSystem, 220),
        },
        {
          report: 'runtime_analytics',
          scheduleEnabled: input.runtimeAnalyticsScheduleEnabled,
          scheduleMinutes: input.runtimeAnalyticsScheduleMinutes,
          systemPromptPreview: trimText(input.runtimeAnalyticsPromptSystem, 220),
        },
        {
          report: 'system_logs',
          scheduleEnabled: input.logsScheduleEnabled,
          scheduleMinutes: input.logsScheduleMinutes,
          autoOnError: input.logsAutoOnError,
          systemPromptPreview: trimText(input.logsPromptSystem, 220),
        },
      ],
    },
  ];

  if (enabledFeatureAssignments.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Effective feature routing',
      summary: 'Enabled Brain feature assignments currently active in the control plane.',
      items: enabledFeatureAssignments,
    });
  }

  if (capabilityOverrideEntries.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Capability overrides',
      summary: 'Explicit Brain capability overrides currently configured on top of the defaults.',
      items: capabilityOverrideEntries,
    });
  }

  if (input.liveOllamaModels.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Live model catalog',
      summary: 'Currently visible live Ollama models available to the AI Brain workspace.',
      items: input.liveOllamaModels.slice(0, 10).map(summarizeLiveModel),
    });
  }

  if (latestInsights.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Latest visible insights',
      summary:
        'Most recent analytics, runtime analytics, and system log insights visible in the Brain dashboard.',
      items: latestInsights,
    });
  }

  if (operationsDomains.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Operations overview',
      summary:
        'Current Brain operations status across AI Paths, chatbot, agent runtime, and Image Studio.',
      items: operationsDomains,
    });
  }

  if (telemetryItems.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Telemetry snapshot',
      summary: 'Current high-level telemetry surfaced into the AI Brain dashboard.',
      items: telemetryItems,
    });
  }

  return {
    id: AI_BRAIN_CONTEXT_RUNTIME_REF.id,
    kind: 'runtime_document',
    entityType: AI_BRAIN_CONTEXT_RUNTIME_REF.entityType,
    title: 'AI Brain workspace state',
    summary:
      'Live operator context for the AI Brain control plane, including routing state, schedules, prompt steering, model availability, and operational telemetry.',
    status: input.saving ? 'saving' : null,
    tags: ['ai-brain', 'admin', 'control-plane', 'live-state'],
    relatedNodeIds: [...new Set(AI_BRAIN_CONTEXT_RELATED_NODE_IDS)],
    facts: {
      activeTab: input.activeTab,
      operationsRange: input.operationsRange,
      saving: input.saving,
      runtimeAnalyticsLiveEnabled: input.runtimeAnalyticsLiveEnabled,
      featureOverrideCount: countDefinedValues(input.featureOverrides),
      capabilityOverrideCount: countDefinedValues(input.capabilityOverrides),
      enabledFeatureCount: Object.values(input.effectiveAssignments).filter(
        (assignment) => assignment.enabled
      ).length,
      enabledCapabilityCount: Object.values(input.effectiveCapabilityAssignments).filter(
        (assignment) => assignment.enabled
      ).length,
      liveOllamaModelCount: input.liveOllamaModels.length,
      modelQuickPickCount: input.modelQuickPickCount,
      agentQuickPickCount: input.agentQuickPickCount,
      analyticsEventCount: input.analyticsSummary?.totals.events ?? null,
      logTotal: input.logMetrics?.total ?? null,
      runtimeRunTotal: input.runtimeAnalytics?.runs.total ?? null,
      visibleInsightCount: latestInsights.length,
      operationsDomainCount: operationsDomains.length,
    },
    sections,
    provenance: {
      source: 'ai-brain.admin.client-state',
      persisted: false,
    },
  };
};

export const buildAiBrainWorkspaceContextBundle = (
  input: BuildAiBrainWorkspaceContextBundleInput
): ContextRegistryResolutionBundle => ({
  refs: [AI_BRAIN_CONTEXT_RUNTIME_REF],
  nodes: [],
  documents: [buildAiBrainWorkspaceRuntimeDocument(input)],
  truncated: false,
  engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
});
