/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

describe('verifyKangurContentInMongo', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('reports missing built-in content without failing on harmless extras', async () => {
    const { createDefaultKangurLessons } = await import('@/features/kangur/settings');
    const { createDefaultKangurSections } = await import('@/features/kangur/lessons/lesson-section-defaults');
    const { createDefaultKangurLessonTemplates } = await import('@/features/kangur/lessons/lesson-template-defaults');

    const actualLessons = createDefaultKangurLessons().filter(
      (lesson) => lesson.componentId !== 'english_comparatives_superlatives'
    );
    const actualSections = createDefaultKangurSections();
    const actualTemplatesPl = createDefaultKangurLessonTemplates('pl').filter(
      (template) => template.componentId !== 'english_comparatives_superlatives'
    );
    const actualTemplatesEn = createDefaultKangurLessonTemplates('en');
    const actualDocumentsPl: Array<{ lessonId: string; document: { version: number; blocks: []; pages: []; narration: {}; updatedAt: string } }> = [];
    const metadataRevision = 'stale-revision';

    const countDocuments = vi.fn(async (filter?: Record<string, unknown>) => {
      if (!filter || Object.keys(filter).length === 0) {
        return 0;
      }

      if ('locale' in filter && filter.locale === 'en') {
        return 999;
      }

      if ('gameId' in filter && filter.gameId === 'english_adverbs_action_studio') {
        return 0;
      }

      return 0;
    });

    const distinct = vi.fn().mockResolvedValue(['pl']);
    const collection = vi.fn((name: string) => {
      if (name === 'kangur_lessons') {
        return {
          countDocuments: vi.fn(async () => actualLessons.length),
          find: vi.fn(() => ({
            sort: vi.fn(() => ({
              toArray: vi.fn(async () => actualLessons),
            })),
          })),
        };
      }

      if (name === 'kangur_lesson_sections') {
        return {
          countDocuments: vi.fn(async () => actualSections.length),
          find: vi.fn(() => ({
            sort: vi.fn(() => ({
              toArray: vi.fn(async () => actualSections),
            })),
          })),
        };
      }

      if (name === 'kangur_lesson_templates') {
        return {
          countDocuments: vi.fn(async (filter?: Record<string, unknown>) => {
            if (filter?.['locale'] === 'en') {
              return actualTemplatesEn.length;
            }
            return actualTemplatesPl.length;
          }),
          find: vi.fn((filter?: Record<string, unknown>) => ({
            sort: vi.fn(() => ({
              toArray: vi.fn(async () =>
                filter?.['locale'] === 'en' ? actualTemplatesEn : actualTemplatesPl
              ),
            })),
          })),
        };
      }

      if (name === 'kangur_lesson_documents') {
        return {
          countDocuments: vi.fn(async () => actualDocumentsPl.length),
          find: vi.fn(() => ({
            sort: vi.fn(() => ({
              toArray: vi.fn(async () => actualDocumentsPl),
            })),
          })),
        };
      }

      if (name === 'kangur_content_metadata') {
        return {
          findOne: vi.fn(async () => ({
            _id: 'lesson-content',
            lessonContentRevision: metadataRevision,
            locales: ['pl', 'en'],
            source: 'localhost',
            syncedAt: '2026-03-30T00:00:00.000Z',
          })),
        };
      }

      if (name === 'kangur_ai_tutor_content') {
        return { countDocuments, distinct };
      }
      if (name === 'kangur_ai_tutor_native_guides') {
        return { countDocuments, distinct };
      }
      return { countDocuments };
    });

    getMongoDbMock.mockResolvedValue({
      collection,
    });

    const { verifyKangurContentInMongo } = await import('./kangur-content-verification');

    const result = await verifyKangurContentInMongo(['pl', 'en']);

    expect(result.aiTutorLocales.missing).toEqual(['en']);
    expect(result.nativeGuideLocales.missing).toEqual(['en']);
    expect(result.pageContentEntriesByLocale['en']?.meetsMinimum).toBe(true);
    expect(result.lessonDocuments.meetsMinimum).toBe(true);
    expect(result.lessonContentDiff.lessons.missingIds).toContain('kangur-lesson-english_comparatives_superlatives');
    expect(result.lessonContentDiff.lessonTemplatesByLocale['pl']?.missingIds).toContain(
      'english_comparatives_superlatives'
    );
    expect(result.lessonContentRevision.matches).toBe(false);
    expect(result.lessonContentRevision.stored).toBe(metadataRevision);
    expect(result.lessonContentRevision.storedMatchesExpected).toBe(false);
    expect(result.lessonContentRevision.source).toBe('localhost');
    expect(result.lessonContentRevision.syncedAt).toBe('2026-03-30T00:00:00.000Z');
    expect(result.mismatches).toContain('aiTutorLocales missing en');
    expect(result.mismatches).toContain('nativeGuideLocales missing en');
    expect(result.mismatches).toContain('lessonContentRevision mismatch');
    expect(result.mismatches).toContain('lessonContentMetadata stale');
    expect(
      result.mismatches.some((entry) => entry.startsWith('lessons drift'))
    ).toBe(true);
    expect(
      result.mismatches.some((entry) => entry.startsWith('gameInstances[english_adverbs_action_studio]'))
    ).toBe(true);
    expect(result.ok).toBe(false);
  });

  it('normalizes legacy lesson section shapes during exact verification', async () => {
    const { createDefaultKangurLessons } = await import('@/features/kangur/settings');
    const { createDefaultKangurSections } = await import('@/features/kangur/lessons/lesson-section-defaults');
    const { createDefaultKangurLessonTemplates } = await import('@/features/kangur/lessons/lesson-template-defaults');

    const actualLessons = createDefaultKangurLessons();
    const actualSections = createDefaultKangurSections().map((section) =>
      section.id === 'english_grammar'
        ? {
            ...section,
            shortLabel: null,
            subsections: section.subsections.map((subsection, index) =>
              index === 0
                ? {
                    ...subsection,
                    sortOrder: undefined,
                  }
                : subsection
            ),
          }
        : section
    );
    const actualTemplatesPl = createDefaultKangurLessonTemplates('pl');
    const actualTemplatesEn = createDefaultKangurLessonTemplates('en');

    const countDocuments = vi.fn(async () => 0);
    const distinct = vi.fn().mockResolvedValue(['pl', 'en']);
    const collection = vi.fn((name: string) => {
      if (name === 'kangur_lessons') {
        return {
          countDocuments: vi.fn(async () => actualLessons.length),
          find: vi.fn(() => ({
            sort: vi.fn(() => ({
              toArray: vi.fn(async () => actualLessons),
            })),
          })),
        };
      }

      if (name === 'kangur_lesson_sections') {
        return {
          countDocuments: vi.fn(async () => actualSections.length),
          find: vi.fn(() => ({
            sort: vi.fn(() => ({
              toArray: vi.fn(async () => actualSections),
            })),
          })),
        };
      }

      if (name === 'kangur_lesson_templates') {
        return {
          countDocuments: vi.fn(async (filter?: Record<string, unknown>) =>
            filter?.['locale'] === 'en' ? actualTemplatesEn.length : actualTemplatesPl.length
          ),
          find: vi.fn((filter?: Record<string, unknown>) => ({
            sort: vi.fn(() => ({
              toArray: vi.fn(async () =>
                filter?.['locale'] === 'en' ? actualTemplatesEn : actualTemplatesPl
              ),
            })),
          })),
        };
      }

      if (name === 'kangur_lesson_documents') {
        return {
          countDocuments: vi.fn(async () => 0),
          find: vi.fn(() => ({
            sort: vi.fn(() => ({
              toArray: vi.fn(async () => []),
            })),
          })),
        };
      }

      if (name === 'kangur_content_metadata') {
        return {
          findOne: vi.fn(async () => null),
        };
      }

      if (name === 'kangur_ai_tutor_content' || name === 'kangur_ai_tutor_native_guides') {
        return { countDocuments, distinct };
      }

      return { countDocuments };
    });

    getMongoDbMock.mockResolvedValue({
      collection,
    });

    const { verifyKangurContentInMongo } = await import('./kangur-content-verification');

    const result = await verifyKangurContentInMongo(['pl', 'en']);

    expect(result.lessonSections.meetsMinimum).toBe(true);
    expect(result.lessonContentDiff.lessonSections.matches).toBe(true);
  });
});
