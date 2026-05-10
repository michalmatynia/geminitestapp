import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/components.ts';

export const componentNodesPart2: ContextNode[] = [
  {
    id: 'component:system-logs-filter-panel',
    kind: 'component',
    name: 'SystemLogsFilterPanel',
    description:
      'Filter controls for narrowing the Observation Post event stream by level, source, service, identifiers, duration, and time range.',
    tags: ['observability', 'logs', 'filters', 'admin'],
    relationships: [
      { type: 'uses', targetId: 'page:system-logs' },
      { type: 'reads', targetId: 'collection:system-logs' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:system-logs-metrics',
    kind: 'component',
    name: 'SystemLogsMetrics',
    description:
      'Metrics cards and diagnostics summaries for the Observation Post page, showing aggregate log counts, top sources, and operational signals.',
    tags: ['observability', 'logs', 'metrics', 'admin'],
    relationships: [
      { type: 'uses', targetId: 'page:system-logs' },
      { type: 'reads', targetId: 'collection:system-logs' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:system-logs-ai-interpreter',
    kind: 'component',
    name: 'AiLogInterpreter',
    description:
      'Insight panel in the Observation Post workspace for generating log-wide AI reports and browsing recent outputs.',
    tags: ['observability', 'logs', 'ai', 'insights', 'admin'],
    relationships: [
      { type: 'uses', targetId: 'page:system-logs' },
      { type: 'uses', targetId: 'action:system-logs-generate-insight' },
      { type: 'reads', targetId: 'collection:system-logs' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:system-logs-event-stream',
    kind: 'component',
    name: 'EventStreamPanel',
    description:
      'Primary event-stream table in Observation Post for reviewing logs, expanded runtime context, and per-row AI interpretation tools.',
    tags: ['observability', 'logs', 'table', 'admin', 'ai'],
    relationships: [
      { type: 'uses', targetId: 'page:system-logs' },
      { type: 'uses', targetId: 'action:system-logs-interpret' },
      { type: 'reads', targetId: 'collection:system-logs' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:analytics-dashboard-header',
    kind: 'component',
    name: 'AnalyticsDashboardHeader',
    description:
      'Header controls for the analytics dashboard, including range and scope selection for the current summary.',
    tags: ['analytics', 'admin', 'header', 'filters'],
    relationships: [
      { type: 'uses', targetId: 'page:analytics' },
      { type: 'reads', targetId: 'collection:analytics-events' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:analytics-ai-insights',
    kind: 'component',
    name: 'AnalyticsAiInsights',
    description:
      'Analytics dashboard panel for listing analytics insight history and triggering a new analytics insight run.',
    tags: ['analytics', 'admin', 'insights', 'ai'],
    relationships: [
      { type: 'uses', targetId: 'page:analytics' },
      { type: 'uses', targetId: 'action:analytics-generate-insight' },
      { type: 'reads', targetId: 'collection:ai-insights-history' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:analytics-metrics-grid',
    kind: 'component',
    name: 'AnalyticsMetricsGrid',
    description:
      'Primary metrics cards on the analytics dashboard for totals, traffic, and visitor/session summary values.',
    tags: ['analytics', 'admin', 'metrics'],
    relationships: [
      { type: 'uses', targetId: 'page:analytics' },
      { type: 'reads', targetId: 'collection:analytics-events' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:analytics-top-stats',
    kind: 'component',
    name: 'AnalyticsTopStats',
    description:
      'Breakdown panels on the analytics dashboard for top pages, referrers, languages, devices, and other dimensions.',
    tags: ['analytics', 'admin', 'dimensions'],
    relationships: [
      { type: 'uses', targetId: 'page:analytics' },
      { type: 'reads', targetId: 'collection:analytics-events' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:analytics-recent-events-table',
    kind: 'component',
    name: 'RecentEventsTable',
    description:
      'Recent analytics event list shown on the analytics dashboard for the currently selected range and scope.',
    tags: ['analytics', 'admin', 'events', 'table'],
    relationships: [
      { type: 'uses', targetId: 'page:analytics' },
      { type: 'reads', targetId: 'collection:analytics-events' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:ai-insights-analytics-panel',
    kind: 'component',
    name: 'AnalyticsInsightsPanel',
    description:
      'AI Insights dashboard panel for browsing analytics insights and triggering analytics insight runs.',
    tags: ['ai-insights', 'analytics', 'admin', 'panel'],
    relationships: [
      { type: 'uses', targetId: 'page:ai-insights' },
      { type: 'uses', targetId: 'action:analytics-generate-insight' },
      { type: 'reads', targetId: 'collection:ai-insights-history' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:ai-insights-runtime-panel',
    kind: 'component',
    name: 'RuntimeAnalyticsInsightsPanel',
    description:
      'AI Insights dashboard panel for runtime analytics insight history and manual runtime insight generation.',
    tags: ['ai-insights', 'runtime-analytics', 'admin', 'panel'],
    relationships: [
      { type: 'uses', targetId: 'page:ai-insights' },
      { type: 'uses', targetId: 'action:runtime-analytics-generate-insight' },
      { type: 'reads', targetId: 'collection:ai-path-runs' },
      { type: 'reads', targetId: 'collection:ai-insights-history' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
