import type { ContextNode } from '@/shared/contracts/ai-context-registry';

export const pageNodes: ContextNode[] = [
  {
    id: 'page:products',
    kind: 'page',
    name: 'Products Listing Page',
    description:
      'Displays the full product catalog with filtering, search, and pagination. ' +
      'Allows bulk operations and export.',
    tags: ['products', 'catalog', 'listing', 'admin'],
    relatedIds: [
      'collection:products',
      'component:product-filters',
      'action:export-products',
    ],
    version: '1.0.0',
  },
  {
    id: 'page:database-engine',
    kind: 'page',
    name: 'Database Engine Page',
    description:
      'Admin interface for querying MongoDB and relational DBs, running ad-hoc queries, ' +
      'previewing collection schemas, and managing indexes.',
    tags: ['database', 'admin', 'mongo', 'sql', 'developer'],
    relatedIds: ['collection:orders', 'collection:products', 'action:run-db-query'],
    version: '1.0.0',
  },
  {
    id: 'page:ai-paths',
    kind: 'page',
    name: 'AI Paths Canvas',
    description:
      'Visual drag-and-drop canvas for composing AI automation graphs. ' +
      'Supports node/edge management, run history, and path configuration.',
    tags: ['ai', 'automation', 'canvas', 'paths', 'admin'],
    relatedIds: ['action:run-ai-path', 'collection:ai-path-runs'],
    version: '1.0.0',
  },
];
