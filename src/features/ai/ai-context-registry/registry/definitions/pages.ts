import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/pages.ts';

export const pageNodes: ContextNode[] = [
  {
    id: 'page:context-registry',
    kind: 'page',
    name: 'AI Context Registry',
    description:
      'Central admin workspace for searching, resolving, previewing, and validating shared AI context ' +
      'across pages, components, collections, actions, policies, and runtime documents.',
    tags: ['ai', 'context', 'registry', 'admin', 'runtime'],
    relationships: [{ type: 'uses', targetId: 'component:context-registry-inspector' }],
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
    id: 'page:cms-page-builder',
    kind: 'page',
    name: 'CMS Page Builder',
    description:
      'Visual CMS editor for composing page sections, previewing responsive layouts, ' +
      'editing structure, and invoking page-scoped AI assistance.',
    tags: ['cms', 'page-builder', 'editor', 'ai', 'admin'],
    relationships: [
      { type: 'reads', targetId: 'collection:cms-pages' },
      { type: 'reads', targetId: 'collection:cms-themes' },
      { type: 'uses', targetId: 'component:cms-page-builder-preview' },
      { type: 'uses', targetId: 'component:cms-page-builder-inspector' },
      { type: 'uses', targetId: 'component:cms-theme-settings-panel' },
      { type: 'uses', targetId: 'action:cms-css-ai-stream' },
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
    id: 'page:agent-teaching-chat',
    kind: 'page',
    name: 'Agent Creator Teaching Chat',
    description:
      'Admin chat surface for conversing with learner agents backed by embedding collections and ' +
      'retrieval-augmented generation.',
    tags: ['agent-creator', 'teaching', 'chat', 'ai', 'admin'],
    relationships: [
      { type: 'reads', targetId: 'collection:agent-teaching-agents' },
      { type: 'reads', targetId: 'collection:agent-teaching-embedding-collections' },
      { type: 'uses', targetId: 'component:agent-teaching-chat-panel' },
      { type: 'uses', targetId: 'action:agent-teaching-chat' },
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
    id: 'page:admin-chatbot',
    kind: 'page',
    name: 'Admin Chatbot',
    description:
      'Admin chatbot workspace with session navigation, persona-aware chat, debug visibility, ' +
      'settings, and page-scoped context for AI turns.',
    tags: ['chatbot', 'admin', 'chat', 'ai'],
    relationships: [
      { type: 'reads', targetId: 'collection:chatbot-sessions' },
      { type: 'uses', targetId: 'component:chatbot-chat-interface' },
      { type: 'uses', targetId: 'component:chatbot-session-sidebar' },
      { type: 'uses', targetId: 'component:chatbot-settings-panel' },
      { type: 'uses', targetId: 'component:chatbot-debug-panel' },
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
    id: 'page:admin-image-studio',
    kind: 'page',
    name: 'Admin Image Studio',
    description:
      'Admin image generation workspace for managing projects, slot trees, masks, prompt parameters, ' +
      'generation settings, and output review.',
    tags: ['image-studio', 'admin', 'generation', 'editor', 'ai'],
    relationships: [
      { type: 'reads', targetId: 'collection:image-studio-projects' },
      { type: 'reads', targetId: 'collection:image-studio-slots' },
      { type: 'reads', targetId: 'collection:image-studio-runs' },
      { type: 'reads', targetId: 'collection:image-studio-sequence-runs' },
      { type: 'uses', targetId: 'component:image-studio-slot-tree' },
      { type: 'uses', targetId: 'component:image-studio-center-preview' },
      { type: 'uses', targetId: 'component:image-studio-right-sidebar' },
      { type: 'uses', targetId: 'component:image-studio-generation-toolbar' },
      { type: 'uses', targetId: 'action:image-studio-run' },
      { type: 'uses', targetId: 'action:image-studio-sequence-run' },
      { type: 'uses', targetId: 'action:image-studio-ai-path-object-analysis' },
      { type: 'uses', targetId: 'action:image-studio-prompt-extract' },
      { type: 'uses', targetId: 'action:image-studio-ui-extractor' },
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
    id: 'page:system-logs',
    kind: 'page',
    name: 'Observation Post',
    description:
      'Admin system logs workspace for filtering telemetry, reviewing runtime context, generating AI insights, and interpreting individual log entries with shared page context.',
    tags: ['observability', 'logs', 'admin', 'ai', 'telemetry'],
    relationships: [
      { type: 'reads', targetId: 'collection:system-logs' },
      { type: 'uses', targetId: 'component:system-logs-filter-panel' },
      { type: 'uses', targetId: 'component:system-logs-metrics' },
      { type: 'uses', targetId: 'component:system-logs-ai-interpreter' },
      { type: 'uses', targetId: 'component:system-logs-event-stream' },
      { type: 'uses', targetId: 'action:system-logs-generate-insight' },
      { type: 'uses', targetId: 'action:system-logs-interpret' },
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
    id: 'page:analytics',
    kind: 'page',
    name: 'Analytics Dashboard',
    description:
      'Admin analytics workspace for reviewing traffic summaries, recent events, top dimensions, and running analytics insight generation with the current dashboard state.',
    tags: ['analytics', 'admin', 'dashboard', 'ai'],
    relationships: [
      { type: 'reads', targetId: 'collection:analytics-events' },
      { type: 'reads', targetId: 'collection:ai-insights-history' },
      { type: 'uses', targetId: 'component:analytics-dashboard-header' },
      { type: 'uses', targetId: 'component:analytics-ai-insights' },
      { type: 'uses', targetId: 'component:analytics-metrics-grid' },
      { type: 'uses', targetId: 'component:analytics-top-stats' },
      { type: 'uses', targetId: 'component:analytics-recent-events-table' },
      { type: 'uses', targetId: 'action:analytics-generate-insight' },
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
    id: 'page:ai-insights',
    kind: 'page',
    name: 'AI Insights Dashboard',
    description:
      'Admin dashboard aggregating analytics, runtime analytics, and system log insights with page-scoped runs for each insight bucket.',
    tags: ['ai', 'insights', 'admin', 'dashboard'],
    relationships: [
      { type: 'reads', targetId: 'collection:ai-insights-history' },
      { type: 'reads', targetId: 'collection:analytics-events' },
      { type: 'reads', targetId: 'collection:system-logs' },
      { type: 'reads', targetId: 'collection:ai-path-runs' },
      { type: 'uses', targetId: 'component:ai-insights-analytics-panel' },
      { type: 'uses', targetId: 'component:ai-insights-runtime-panel' },
      { type: 'uses', targetId: 'component:ai-insights-logs-panel' },
      { type: 'uses', targetId: 'action:analytics-generate-insight' },
      { type: 'uses', targetId: 'action:runtime-analytics-generate-insight' },
      { type: 'uses', targetId: 'action:system-logs-generate-insight' },
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
    id: 'page:products',
    kind: 'page',
    name: 'Products Listing Page',
    description:
      'Displays the full product catalog with filtering, search, and pagination. ' +
      'Allows bulk operations and export.',
    tags: ['products', 'catalog', 'listing', 'admin'],
    relationships: [
      { type: 'reads', targetId: 'collection:products' },
      { type: 'uses', targetId: 'component:product-filters' },
      { type: 'uses', targetId: 'action:export-products' },
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
    id: 'page:product-editor',
    kind: 'page',
    name: 'Product Editor',
    description:
      'Admin product editing workspace with form tabs, image management, and Product Studio ' +
      'actions that can launch Image Studio generations using the current page context registry envelope.',
    tags: ['products', 'editor', 'studio', 'admin', 'ai'],
    relationships: [
      { type: 'reads', targetId: 'collection:products' },
      { type: 'uses', targetId: 'component:product-form' },
      { type: 'uses', targetId: 'component:product-form-studio' },
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
    id: 'page:database-engine',
    kind: 'page',
    name: 'Database Engine Page',
    description:
      'Admin interface for querying MongoDB and relational DBs, running ad-hoc queries, ' +
      'previewing collection schemas, and managing indexes.',
    tags: ['database', 'admin', 'mongo', 'sql', 'developer'],
    relationships: [
      { type: 'reads', targetId: 'collection:orders' },
      { type: 'reads', targetId: 'collection:products' },
      { type: 'uses', targetId: 'action:run-db-query' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'page:ai-paths',
    kind: 'page',
    name: 'AI Paths Canvas',
    description:
      'Visual drag-and-drop canvas for composing AI automation graphs. ' +
      'Supports node authoring, direct model previews, run history, and page-scoped context for AI-assisted path work.',
    tags: ['ai', 'automation', 'canvas', 'paths', 'admin'],
    relationships: [
      { type: 'uses', targetId: 'action:run-ai-path' },
      { type: 'uses', targetId: 'action:ai-paths-preview-model' },
      { type: 'uses', targetId: 'component:ai-paths-canvas-board' },
      { type: 'uses', targetId: 'component:ai-paths-paths-panel' },
      { type: 'uses', targetId: 'component:ai-paths-docs-panel' },
      { type: 'uses', targetId: 'component:ai-paths-node-config-dialog' },
      { type: 'reads', targetId: 'collection:ai-path-runs' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'page:kangur-game',
    kind: 'page',
    name: 'Kangur Game',
    description:
      'Learner-facing Kangur home and practice surface for starting training sessions, ' +
      'opening delegated practice assignments, and completing game loops.',
    tags: ['kangur', 'game', 'learner', 'education'],
    relationships: [
      { type: 'reads', targetId: 'collection:kangur-progress' },
      { type: 'reads', targetId: 'collection:kangur-assignments' },
      { type: 'uses', targetId: 'action:kangur-ai-tutor-chat' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'page:kangur-lessons',
    kind: 'page',
    name: 'Kangur Lessons',
    description:
      'Lesson library and active lesson surface for Kangur. Shows lesson metadata, ' +
      'document content, learner mastery, and related assignments.',
    tags: ['kangur', 'lessons', 'learner', 'education'],
    relationships: [
      { type: 'reads', targetId: 'collection:kangur-lessons' },
      { type: 'reads', targetId: 'collection:kangur-progress' },
      { type: 'reads', targetId: 'collection:kangur-assignments' },
      { type: 'uses', targetId: 'action:kangur-ai-tutor-chat' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'page:kangur-tests',
    kind: 'page',
    name: 'Kangur Tests',
    description:
      'Kangur test suite browser and player. Presents curated test suites, active questions, ' +
      'and post-answer review context for the tutor.',
    tags: ['kangur', 'tests', 'learner', 'education'],
    relationships: [
      { type: 'reads', targetId: 'collection:kangur-test-suites' },
      { type: 'uses', targetId: 'action:kangur-ai-tutor-chat' },
      { type: 'governed_by', targetId: 'policy:kangur-ai-tutor-test-guardrails' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'page:kangur-learner-profile',
    kind: 'page',
    name: 'Kangur Learner Profile',
    description:
      'Learner analytics view for Kangur showing progress, recent sessions, recommendations, ' +
      'lesson mastery, and assignment history.',
    tags: ['kangur', 'profile', 'learner', 'analytics'],
    relationships: [
      { type: 'reads', targetId: 'collection:kangur-progress' },
      { type: 'reads', targetId: 'collection:kangur-scores' },
      { type: 'reads', targetId: 'collection:kangur-assignments' },
      { type: 'uses', targetId: 'action:kangur-ai-tutor-chat' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'page:kangur-parent-dashboard',
    kind: 'page',
    name: 'Kangur Parent Dashboard',
    description:
      'Parent-facing Kangur dashboard for learner selection, progress review, assignments, ' +
      'and AI tutor controls.',
    tags: ['kangur', 'parent', 'dashboard', 'education'],
    relationships: [
      { type: 'reads', targetId: 'collection:kangur-progress' },
      { type: 'reads', targetId: 'collection:kangur-scores' },
      { type: 'reads', targetId: 'collection:kangur-assignments' },
      { type: 'uses', targetId: 'action:kangur-ai-tutor-chat' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'page:kangur-admin-lessons-manager',
    kind: 'page',
    name: 'Kangur Admin Lessons Manager',
    description:
      'Admin lesson authoring surface for Kangur. Manages lesson metadata, document drafts, narration previews, and legacy imports.',
    tags: ['kangur', 'admin', 'lessons', 'editor', 'education'],
    relationships: [
      { type: 'reads', targetId: 'collection:kangur-lessons' },
      { type: 'uses', targetId: 'action:kangur-lesson-tts' },
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
