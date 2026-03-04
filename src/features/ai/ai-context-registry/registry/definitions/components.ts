import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/components.ts';

export const componentNodes: ContextNode[] = [
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
