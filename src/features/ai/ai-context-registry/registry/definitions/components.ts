import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/components.ts';

export const componentNodes: ContextNode[] = [
  {
    id: 'component:context-registry-inspector',
    kind: 'component',
    name: 'ContextRegistryInspector',
    description:
      'Inspector workspace used by the admin Context Registry page. Presents searchable nodes, ' +
      'relationship previews, bundle envelopes, runtime document inspection, and AI tool metadata.',
    tags: ['ai', 'context', 'registry', 'inspector', 'admin'],
    relationships: [{ type: 'uses', targetId: 'page:context-registry' }],
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
    id: 'component:cms-page-builder-preview',
    kind: 'component',
    name: 'CmsPageBuilderPreview',
    description:
      'Primary live preview canvas in the CMS page builder. Renders the current page structure, ' +
      'drag-and-drop surface, responsive preview state, and persisted theme context.',
    tags: ['cms', 'page-builder', 'preview', 'editor'],
    relationships: [
      { type: 'uses', targetId: 'page:cms-page-builder' },
      { type: 'reads', targetId: 'collection:cms-pages' },
      { type: 'reads', targetId: 'collection:cms-themes' },
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
    id: 'component:cms-page-builder-inspector',
    kind: 'component',
    name: 'CmsPageBuilderInspector',
    description:
      'Right-hand inspector in the CMS page builder for editing selected page, section, block, ' +
      'and AI-assisted settings.',
    tags: ['cms', 'page-builder', 'inspector', 'ai', 'editor'],
    relationships: [
      { type: 'uses', targetId: 'page:cms-page-builder' },
      { type: 'uses', targetId: 'action:cms-css-ai-stream' },
      { type: 'reads', targetId: 'collection:cms-pages' },
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
    id: 'component:cms-theme-settings-panel',
    kind: 'component',
    name: 'CmsThemeSettingsPanel',
    description:
      'Theme editing panel used inside the CMS page builder for color schemes, typography, layout, ' +
      'branding, and AI-assisted theme generation.',
    tags: ['cms', 'theme', 'settings', 'ai', 'editor'],
    relationships: [
      { type: 'uses', targetId: 'page:cms-page-builder' },
      { type: 'uses', targetId: 'action:cms-css-ai-stream' },
      { type: 'reads', targetId: 'collection:cms-themes' },
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
    id: 'component:agent-teaching-chat-panel',
    kind: 'component',
    name: 'AgentTeachingChatPanel',
    description:
      'Chat workspace in Agent Creator used to select learner agents, send questions, and inspect retrieved sources.',
    tags: ['agent-creator', 'teaching', 'chat', 'rag'],
    relationships: [
      { type: 'uses', targetId: 'page:agent-teaching-chat' },
      { type: 'uses', targetId: 'action:agent-teaching-chat' },
      { type: 'reads', targetId: 'collection:agent-teaching-agents' },
      { type: 'reads', targetId: 'collection:agent-teaching-embedding-collections' },
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
    id: 'component:chatbot-chat-interface',
    kind: 'component',
    name: 'ChatbotChatInterface',
    description:
      'Primary chat panel in the admin Chatbot workspace for viewing the active conversation and sending messages.',
    tags: ['chatbot', 'admin', 'chat', 'conversation'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-chatbot' },
      { type: 'uses', targetId: 'action:chatbot-chat' },
      { type: 'reads', targetId: 'collection:chatbot-sessions' },
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
    id: 'component:chatbot-session-sidebar',
    kind: 'component',
    name: 'ChatbotSessionSidebar',
    description:
      'Session navigation column for browsing, creating, selecting, and deleting chatbot conversations.',
    tags: ['chatbot', 'admin', 'sessions', 'sidebar'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-chatbot' },
      { type: 'reads', targetId: 'collection:chatbot-sessions' },
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
    id: 'component:chatbot-settings-panel',
    kind: 'component',
    name: 'ChatbotSettingsPanel',
    description:
      'Settings tab in the admin Chatbot workspace for persona selection, web search, and operator-authored context.',
    tags: ['chatbot', 'admin', 'settings', 'context'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-chatbot' },
      { type: 'uses', targetId: 'action:chatbot-chat' },
      { type: 'reads', targetId: 'collection:chatbot-sessions' },
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
    id: 'component:chatbot-debug-panel',
    kind: 'component',
    name: 'ChatbotDebugPanel',
    description:
      'Debug panel in the admin Chatbot workspace for recent run state, diagnostics, and agent execution visibility.',
    tags: ['chatbot', 'admin', 'debug', 'agent'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-chatbot' },
      { type: 'uses', targetId: 'action:chatbot-chat' },
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
    id: 'component:kangur-lesson-narrator',
    kind: 'component',
    name: 'KangurLessonNarrator',
    description:
      'Learner-facing narration control used in Kangur lessons and tests to request server-side lesson audio or browser fallback playback.',
    tags: ['kangur', 'tts', 'narration', 'learner', 'audio'],
    relationships: [
      { type: 'uses', targetId: 'page:kangur-lessons' },
      { type: 'uses', targetId: 'page:kangur-tests' },
      { type: 'uses', targetId: 'action:kangur-lesson-tts' },
      { type: 'reads', targetId: 'collection:kangur-lessons' },
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
    id: 'component:kangur-lesson-narration-panel',
    kind: 'component',
    name: 'KangurLessonNarrationPanel',
    description:
      'Admin lesson-editor narration preview panel for choosing voice, previewing generated audio, and checking cached Kangur lesson narration.',
    tags: ['kangur', 'tts', 'narration', 'admin', 'editor'],
    relationships: [
      { type: 'uses', targetId: 'page:kangur-admin-lessons-manager' },
      { type: 'uses', targetId: 'action:kangur-lesson-tts' },
      { type: 'reads', targetId: 'collection:kangur-lessons' },
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
  {
    id: 'component:ai-insights-logs-panel',
    kind: 'component',
    name: 'LogInsightsPanel',
    description:
      'AI Insights dashboard panel for browsing system log insights and manually triggering a log insight run.',
    tags: ['ai-insights', 'logs', 'admin', 'panel'],
    relationships: [
      { type: 'uses', targetId: 'page:ai-insights' },
      { type: 'uses', targetId: 'action:system-logs-generate-insight' },
      { type: 'reads', targetId: 'collection:system-logs' },
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
    id: 'component:image-studio-slot-tree',
    kind: 'component',
    name: 'ImageStudioSlotTree',
    description:
      'Left-hand slot tree in Image Studio for browsing folders, selecting slots, and organizing project assets.',
    tags: ['image-studio', 'slots', 'tree', 'sidebar'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-image-studio' },
      { type: 'reads', targetId: 'collection:image-studio-projects' },
      { type: 'reads', targetId: 'collection:image-studio-slots' },
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
    id: 'component:image-studio-center-preview',
    kind: 'component',
    name: 'ImageStudioCenterPreview',
    description:
      'Central preview canvas in Image Studio for the active slot, masks, focus mode, and generation results.',
    tags: ['image-studio', 'preview', 'canvas', 'mask'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-image-studio' },
      { type: 'reads', targetId: 'collection:image-studio-slots' },
      { type: 'uses', targetId: 'action:image-studio-run' },
      { type: 'uses', targetId: 'action:image-studio-sequence-run' },
      { type: 'uses', targetId: 'action:image-studio-ai-path-object-analysis' },
      { type: 'uses', targetId: 'action:image-studio-mask-ai' },
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
    id: 'component:image-studio-right-sidebar',
    kind: 'component',
    name: 'ImageStudioRightSidebar',
    description:
      'Right-side controls in Image Studio for prompt editing, prompt params, masks, settings, and run history.',
    tags: ['image-studio', 'sidebar', 'prompt', 'settings'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-image-studio' },
      { type: 'reads', targetId: 'collection:image-studio-runs' },
      { type: 'uses', targetId: 'action:image-studio-run' },
      { type: 'uses', targetId: 'action:image-studio-sequence-run' },
      { type: 'uses', targetId: 'action:image-studio-ai-path-object-analysis' },
      { type: 'uses', targetId: 'action:image-studio-prompt-extract' },
      { type: 'uses', targetId: 'action:image-studio-ui-extractor' },
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
    id: 'component:image-studio-generation-toolbar',
    kind: 'component',
    name: 'ImageStudioGenerationToolbar',
    description:
      'Top-level generation controls in Image Studio for launching runs, switching tabs, and reviewing in-flight state.',
    tags: ['image-studio', 'toolbar', 'generation', 'controls'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-image-studio' },
      { type: 'uses', targetId: 'action:image-studio-run' },
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
    id: 'component:ai-paths-canvas-board',
    kind: 'component',
    name: 'AiPathsCanvasBoard',
    description:
      'Primary AI Paths canvas for node layout, wiring, selection, and run visualization.',
    tags: ['ai-paths', 'canvas', 'graph', 'editor'],
    relationships: [
      { type: 'uses', targetId: 'page:ai-paths' },
      { type: 'uses', targetId: 'action:run-ai-path' },
      { type: 'reads', targetId: 'collection:ai-path-runs' },
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
    id: 'component:ai-paths-paths-panel',
    kind: 'component',
    name: 'AiPathsPathsPanel',
    description:
      'Path list and metadata panel for switching active workflows, managing names, and toggling path status.',
    tags: ['ai-paths', 'paths', 'sidebar', 'metadata'],
    relationships: [{ type: 'uses', targetId: 'page:ai-paths' }],
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
    id: 'component:ai-paths-docs-panel',
    kind: 'component',
    name: 'AiPathsDocsPanel',
    description:
      'Docs and validation view for AI Paths, including runtime guidance, validation rules, and reference snippets.',
    tags: ['ai-paths', 'docs', 'validation', 'reference'],
    relationships: [{ type: 'uses', targetId: 'page:ai-paths' }],
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
    id: 'component:ai-paths-node-config-dialog',
    kind: 'component',
    name: 'AiPathsNodeConfigDialog',
    description:
      'Node configuration dialog in AI Paths for editing node settings, previewing prompts, and sending prompt drafts to a model.',
    tags: ['ai-paths', 'node-config', 'dialog', 'ai'],
    relationships: [
      { type: 'uses', targetId: 'page:ai-paths' },
      { type: 'uses', targetId: 'action:ai-paths-preview-model' },
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
    id: 'component:product-filters',
    kind: 'component',
    name: 'ProductFilters',
    description:
      'Sidebar filter panel used on the Products page. Supports filtering by category, ' +
      'status, price range, and custom tags.',
    tags: ['products', 'filter', 'ui', 'sidebar'],
    relationships: [
      { type: 'uses', targetId: 'page:products' },
      { type: 'reads', targetId: 'collection:products' },
    ],
    examples: [
      { title: 'Filter by status', input: { status: 'active' } },
      { title: 'Filter by price range', input: { priceMin: 0, priceMax: 100 } },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'public',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'component:product-form',
    kind: 'component',
    name: 'ProductForm',
    description:
      'Tabbed product editor form for managing catalog fields, images, note links, validation, ' +
      'and studio integrations for a single product.',
    tags: ['products', 'editor', 'form', 'admin'],
    relationships: [
      { type: 'uses', targetId: 'page:product-editor' },
      { type: 'reads', targetId: 'collection:products' },
      { type: 'uses', targetId: 'component:product-form-studio' },
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
    id: 'component:product-form-studio',
    kind: 'component',
    name: 'ProductFormStudio',
    description:
      'Product editor Studio tab for selecting an image slot, linking an Image Studio project, ' +
      'reviewing generated variants, and dispatching AI-backed studio runs.',
    tags: ['products', 'studio', 'image-studio', 'ai', 'admin'],
    relationships: [
      { type: 'uses', targetId: 'page:product-editor' },
      { type: 'reads', targetId: 'collection:image-studio-projects' },
      { type: 'reads', targetId: 'collection:image-studio-slots' },
      { type: 'uses', targetId: 'action:product-studio-send' },
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
    id: 'component:document-search-page',
    kind: 'component',
    name: 'DocumentSearchPage',
    description:
      'Reusable full-page search template for document-oriented entities. ' +
      'Includes search bar, result list, pagination, and empty state.',
    tags: ['search', 'template', 'documents', 'reusable'],
    relationships: [{ type: 'uses', targetId: 'page:products' }],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'public',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
