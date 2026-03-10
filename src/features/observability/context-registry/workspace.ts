import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import type {
  SystemLogMetricsDto as SystemLogMetrics,
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts/observability';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/shared/lib/ai-context-registry/page-context-shared';

export const SYSTEM_LOGS_CONTEXT_ROOT_IDS = [
  'page:system-logs',
  'component:system-logs-filter-panel',
  'component:system-logs-metrics',
  'component:system-logs-ai-interpreter',
  'component:system-logs-event-stream',
  'action:system-logs-generate-insight',
  'action:system-logs-interpret',
  'collection:system-logs',
] as const;

export const SYSTEM_LOGS_CONTEXT_RUNTIME_REF = {
  id: 'runtime:system-logs:workspace',
  kind: 'runtime_document' as const,
  providerId: 'system-logs-page-local',
  entityType: 'system_logs_workspace_state',
};

type BuildSystemLogsWorkspaceContextBundleInput = {
  level: string;
  query: string;
  source: string;
  service: string;
  method: string;
  statusCode: string;
  minDurationMs: string;
  requestId: string;
  traceId: string;
  correlationId: string;
  userId: string;
  fingerprint: string;
  category: string;
  fromDate: string;
  toDate: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  logs: SystemLogRecord[];
  metrics: SystemLogMetrics | null;
  insights: AiInsightRecord[];
  interpretationCount: number;
};

const trimText = (value: string | null | undefined, maxLength: number): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

const countActiveFilters = (
  input: Pick<
    BuildSystemLogsWorkspaceContextBundleInput,
    | 'level'
    | 'query'
    | 'source'
    | 'service'
    | 'method'
    | 'statusCode'
    | 'minDurationMs'
    | 'requestId'
    | 'traceId'
    | 'correlationId'
    | 'userId'
    | 'fingerprint'
    | 'category'
    | 'fromDate'
    | 'toDate'
  >
): number =>
  [
    input.level !== 'all' ? input.level : '',
    input.query,
    input.source,
    input.service,
    input.method,
    input.statusCode,
    input.minDurationMs,
    input.requestId,
    input.traceId,
    input.correlationId,
    input.userId,
    input.fingerprint,
    input.category,
    input.fromDate,
    input.toDate,
  ].filter((value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    return value !== null && value !== undefined;
  }).length;

const summarizeLog = (log: SystemLogRecord): Record<string, unknown> => ({
  id: log.id,
  createdAt: log.createdAt ?? null,
  level: log.level,
  message: trimText(log.message, 240),
  source: log.source ?? null,
  service: log.service ?? null,
  category: log.category ?? null,
  path: log.path ?? null,
  method: log.method ?? null,
  statusCode: log.statusCode ?? null,
});

const summarizeInsight = (insight: AiInsightRecord): Record<string, unknown> => ({
  id: insight.id,
  createdAt: insight.createdAt ?? null,
  status: insight.status,
  source: insight.source,
  summary: trimText(insight.summary ?? null, 260),
  warningCount: insight.warnings?.length ?? 0,
  recommendationCount: insight.recommendations?.length ?? 0,
});

export const buildSystemLogsWorkspaceRuntimeDocument = (
  input: BuildSystemLogsWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Workspace snapshot',
      items: [
        {
          page: input.page,
          pageSize: input.pageSize,
          total: input.total,
          totalPages: input.totalPages,
          visibleLogCount: input.logs.length,
          insightCount: input.insights.length,
          interpretationCount: input.interpretationCount,
          activeFilterCount: countActiveFilters(input),
        },
      ],
    },
    {
      kind: 'facts',
      title: 'Active filters',
      items: [
        {
          level: input.level,
          query: trimText(input.query, 120),
          source: trimText(input.source, 120),
          service: trimText(input.service, 120),
          method: trimText(input.method, 20),
          statusCode: trimText(input.statusCode, 20),
          minDurationMs: trimText(input.minDurationMs, 20),
          requestId: trimText(input.requestId, 80),
          traceId: trimText(input.traceId, 80),
          correlationId: trimText(input.correlationId, 80),
          userId: trimText(input.userId, 80),
          fingerprint: trimText(input.fingerprint, 120),
          category: trimText(input.category, 80),
          fromDate: input.fromDate || null,
          toDate: input.toDate || null,
        },
      ],
    },
  ];

  if (input.metrics) {
    sections.push({
      kind: 'facts',
      title: 'Metrics snapshot',
      items: [
        {
          total: input.metrics.total,
          last24Hours: input.metrics.last24Hours,
          last7Days: input.metrics.last7Days,
          levels: input.metrics.levels,
          topSources: input.metrics.topSources?.slice(0, 5) ?? [],
          topServices: input.metrics.topServices?.slice(0, 5) ?? [],
          topPaths: input.metrics.topPaths?.slice(0, 5) ?? [],
          generatedAt: input.metrics.generatedAt,
        },
      ],
    });
  }

  if (input.logs.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Visible logs',
      summary: 'The currently visible system log rows on the Observation Post page.',
      items: input.logs.slice(0, 8).map(summarizeLog),
    });
  }

  if (input.insights.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Latest AI insights',
      summary: 'Recent log insight reports already visible in the Observation Post workspace.',
      items: input.insights.slice(0, 5).map(summarizeInsight),
    });
  }

  return {
    id: SYSTEM_LOGS_CONTEXT_RUNTIME_REF.id,
    kind: 'runtime_document',
    entityType: SYSTEM_LOGS_CONTEXT_RUNTIME_REF.entityType,
    title: 'Observation Post workspace state',
    summary:
      'Live operator context for the system logs page, including active filters, visible events, ' +
      'AI insights, and telemetry metrics.',
    status: null,
    tags: ['observability', 'system-logs', 'admin', 'live-state'],
    relatedNodeIds: [...SYSTEM_LOGS_CONTEXT_ROOT_IDS],
    facts: {
      page: input.page,
      pageSize: input.pageSize,
      total: input.total,
      totalPages: input.totalPages,
      visibleLogCount: input.logs.length,
      insightCount: input.insights.length,
      interpretationCount: input.interpretationCount,
      activeFilterCount: countActiveFilters(input),
      level: input.level,
      hasSearchQuery: typeof input.query === 'string' && input.query.trim().length > 0,
      hasSourceFilter: typeof input.source === 'string' && input.source.trim().length > 0,
      hasServiceFilter: typeof input.service === 'string' && input.service.trim().length > 0,
      hasDateRange: Boolean(input.fromDate || input.toDate),
    },
    sections,
    provenance: {
      source: 'observability.system-logs.client-state',
      persisted: false,
    },
  };
};

export const buildSystemLogsWorkspaceContextBundle = (
  input: BuildSystemLogsWorkspaceContextBundleInput
): ContextRegistryResolutionBundle => ({
  refs: [SYSTEM_LOGS_CONTEXT_RUNTIME_REF],
  nodes: [],
  documents: [buildSystemLogsWorkspaceRuntimeDocument(input)],
  truncated: false,
  engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
});
