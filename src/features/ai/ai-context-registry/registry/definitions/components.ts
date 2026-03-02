import type { ContextNode } from '@/shared/contracts/ai-context-registry';

export const componentNodes: ContextNode[] = [
  {
    id: 'component:product-filters',
    kind: 'component',
    name: 'ProductFilters',
    description:
      'Sidebar filter panel used on the Products page. Supports filtering by category, ' +
      'status, price range, and custom tags.',
    tags: ['products', 'filter', 'ui', 'sidebar'],
    relatedIds: ['page:products', 'collection:products'],
    examples: [
      'Filter by status: active, draft, archived',
      'Filter by price range: 0–100, 100–500',
    ],
    version: '1.0.0',
  },
  {
    id: 'component:document-search-page',
    kind: 'component',
    name: 'DocumentSearchPage',
    description:
      'Reusable full-page search template for document-oriented entities. ' +
      'Includes search bar, result list, pagination, and empty state.',
    tags: ['search', 'template', 'documents', 'reusable'],
    relatedIds: ['page:products'],
    version: '1.0.0',
  },
];
