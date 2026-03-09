import { PAGE_CONTEXT_ENGINE_VERSION } from '@/features/ai/ai-context-registry/context/page-context-shared';
import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';

export const AI_INSIGHTS_CONTEXT_ROOT_IDS = [
  'page:ai-insights',
  'component:ai-insights-analytics-panel',
  'component:ai-insights-runtime-panel',
  'component:ai-insights-logs-panel',
  'action:analytics-generate-insight',
  'action:runtime-analytics-generate-insight',
  'action:system-logs-generate-insight',
  'collection:ai-insights-history',
  'collection:analytics-events',
  'collection:system-logs',
  'collection:ai-path-runs',
] as const;

export const AI_INSIGHTS_CONTEXT_RUNTIME_REF = {
  id: 'runtime:ai-insights:workspace',
  kind: 'runtime_document' as const,
  providerId: 'ai-insights-page-local',
  entityType: 'ai_insights_workspace_state',
};

type BuildAiInsightsWorkspaceContextBundleInput = {
  analyticsInsights: AiInsightRecord[];
  runtimeInsights: AiInsightRecord[];
  logInsights: AiInsightRecord[];
  analyticsRunPending: boolean;
  runtimeRunPending: boolean;
  logsRunPending: boolean;
};

const trimText = (value: string | null | undefined, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
};

const summarizeInsight = (
  insight: AiInsightRecord,
  bucket: 'analytics' | 'runtime' | 'logs'
): Record<string, unknown> => ({
  id: insight.id,
  bucket,
  createdAt: insight.createdAt ?? null,
  status: insight.status,
  source: insight.source,
  summary: trimText(insight.summary ?? null, 240),
});

export const buildAiInsightsWorkspaceRuntimeDocument = (
  input: BuildAiInsightsWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const combinedInsights = [
    ...input.analyticsInsights.slice(0, 3).map((insight) => summarizeInsight(insight, 'analytics')),
    ...input.runtimeInsights.slice(0, 3).map((insight) => summarizeInsight(insight, 'runtime')),
    ...input.logInsights.slice(0, 3).map((insight) => summarizeInsight(insight, 'logs')),
  ]
    .sort((left, right) => {
      const leftTime = new Date(String(left['createdAt'] ?? 0)).getTime();
      const rightTime = new Date(String(right['createdAt'] ?? 0)).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 8);

  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Insight buckets',
      items: [
        {
          analyticsInsightCount: input.analyticsInsights.length,
          runtimeInsightCount: input.runtimeInsights.length,
          logInsightCount: input.logInsights.length,
          analyticsRunPending: input.analyticsRunPending,
          runtimeRunPending: input.runtimeRunPending,
          logsRunPending: input.logsRunPending,
        },
      ],
    },
  ];

  if (combinedInsights.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Latest visible insights',
      summary: 'Latest analytics, runtime analytics, and log insights visible on the AI Insights page.',
      items: combinedInsights,
    });
  }

  return {
    id: AI_INSIGHTS_CONTEXT_RUNTIME_REF.id,
    kind: 'runtime_document',
    entityType: AI_INSIGHTS_CONTEXT_RUNTIME_REF.entityType,
    title: 'AI insights workspace state',
    summary:
      'Live operator context for the AI Insights dashboard, including visible analytics, runtime analytics, and log insight histories and run state.',
    status: input.analyticsRunPending || input.runtimeRunPending || input.logsRunPending ? 'running' : null,
    tags: ['ai-insights', 'admin', 'dashboard', 'live-state'],
    relatedNodeIds: [...AI_INSIGHTS_CONTEXT_ROOT_IDS],
    facts: {
      analyticsInsightCount: input.analyticsInsights.length,
      runtimeInsightCount: input.runtimeInsights.length,
      logInsightCount: input.logInsights.length,
      analyticsRunPending: input.analyticsRunPending,
      runtimeRunPending: input.runtimeRunPending,
      logsRunPending: input.logsRunPending,
    },
    sections,
    provenance: {
      source: 'ai-insights.admin.client-state',
      persisted: false,
    },
  };
};

export const buildAiInsightsWorkspaceContextBundle = (
  input: BuildAiInsightsWorkspaceContextBundleInput
): ContextRegistryResolutionBundle => ({
  refs: [AI_INSIGHTS_CONTEXT_RUNTIME_REF],
  nodes: [],
  documents: [buildAiInsightsWorkspaceRuntimeDocument(input)],
  truncated: false,
  engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
});
