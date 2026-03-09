import { describe, expect, it } from 'vitest';

import {
  buildKangurLessonTtsContextInstructions,
  buildKangurLessonTtsContextSignature,
} from '@/features/kangur/tts/context-registry/instructions';
import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

const bundle: ContextRegistryResolutionBundle = {
  refs: [
    { id: 'page:kangur-lessons', kind: 'static_node' },
    { id: 'component:kangur-lesson-narrator', kind: 'static_node' },
    { id: 'action:kangur-lesson-tts', kind: 'static_node' },
  ],
  nodes: [
    {
      id: 'page:kangur-lessons',
      kind: 'page',
      name: 'Kangur Lessons',
      description: 'Lessons page',
      tags: ['kangur'],
      permissions: {
        readScopes: ['ctx:read'],
        riskTier: 'none',
        classification: 'internal',
      },
      version: '1.0.0',
      updatedAtISO: '2026-03-09T00:00:00.000Z',
      source: { type: 'code', ref: 'test' },
    },
    {
      id: 'component:kangur-lesson-narrator',
      kind: 'component',
      name: 'KangurLessonNarrator',
      description: 'Narrator',
      tags: ['kangur'],
      permissions: {
        readScopes: ['ctx:read'],
        riskTier: 'none',
        classification: 'internal',
      },
      version: '1.0.0',
      updatedAtISO: '2026-03-09T00:00:00.000Z',
      source: { type: 'code', ref: 'test' },
    },
    {
      id: 'action:kangur-lesson-tts',
      kind: 'action',
      name: 'Kangur Lesson TTS',
      description: 'TTS action',
      tags: ['kangur'],
      permissions: {
        readScopes: ['ctx:read'],
        riskTier: 'low',
        classification: 'internal',
      },
      version: '1.0.0',
      updatedAtISO: '2026-03-09T00:00:00.000Z',
      source: { type: 'code', ref: 'test' },
    },
  ],
  documents: [
    {
      id: 'runtime:kangur-admin:lesson-editor:geometry',
      kind: 'runtime_document',
      entityType: 'kangur_admin_lessons_manager_workspace',
      title: 'Lesson editor',
      summary: 'Admin lesson editor state',
      status: 'editing',
      tags: ['kangur'],
      relatedNodeIds: ['page:kangur-admin-lessons-manager'],
    },
  ],
  truncated: false,
  engineVersion: 'page-context:v1',
};

describe('kangur lesson tts context instructions', () => {
  it('builds surface instructions from the registry bundle', () => {
    expect(buildKangurLessonTtsContextInstructions(bundle)).toContain('Kangur Lessons');
    expect(buildKangurLessonTtsContextInstructions(bundle)).toContain('KangurLessonNarrator');
    expect(buildKangurLessonTtsContextInstructions(bundle)).toContain(
      'kangur_admin_lessons_manager_workspace'
    );
  });

  it('builds a stable signature from surface ids and entity types', () => {
    expect(buildKangurLessonTtsContextSignature(bundle)).toBe(
      'action:kangur-lesson-tts|component:kangur-lesson-narrator|page:kangur-lessons|kangur_admin_lessons_manager_workspace'
    );
  });
});
