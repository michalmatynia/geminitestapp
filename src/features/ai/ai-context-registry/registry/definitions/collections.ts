import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF =
  'src/features/ai/ai-context-registry/registry/definitions/collections.ts';

export const collectionNodes: ContextNode[] = [
  {
    id: 'collection:products',
    kind: 'collection',
    name: 'products',
    description:
      'MongoDB collection storing product records. Each product has a SKU, ' +
      'name, description, price, status, images, and taxonomy tags.',
    tags: ['products', 'mongo', 'database', 'catalog'],
    relationships: [
      { type: 'related_to', targetId: 'collection:orders' },
    ],
    jsonSchema2020: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        _id: { type: 'string' },
        sku: { type: 'string' },
        name: { type: 'object', description: 'Localized string map' },
        price: { type: 'number' },
        status: { type: 'string', enum: ['active', 'draft', 'archived'] },
        tags: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:orders',
    kind: 'collection',
    name: 'orders',
    description:
      'Collection of customer orders. Contains line items, shipping details, ' +
      'payment status, and fulfillment timestamps.',
    tags: ['orders', 'commerce', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:products' },
    ],
    jsonSchema2020: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
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
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:ai-path-runs',
    kind: 'collection',
    name: 'ai_path_runs',
    description:
      'Stores historical AI path execution records including status, node-level outputs, ' +
      'events, and runtime state snapshots.',
    tags: ['ai', 'paths', 'runs', 'database', 'automation'],
    relationships: [
      { type: 'related_to', targetId: 'action:run-ai-path' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
