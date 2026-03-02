import type { ContextNode } from '@/shared/contracts/ai-context-registry';

export const collectionNodes: ContextNode[] = [
  {
    id: 'collection:products',
    kind: 'collection',
    name: 'products',
    description:
      'MongoDB collection storing product records. Each product has a SKU, ' +
      'name, description, price, status, images, and taxonomy tags.',
    tags: ['products', 'mongo', 'database', 'catalog'],
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        sku: { type: 'string' },
        name: { type: 'object', description: 'Localized string map' },
        price: { type: 'number' },
        status: { type: 'string', enum: ['active', 'draft', 'archived'] },
        tags: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    relatedIds: ['page:products', 'collection:orders'],
    version: '1.0.0',
  },
  {
    id: 'collection:orders',
    kind: 'collection',
    name: 'orders',
    description:
      'Collection of customer orders. Contains line items, shipping details, ' +
      'payment status, and fulfillment timestamps.',
    tags: ['orders', 'commerce', 'database'],
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        customerId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        },
        total: { type: 'number' },
        lineItems: { type: 'array' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    relatedIds: ['collection:products'],
    version: '1.0.0',
  },
  {
    id: 'collection:ai-path-runs',
    kind: 'collection',
    name: 'ai_path_runs',
    description:
      'Stores historical AI path execution records including status, node-level outputs, ' +
      'events, and runtime state snapshots.',
    tags: ['ai', 'paths', 'runs', 'database', 'automation'],
    relatedIds: ['page:ai-paths', 'action:run-ai-path'],
    version: '1.0.0',
  },
];
