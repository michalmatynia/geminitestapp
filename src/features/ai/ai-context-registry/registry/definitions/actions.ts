import type { ContextNode } from '@/shared/contracts/ai-context-registry';

export const actionNodes: ContextNode[] = [
  {
    id: 'action:export-products',
    kind: 'action',
    name: 'Export Products',
    description:
      'Triggers a bulk export of the product catalog to CSV or JSON. ' +
      'Supports field selection and filter scoping.',
    tags: ['products', 'export', 'bulk', 'admin'],
    relatedIds: ['page:products', 'collection:products'],
    permissions: {
      readableBy: ['admin', 'manager'],
      actionableBy: ['admin'],
    },
    version: '1.0.0',
  },
  {
    id: 'action:run-ai-path',
    kind: 'action',
    name: 'Run AI Path',
    description:
      'Queues an AI path execution with optional runtime input overrides. ' +
      'Returns a run ID for polling status and streaming events.',
    tags: ['ai', 'automation', 'paths', 'execution'],
    relatedIds: ['page:ai-paths', 'collection:ai-path-runs'],
    permissions: {
      readableBy: ['admin'],
      actionableBy: ['admin'],
    },
    version: '1.0.0',
  },
  {
    id: 'action:run-db-query',
    kind: 'action',
    name: 'Run Database Query',
    description:
      'Executes a read-only query against a registered database provider. ' +
      'Supports MongoDB aggregations and SQL SELECT statements.',
    tags: ['database', 'query', 'admin', 'developer'],
    relatedIds: ['page:database-engine'],
    permissions: {
      readableBy: ['admin'],
      actionableBy: ['admin'],
    },
    version: '1.0.0',
  },
];
