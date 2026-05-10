import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/pages.ts';

export const pageNodesPart3: ContextNode[] = [
  {
    id: 'page:kangur-admin-lessons-manager',
    kind: 'page',
    name: 'Kangur Admin Lessons Manager',
    description:
      'Admin lesson authoring surface for Kangur. Manages lesson metadata, document drafts, narration previews, and legacy imports.',
    tags: ['kangur', 'admin', 'lessons', 'editor', 'education'],
    relationships: [
      { type: 'reads', targetId: 'collection:kangur-lessons' },
      { type: 'uses', targetId: 'action:kangur-lesson-tts' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'none',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
