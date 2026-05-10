import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/pages.ts';

export const pageNodesPart2: ContextNode[] = [
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
      'Admin product editing workspace with form tabs, validation controls, image management, ' +
      'and Product Studio actions that can launch AI flows using the current page context registry envelope.',
    tags: ['products', 'editor', 'studio', 'admin', 'ai'],
    relationships: [
      { type: 'reads', targetId: 'collection:products' },
      { type: 'uses', targetId: 'component:product-form' },
      { type: 'uses', targetId: 'component:product-form-validation-tab' },
      { type: 'uses', targetId: 'component:product-form-studio' },
      { type: 'uses', targetId: 'action:product-validator-runtime-evaluate' },
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
      { type: 'uses', targetId: 'action:ai-paths-playwright-run' },
      { type: 'uses', targetId: 'component:ai-paths-canvas-board' },
      { type: 'uses', targetId: 'component:ai-paths-paths-panel' },
      { type: 'uses', targetId: 'component:ai-paths-docs-panel' },
      { type: 'uses', targetId: 'component:ai-paths-node-config-dialog' },
      { type: 'reads', targetId: 'collection:ai-path-runs' },
      { type: 'reads', targetId: 'collection:ai-path-playwright-runs' },
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
      'and AI Tutor controls.',
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
    id: 'page:kangur-recent-features',
    kind: 'page',
    name: 'Kangur Recent Features',
    description:
      'Canonical summary of the most recent Kangur and StudiQ feature work used for release notes and AI prompts.',
    tags: ['kangur', 'studiq', 'documentation', 'release-notes'],
    relationships: [
      { type: 'related_to', targetId: 'policy:kangur-recent-features-source' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-17T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
