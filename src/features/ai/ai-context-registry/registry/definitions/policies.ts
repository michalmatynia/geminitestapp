import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/policies.ts';

export const policyNodes: ContextNode[] = [
  {
    id: 'policy:product-publish',
    kind: 'policy',
    name: 'Product Publish Policy',
    description:
      'A product can only be published if it has a non-empty SKU, at least one image, ' +
      'and a positive price. Draft products are exempt from price validation.',
    tags: ['products', 'validation', 'publishing', 'policy'],
    relationships: [
      { type: 'governed_by', targetId: 'collection:products' },
      { type: 'governed_by', targetId: 'action:export-products' },
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
  {
    id: 'policy:ai-path-rate-limit',
    kind: 'policy',
    name: 'AI Path Rate Limit Policy',
    description:
      'Each user may enqueue at most 20 AI path runs per 60-second window. ' +
      'A maximum of 5 concurrent active runs per user is enforced.',
    tags: ['ai', 'rate-limit', 'policy', 'safety'],
    relationships: [
      { type: 'governed_by', targetId: 'action:run-ai-path' },
      { type: 'governed_by', targetId: 'collection:ai-path-runs' },
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
