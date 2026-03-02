import type { ContextNode } from '@/shared/contracts/ai-context-registry';

export const policyNodes: ContextNode[] = [
  {
    id: 'policy:product-publish',
    kind: 'policy',
    name: 'Product Publish Policy',
    description:
      'A product can only be published if it has a non-empty SKU, at least one image, ' +
      'and a positive price. Draft products are exempt from price validation.',
    tags: ['products', 'validation', 'publishing', 'policy'],
    relatedIds: ['collection:products', 'action:export-products'],
    version: '1.0.0',
  },
  {
    id: 'policy:ai-path-rate-limit',
    kind: 'policy',
    name: 'AI Path Rate Limit Policy',
    description:
      'Each user may enqueue at most 20 AI path runs per 60-second window. ' +
      'A maximum of 5 concurrent active runs per user is enforced.',
    tags: ['ai', 'rate-limit', 'policy', 'safety'],
    relatedIds: ['action:run-ai-path', 'collection:ai-path-runs'],
    version: '1.0.0',
  },
];
