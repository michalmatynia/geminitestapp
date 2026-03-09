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
