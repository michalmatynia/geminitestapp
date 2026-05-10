import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/collections.ts';

export const collectionNodesPart3: ContextNode[] = [
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
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-assignments' },
      { type: 'related_to', targetId: 'action:kangur-lesson-tts' },
      { type: 'related_to', targetId: 'page:kangur-admin-lessons-manager' },
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
