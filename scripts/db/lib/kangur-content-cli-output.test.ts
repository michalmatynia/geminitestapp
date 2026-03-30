import { describe, expect, it } from 'vitest';

import {
  buildKangurContentSyncCliOutput,
  buildKangurContentVerifyCliOutput,
} from './kangur-content-cli-output';

describe('kangur content cli output', () => {
  it('builds the exact localhost sync envelope', () => {
    const result = buildKangurContentSyncCliOutput({
      aiTutorLocales: ['pl', 'en'],
      gameContentSetsByGame: { game: 1 },
      gameInstancesByGame: { game: 2 },
      games: 3,
      lessonContentRevision: 'rev-1234',
      lessonContentRevisionSyncedAt: '2026-03-30T12:00:00.000Z',
      lessonDocuments: 4,
      lessonSections: 5,
      lessons: 6,
      locales: ['pl', 'en'],
      nativeGuideLocales: ['pl', 'en'],
      pageContentEntriesByLocale: { pl: 7, en: 8 },
      lessonTemplatesByLocale: { pl: 9, en: 10 },
    });

    expect(result).toEqual({
      ok: true,
      mode: 'exact-localhost-sync',
      sourceOfTruth: 'localhost',
      aiTutorLocales: ['pl', 'en'],
      gameContentSetsByGame: { game: 1 },
      gameInstancesByGame: { game: 2 },
      games: 3,
      lessonContentRevision: 'rev-1234',
      lessonContentRevisionSyncedAt: '2026-03-30T12:00:00.000Z',
      lessonDocuments: 4,
      lessonSections: 5,
      lessons: 6,
      locales: ['pl', 'en'],
      nativeGuideLocales: ['pl', 'en'],
      pageContentEntriesByLocale: { pl: 7, en: 8 },
      lessonTemplatesByLocale: { pl: 9, en: 10 },
    });
  });

  it('builds the exact localhost verify envelope', () => {
    const result = buildKangurContentVerifyCliOutput({
      aiTutorLocales: {
        actual: ['pl'],
        expectedMinimum: ['pl', 'en'],
        extra: [],
        matches: false,
        missing: ['en'],
      },
      nativeGuideLocales: {
        actual: ['pl'],
        expectedMinimum: ['pl', 'en'],
        extra: [],
        matches: false,
        missing: ['en'],
      },
      gameContentSetsByGame: {},
      gameInstancesByGame: {},
      games: {
        actual: 1,
        extra: 0,
        expectedMinimum: 1,
        meetsMinimum: true,
        missing: 0,
      },
      lessonContentDiff: {
        lessonDocumentsByLocale: {},
        lessonTemplatesByLocale: {},
        lessons: {
          actualCount: 1,
          changedIds: [],
          extraIds: [],
          expectedCount: 2,
          matches: false,
          missingIds: ['kangur-lesson-english_comparatives_superlatives'],
        },
        lessonSections: {
          actualCount: 1,
          changedIds: [],
          extraIds: [],
          expectedCount: 1,
          matches: true,
          missingIds: [],
        },
      },
      lessonContentRevision: {
        actual: 'actual-rev',
        expected: 'expected-rev',
        matches: false,
        source: 'localhost',
        stored: 'stored-rev',
        storedMatchesActual: false,
        storedMatchesExpected: false,
        syncedAt: '2026-03-30T12:00:00.000Z',
      },
      lessonDocuments: {
        actual: 1,
        extra: 0,
        expectedMinimum: 2,
        meetsMinimum: false,
        missing: 1,
      },
      lessonSections: {
        actual: 1,
        extra: 0,
        expectedMinimum: 1,
        meetsMinimum: true,
        missing: 0,
      },
      lessonTemplatesByLocale: {},
      lessons: {
        actual: 1,
        extra: 0,
        expectedMinimum: 2,
        meetsMinimum: false,
        missing: 1,
      },
      locales: ['pl', 'en'],
      mismatchCount: 3,
      mismatches: ['lessonContentRevision mismatch'],
      ok: false,
      pageContentEntriesByLocale: {},
    });

    expect(result.mode).toBe('exact-localhost-verify');
    expect(result.sourceOfTruth).toBe('localhost');
    expect(result.lessonContentRevision.stored).toBe('stored-rev');
    expect(result.lessonContentDiff.lessons.missingIds).toContain(
      'kangur-lesson-english_comparatives_superlatives'
    );
    expect(result.ok).toBe(false);
  });
});
