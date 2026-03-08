import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/actions.ts';

export const actionNodes: ContextNode[] = [
  {
    id: 'action:export-products',
    kind: 'action',
    name: 'Export Products',
    description:
      'Triggers a bulk export of the product catalog to CSV or JSON. ' +
      'Supports field selection and filter scoping.',
    tags: ['products', 'export', 'bulk', 'admin'],
    relationships: [
      { type: 'uses', targetId: 'page:products' },
      { type: 'reads', targetId: 'collection:products' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      proposeScopes: ['ctx:propose'],
      executeScopes: ['ctx:execute'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'action:run-ai-path',
    kind: 'action',
    name: 'Run AI Path',
    description:
      'Queues an AI path execution with optional runtime input overrides. ' +
      'Returns a run ID for polling status and streaming events.',
    tags: ['ai', 'automation', 'paths', 'execution'],
    relationships: [
      { type: 'uses', targetId: 'page:ai-paths' },
      { type: 'writes', targetId: 'collection:ai-path-runs' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      proposeScopes: ['ctx:propose'],
      executeScopes: ['ctx:execute'],
      requiresApproval: true,
      riskTier: 'medium',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'action:run-db-query',
    kind: 'action',
    name: 'Run Database Query',
    description:
      'Executes a read-only query against a registered database provider. ' +
      'Supports MongoDB aggregations and SQL SELECT statements.',
    tags: ['database', 'query', 'admin', 'developer'],
    relationships: [{ type: 'uses', targetId: 'page:database-engine' }],
    permissions: {
      readScopes: ['ctx:read'],
      proposeScopes: ['ctx:propose'],
      executeScopes: ['ctx:execute'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'action:kangur-ai-tutor-chat',
    kind: 'action',
    name: 'Kangur AI Tutor Chat',
    description:
      'Runs a Kangur AI tutor turn by resolving learner and page context through the Context Registry, ' +
      'then passing the resulting bundle to the tutor model.',
    tags: ['kangur', 'ai', 'tutor', 'education'],
    relationships: [
      { type: 'uses', targetId: 'page:kangur-lessons' },
      { type: 'uses', targetId: 'page:kangur-tests' },
      { type: 'uses', targetId: 'page:kangur-game' },
      { type: 'uses', targetId: 'page:kangur-learner-profile' },
      { type: 'uses', targetId: 'page:kangur-parent-dashboard' },
      { type: 'reads', targetId: 'collection:kangur-progress' },
      { type: 'reads', targetId: 'collection:kangur-scores' },
      { type: 'reads', targetId: 'collection:kangur-assignments' },
      { type: 'reads', targetId: 'collection:kangur-lessons' },
      { type: 'reads', targetId: 'collection:kangur-test-suites' },
      { type: 'governed_by', targetId: 'policy:kangur-ai-tutor-socratic' },
      { type: 'governed_by', targetId: 'policy:kangur-ai-tutor-test-guardrails' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      proposeScopes: ['ctx:propose'],
      executeScopes: ['ctx:execute'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
