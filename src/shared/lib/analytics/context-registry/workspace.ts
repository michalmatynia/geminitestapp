import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import type { AnalyticsSummary } from '@/shared/contracts/analytics';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/shared/lib/ai-context-registry/page-context-shared';

export const ANALYTICS_CONTEXT_ROOT_IDS = [
  'page:analytics',
  'component:analytics-dashboard-header',
  'component:analytics-ai-insights',
  'component:analytics-metrics-grid',
  'component:analytics-top-stats',
  'component:analytics-recent-events-table',
  'action:analytics-generate-insight',
  'collection:analytics-events',
  'collection:ai-insights-history',
] as const;

export const ANALYTICS_CONTEXT_RUNTIME_REF = {
  id: 'runtime:analytics:workspace',
  kind: 'runtime_document' as const,
  providerId: 'analytics-page-local',
  entityType: 'analytics_workspace_state',
};

type BuildAnalyticsWorkspaceContextBundleInput = {
  range: string;
  scope: string;
  fromToLabel: string | null;
  summary: AnalyticsSummary | null | undefined;
  insights: AiInsightRecord[];
  latestInsightStatus: string | null;
};

const trimText = (value: string | null | undefined, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
};

const summarizeInsight = (insight: AiInsightRecord): Record<string, unknown> => ({
  id: insight.id,
  createdAt: insight.createdAt ?? null,
  status: insight.status,
  source: insight.source,
  summary: trimText(insight.summary ?? null, 260),
});

export const buildAnalyticsWorkspaceRuntimeDocument = (
  input: BuildAnalyticsWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const summary = input.summary ?? null;
  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Workspace snapshot',
      items: [
        {
          range: input.range,
          scope: input.scope,
          fromToLabel: input.fromToLabel,
          insightCount: input.insights.length,
          latestInsightStatus: input.latestInsightStatus,
        },
      ],
    },
  ];

  if (summary) {
    sections.push({
      kind: 'facts',
      title: 'Summary totals',
      items: [
        {
          from: summary.from,
          to: summary.to,
          scope: summary.scope,
          events: summary.totals.events,
          pageviews: summary.totals.pageviews,
          visitors: summary.visitors,
          sessions: summary.sessions,
        },
      ],
    });

    sections.push({
      kind: 'items',
      title: 'Top pages',
      summary: 'Highest-volume pages in the currently visible analytics summary.',
      items: summary.topPages.slice(0, 8),
    });

    if (summary.recent.length > 0) {
      sections.push({
        kind: 'items',
        title: 'Recent events',
        summary: 'Recent analytics events visible in the current dashboard summary.',
        items: summary.recent.slice(0, 8).map((event) => ({
          id: event.id,
          ts: event.ts,
          type: event.type,
          scope: event.scope,
          path: event.path,
          name: event.name ?? null,
        })),
      });
    }
  }

  if (input.insights.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Latest analytics insights',
      summary: 'Most recent analytics insight records already visible in the analytics dashboard.',
      items: input.insights.slice(0, 5).map(summarizeInsight),
    });
  }

  return {
    id: ANALYTICS_CONTEXT_RUNTIME_REF.id,
    kind: 'runtime_document',
    entityType: ANALYTICS_CONTEXT_RUNTIME_REF.entityType,
    title: 'Analytics workspace state',
    summary:
      'Live operator context for the analytics dashboard, including selected range, scope, summary totals, recent events, and AI insight history.',
    status: input.latestInsightStatus,
    tags: ['analytics', 'admin', 'dashboard', 'live-state'],
    relatedNodeIds: [...ANALYTICS_CONTEXT_ROOT_IDS],
    facts: {
      range: input.range,
      scope: input.scope,
      fromToLabel: input.fromToLabel,
      insightCount: input.insights.length,
      latestInsightStatus: input.latestInsightStatus,
      events: summary?.totals.events ?? null,
      pageviews: summary?.totals.pageviews ?? null,
      visitors: summary?.visitors ?? null,
      sessions: summary?.sessions ?? null,
      recentEventCount: summary?.recent.length ?? 0,
    },
    sections,
    provenance: {
      source: 'analytics.admin.client-state',
      persisted: false,
    },
  };
};

export const buildAnalyticsWorkspaceContextBundle = (
  input: BuildAnalyticsWorkspaceContextBundleInput
): ContextRegistryResolutionBundle => ({
  refs: [ANALYTICS_CONTEXT_RUNTIME_REF],
  nodes: [],
  documents: [buildAnalyticsWorkspaceRuntimeDocument(input)],
  truncated: false,
  engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
});
