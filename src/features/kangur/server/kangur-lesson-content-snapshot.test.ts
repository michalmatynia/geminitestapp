/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { importLegacyKangurLessonDocumentMock } = vi.hoisted(() => ({
  importLegacyKangurLessonDocumentMock: vi.fn(() => null),
}));

vi.mock('@/features/kangur/legacy-lesson-imports', () => ({
  importLegacyKangurLessonDocument: importLegacyKangurLessonDocumentMock,
}));

describe('kangur-lesson-content-snapshot', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('builds a stable local revision across repeated snapshot builds', async () => {
    const { buildLocalKangurLessonContentSnapshot } = await import(
      './kangur-lesson-content-snapshot'
    );

    const first = await buildLocalKangurLessonContentSnapshot(['pl', 'en']);
    const second = await buildLocalKangurLessonContentSnapshot(['pl', 'en']);

    expect(first.lessonContentRevision).toBe(second.lessonContentRevision);
  });

  it('includes comparatives and superlatives in the local lesson snapshot', async () => {
    const { buildLocalKangurLessonContentSnapshot } = await import(
      './kangur-lesson-content-snapshot'
    );

    const snapshot = await buildLocalKangurLessonContentSnapshot(['pl', 'en']);
    const comparativesLesson = snapshot.lessons.find(
      (lesson) => lesson.componentId === 'english_comparatives_superlatives'
    );

    expect(comparativesLesson).toBeDefined();
    expect(
      snapshot.lessonTemplatesByLocale['pl']?.some(
        (template) => template.componentId === 'english_comparatives_superlatives'
      )
    ).toBe(true);
    expect(
      snapshot.lessonTemplatesByLocale['en']?.some(
        (template) => template.componentId === 'english_comparatives_superlatives'
      )
    ).toBe(true);
    expect(snapshot.lessonDocumentsByLocale['pl']?.[comparativesLesson?.id ?? '']).toBeDefined();
  });

  it('canonicalizes starter lesson documents for stable comparison', async () => {
    const { createStarterKangurLessonDocument } = await import('@/features/kangur/lesson-documents');
    const { serializeKangurLessonDocumentForComparison } = await import(
      './kangur-lesson-content-snapshot'
    );

    const first = createStarterKangurLessonDocument('english_comparatives_superlatives');
    const second = createStarterKangurLessonDocument('english_comparatives_superlatives');

    expect(serializeKangurLessonDocumentForComparison(first)).toBe(
      serializeKangurLessonDocumentForComparison(second)
    );
  });
});
