import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/collections.ts';

export const collectionNodes: ContextNode[] = [
  {
    id: 'collection:products',
    kind: 'collection',
    name: 'products',
    description:
      'MongoDB collection storing product records. Each product has a SKU, ' +
      'name, description, price, status, images, and taxonomy tags.',
    tags: ['products', 'mongo', 'database', 'catalog'],
    relationships: [{ type: 'related_to', targetId: 'collection:orders' }],
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
    relationships: [{ type: 'related_to', targetId: 'collection:products' }],
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
    relationships: [{ type: 'related_to', targetId: 'action:run-ai-path' }],
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
    id: 'collection:kangur-progress',
    kind: 'collection',
    name: 'kangur_progress',
    description:
      'Learner progress state for Kangur including XP, badges, lesson mastery, and aggregated counters.',
    tags: ['kangur', 'progress', 'education', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-scores' },
      { type: 'related_to', targetId: 'collection:kangur-assignments' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-scores',
    kind: 'collection',
    name: 'kangur_scores',
    description:
      'Historical practice and test results for Kangur learners including operation, accuracy, score, and timestamps.',
    tags: ['kangur', 'scores', 'education', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-progress' },
      { type: 'related_to', targetId: 'collection:kangur-assignments' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-assignments',
    kind: 'collection',
    name: 'kangur_assignments',
    description:
      'Delegated Kangur lesson and practice assignments, including progress state and parent-created targets.',
    tags: ['kangur', 'assignments', 'education', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-progress' },
      { type: 'related_to', targetId: 'collection:kangur-scores' },
      { type: 'related_to', targetId: 'collection:kangur-lessons' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-login-activity',
    kind: 'collection',
    name: 'kangur_login_activity',
    description:
      'Recent Kangur parent login and learner sign-in activity derived from the shared activity log and scoped to Kangur tutoring context.',
    tags: ['kangur', 'auth', 'login', 'activity'],
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-progress' },
      { type: 'related_to', targetId: 'collection:kangur-assignments' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-08T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-lessons',
    kind: 'collection',
    name: 'kangur_lessons',
    description:
      'Kangur lesson catalog and lesson document content authored in settings-backed storage.',
    tags: ['kangur', 'lessons', 'content', 'education'],
    relationships: [{ type: 'related_to', targetId: 'collection:kangur-assignments' }],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-test-suites',
    kind: 'collection',
    name: 'kangur_test_suites',
    description:
      'Settings-backed Kangur test suites and question banks used by learner test practice and tutor review flows.',
    tags: ['kangur', 'tests', 'questions', 'education'],
    relationships: [{ type: 'related_to', targetId: 'policy:kangur-ai-tutor-test-guardrails' }],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
