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
  {
    id: 'policy:kangur-ai-tutor-socratic',
    kind: 'policy',
    name: 'Kangur AI Tutor Socratic Policy',
    description:
      'Kangur tutor responses must guide the learner without directly solving exercises. ' +
      'The tutor should ask short reasoning questions, reinforce correct thinking, and avoid giving final answers.',
    tags: ['kangur', 'ai', 'tutor', 'policy', 'safety'],
    relationships: [
      { type: 'governed_by', targetId: 'action:kangur-ai-tutor-chat' },
      { type: 'governed_by', targetId: 'page:kangur-lessons' },
      { type: 'governed_by', targetId: 'page:kangur-tests' },
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
    id: 'policy:kangur-ai-tutor-test-guardrails',
    kind: 'policy',
    name: 'Kangur AI Tutor Test Guardrails',
    description:
      'During active test questions the tutor must not reveal the final answer or correct option. ' +
      'Full reasoning review is allowed only after the question has been answered or revealed.',
    tags: ['kangur', 'ai', 'tutor', 'tests', 'policy', 'safety'],
    relationships: [
      { type: 'governed_by', targetId: 'action:kangur-ai-tutor-chat' },
      { type: 'governed_by', targetId: 'page:kangur-tests' },
      { type: 'governed_by', targetId: 'collection:kangur-test-suites' },
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
    id: 'policy:kangur-recent-features-source',
    kind: 'policy',
    name: 'Kangur Recent Features Source',
    description:
      'Canonical summary of the most recent Kangur and StudiQ feature work. ' +
      'Use the Context Registry runtime ref runtime:kangur:recent-features to feed AI prompts.',
    tags: ['kangur', 'studiq', 'documentation', 'recent-features', 'ai'],
    relationships: [
      { type: 'related_to', targetId: 'page:kangur-recent-features' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-17T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
