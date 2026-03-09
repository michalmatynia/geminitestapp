import { describe, expect, it } from 'vitest';

import { buildKangurAdminLessonsManagerContextBundle } from '@/features/kangur/admin/context-registry/lessons-manager';

describe('buildKangurAdminLessonsManagerContextBundle', () => {
  it('builds a runtime bundle for the active lesson editor draft', () => {
    const bundle = buildKangurAdminLessonsManagerContextBundle({
      lessonCount: 12,
      lesson: {
        id: 'geometry-advanced',
        title: 'Figury',
        description: 'Opis figur.',
        componentId: 'geometry_shapes',
        contentMode: 'document',
      },
      document: {
        version: 1,
        narration: {
          voice: 'coral',
          locale: 'pl-PL',
        },
        blocks: [
          {
            id: 'text-1',
            type: 'text',
            html: '<p>Widoczny tekst.</p>',
            ttsText: 'Narracyjny opis tekstu.',
            align: 'left',
          },
        ],
      },
      isEditorOpen: true,
      isSaving: false,
    });

    expect(bundle).not.toBeNull();
    expect(bundle?.refs).toEqual([
      expect.objectContaining({
        id: 'runtime:kangur-admin:lesson-editor:geometry-advanced',
        kind: 'runtime_document',
        entityType: 'kangur_admin_lessons_manager_workspace',
      }),
    ]);
    expect(bundle?.documents[0]).toEqual(
      expect.objectContaining({
        title: 'Kangur lesson editor: Figury',
        status: 'editing',
        relatedNodeIds: expect.arrayContaining([
          'page:kangur-admin-lessons-manager',
          'component:kangur-lesson-narration-panel',
          'action:kangur-lesson-tts',
        ]),
        facts: expect.objectContaining({
          lessonCount: 12,
          blockCount: 1,
          scriptSegmentCount: 1,
          narrationVoice: 'coral',
          narrationLocale: 'pl-PL',
        }),
      })
    );
  });

  it('returns null when the lesson editor is closed', () => {
    expect(
      buildKangurAdminLessonsManagerContextBundle({
        lessonCount: 12,
        lesson: null,
        document: null,
        isEditorOpen: false,
        isSaving: false,
      })
    ).toBeNull();
  });
});
