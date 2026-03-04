import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/pages.ts';

export const pageNodes: ContextNode[] = [
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
      'Supports node/edge management, run history, and path configuration.',
    tags: ['ai', 'automation', 'canvas', 'paths', 'admin'],
    relationships: [
      { type: 'uses', targetId: 'action:run-ai-path' },
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
];
