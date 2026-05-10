import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/components.ts';

export const componentNodesPart4: ContextNode[] = [
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
      { type: 'uses', targetId: 'action:ai-paths-playwright-run' },
      { type: 'reads', targetId: 'collection:ai-path-runs' },
      { type: 'reads', targetId: 'collection:ai-path-playwright-runs' },
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
      { type: 'uses', targetId: 'action:ai-paths-playwright-run' },
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
      { type: 'uses', targetId: 'component:product-form-validation-tab' },
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
    id: 'component:product-form-validation-tab',
    kind: 'component',
    name: 'ProductFormValidationTab',
    description:
      'Validation controls tab inside the Product Editor for toggling validator behavior, reviewing the current validation scope, and driving runtime AI validation checks.',
    tags: ['products', 'validation', 'editor', 'ai', 'admin'],
    relationships: [
      { type: 'uses', targetId: 'page:product-editor' },
      { type: 'reads', targetId: 'collection:products' },
      { type: 'uses', targetId: 'action:product-validator-runtime-evaluate' },
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
